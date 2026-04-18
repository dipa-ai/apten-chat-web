import { create } from 'zustand';
import { api } from '../api/http';
import { wsClient } from '../api/ws';
import { useAuthStore } from './authStore';
import type {
  Chat,
  ChatDetail,
  Message,
  User,
  WsEvent,
  WsMessageNew,
  WsMessageAck,
  WsMessageError,
  WsTypingUpdate,
  WsReadUpdate,
  WsPresenceUpdate,
  WsMessageUpdated,
  WsMessageDeleted,
} from '../api/types';

const PENDING_TIMEOUT_MS = 10_000;

export interface Toast {
  id: number;
  text: string;
  variant: 'error' | 'info';
}

interface PendingEntry {
  chatId: number;
  content: string;
  replyToId: number | null;
  timer: ReturnType<typeof setTimeout>;
}

interface ChatState {
  chats: Chat[];
  activeChatId: number | null;
  activeChatMembers: User[];
  messages: Record<number, Message[]>;
  typing: Record<number, Set<number>>; // chatId -> set of userIds
  onlineUsers: Set<number>;
  readReceipts: Record<number, Record<number, number>>; // chatId -> userId -> lastReadMsgId
  toasts: Toast[];
  hasMore: Record<number, boolean>;

  fetchChats: () => Promise<void>;
  setActiveChat: (chatId: number | null) => Promise<void>;
  fetchMessages: (chatId: number, before?: number) => Promise<void>;
  sendMessage: (
    chatId: number,
    content: string,
    replyToId?: number | null,
  ) => void;
  retryMessage: (chatId: number, clientId: string) => void;
  editMessage: (
    chatId: number,
    messageId: number,
    content: string,
  ) => Promise<void>;
  deleteMessage: (chatId: number, messageId: number) => Promise<void>;
  markRead: (chatId: number, lastMessageId: number) => void;
  sendTyping: (chatId: number, isTyping: boolean) => void;
  createChat: (
    type: 'direct' | 'group',
    memberIds: number[],
    name?: string,
  ) => Promise<Chat>;
  addMember: (chatId: number, userId: number) => Promise<void>;
  removeMember: (chatId: number, userId: number) => Promise<void>;
  uploadFile: (chatId: number, file: File) => Promise<void>;
  dismissToast: (id: number) => void;
  initWsListeners: () => () => void;
}

// Module-level maps: these reference live React state but are themselves not
// rendered, so they live outside the Zustand state object.
const pending = new Map<string, PendingEntry>();
let toastSeq = 1;

export const useChatStore = create<ChatState>((set, get) => {
  const pushToast = (text: string, variant: Toast['variant'] = 'error') => {
    const toast: Toast = { id: toastSeq++, text, variant };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== toast.id) }));
    }, 4000);
  };

  const setMessageStatus = (
    chatId: number,
    clientId: string,
    status: Message['_status'],
  ) => {
    set((s) => {
      const list = s.messages[chatId];
      if (!list) return {};
      return {
        messages: {
          ...s.messages,
          [chatId]: list.map((m) =>
            m._clientId === clientId ? { ...m, _status: status } : m,
          ),
        },
      };
    });
  };

  const clearPending = (clientId: string) => {
    const entry = pending.get(clientId);
    if (entry) {
      clearTimeout(entry.timer);
      pending.delete(clientId);
    }
  };

  const bumpChatToTop = (chatId: number, createdAt: string) => {
    set((s) => {
      const idx = s.chats.findIndex((c) => c.id === chatId);
      if (idx === -1) return {};
      const chat = { ...s.chats[idx], updated_at: createdAt };
      const next = s.chats.slice();
      next.splice(idx, 1);
      next.unshift(chat);
      return { chats: next };
    });
  };

  const doSend = (
    chatId: number,
    content: string,
    replyToId: number | null,
    clientId: string,
  ) => {
    const timer = setTimeout(() => {
      if (!pending.has(clientId)) return;
      pending.delete(clientId);
      setMessageStatus(chatId, clientId, 'failed');
      pushToast('Message failed to send');
    }, PENDING_TIMEOUT_MS);
    pending.set(clientId, { chatId, content, replyToId, timer });

    wsClient.send('message.send', {
      chat_id: chatId,
      content,
      reply_to_id: replyToId,
      client_id: clientId,
    });
  };

  return {
    chats: [],
    activeChatId: null,
    activeChatMembers: [],
    messages: {},
    typing: {},
    onlineUsers: new Set(),
    readReceipts: {},
    toasts: [],
    hasMore: {},

    fetchChats: async () => {
      const chats = await api<Chat[]>('/api/chats');
      // Direct chats come back with name=null. Resolve each to the
      // counterpart's display name by fetching its detail once. For a
      // tiny contact list this is fine; if we ever grow past that we
      // should return a display_name server-side.
      const meId = useAuthStore.getState().user?.id;
      const enriched = await Promise.all(
        chats.map(async (c) => {
          if (c.type === 'direct' && !c.name && meId != null) {
            try {
              const detail = await api<ChatDetail>(`/api/chats/${c.id}`);
              const other = detail.members.find((m) => m.id !== meId);
              if (other) {
                return {
                  ...c,
                  name: other.display_name,
                  avatar_url: other.avatar_url ?? c.avatar_url,
                };
              }
            } catch {
              // fall through with original chat
            }
          }
          return c;
        }),
      );
      set({ chats: enriched });
    },

    setActiveChat: async (chatId) => {
      set({ activeChatId: chatId, activeChatMembers: [] });
      if (chatId === null) return;
      const msgs = get().messages[chatId];
      if (!msgs || msgs.length === 0) {
        await get().fetchMessages(chatId);
      }
      try {
        const detail = await api<ChatDetail>(`/api/chats/${chatId}`);
        set({ activeChatMembers: detail.members });
      } catch {
        // ignore
      }
    },

    fetchMessages: async (chatId, before?) => {
      const params = new URLSearchParams({ limit: '50' });
      if (before) params.set('before', String(before));
      const raw = await api<Message[]>(
        `/api/chats/${chatId}/messages?${params}`,
      );
      // Server returns DESC (newest first). Flip to chronological for
      // display: oldest at top of list, newest at bottom.
      const msgs = [...raw].reverse();
      set((s) => {
        const existing = before ? s.messages[chatId] ?? [] : [];
        const merged = before ? [...msgs, ...existing] : msgs;
        return {
          messages: { ...s.messages, [chatId]: merged },
          hasMore: { ...s.hasMore, [chatId]: raw.length === 50 },
        };
      });
    },

    sendMessage: (chatId, content, replyToId) => {
      const clientId = crypto.randomUUID();
      const optimistic: Message = {
        id: -Date.now(),
        chat_id: chatId,
        sender_id: 0,
        sender_display_name: '',
        content,
        reply_to_id: replyToId ?? null,
        created_at: new Date().toISOString(),
        updated_at: null,
        deleted_at: null,
        _clientId: clientId,
        _status: 'pending',
      };
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: [...(s.messages[chatId] ?? []), optimistic],
        },
      }));
      doSend(chatId, content, replyToId ?? null, clientId);
    },

    retryMessage: (chatId, clientId) => {
      const list = get().messages[chatId];
      if (!list) return;
      const msg = list.find((m) => m._clientId === clientId);
      if (!msg || msg._status !== 'failed' || msg.content == null) return;
      setMessageStatus(chatId, clientId, 'pending');
      doSend(chatId, msg.content, msg.reply_to_id, clientId);
    },

    editMessage: async (chatId, messageId, content) => {
      const updated = await api<Message>(
        `/api/chats/${chatId}/messages/${messageId}`,
        { method: 'PUT', body: JSON.stringify({ content }) },
      );
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: (s.messages[chatId] ?? []).map((m) =>
            m.id === messageId ? updated : m,
          ),
        },
      }));
    },

    deleteMessage: async (chatId, messageId) => {
      await api(`/api/chats/${chatId}/messages/${messageId}`, {
        method: 'DELETE',
      });
      set((s) => ({
        messages: {
          ...s.messages,
          [chatId]: (s.messages[chatId] ?? []).map((m) =>
            m.id === messageId
              ? { ...m, content: null, deleted_at: new Date().toISOString() }
              : m,
          ),
        },
      }));
    },

    markRead: (chatId, lastMessageId) => {
      wsClient.send('message.read', {
        chat_id: chatId,
        last_message_id: lastMessageId,
      });
    },

    sendTyping: (chatId, isTyping) => {
      wsClient.send(isTyping ? 'typing.start' : 'typing.stop', {
        chat_id: chatId,
      });
    },

    createChat: async (type, memberIds, name?) => {
      const chat = await api<Chat>('/api/chats', {
        method: 'POST',
        body: JSON.stringify({ type, member_ids: memberIds, name }),
      });
      await get().fetchChats();
      return chat;
    },

    addMember: async (chatId, userId) => {
      await api(`/api/chats/${chatId}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
    },

    removeMember: async (chatId, userId) => {
      await api(`/api/chats/${chatId}/members/${userId}`, {
        method: 'DELETE',
      });
    },

    uploadFile: async (chatId, file) => {
      const form = new FormData();
      form.append('file', file);
      await api(`/api/chats/${chatId}/upload`, {
        method: 'POST',
        body: form,
      });
    },

    dismissToast: (id) => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    initWsListeners: () => {
      return wsClient.subscribe((event: WsEvent) => {
        switch (event.type) {
          case 'message.new': {
            const msg = event.payload as WsMessageNew;
            const message: Message = {
              id: msg.id,
              chat_id: msg.chat_id,
              sender_id: msg.sender_id,
              sender_display_name: msg.sender_name,
              content: msg.content,
              reply_to_id: msg.reply_to_id,
              created_at: msg.created_at,
              updated_at: null,
              deleted_at: null,
            };
            if (msg.client_id) clearPending(msg.client_id);
            set((s) => {
              const existing = s.messages[msg.chat_id] ?? [];
              const hasOptimistic =
                msg.client_id &&
                existing.some((m) => m._clientId === msg.client_id);
              const updated = hasOptimistic
                ? existing.map((m) =>
                    m._clientId === msg.client_id
                      ? { ...message, _status: 'sent' as const }
                      : m,
                  )
                : [...existing, message];
              return {
                messages: { ...s.messages, [msg.chat_id]: updated },
              };
            });
            // Bump chat to top without a round-trip; fall back to
            // fetchChats only when we don't know this chat yet.
            if (get().chats.some((c) => c.id === msg.chat_id)) {
              bumpChatToTop(msg.chat_id, msg.created_at);
            } else {
              get().fetchChats();
            }
            break;
          }
          case 'message.ack': {
            const ack = event.payload as WsMessageAck;
            clearPending(ack.client_id);
            break;
          }
          case 'message.error': {
            const err = event.payload as WsMessageError;
            const entry = pending.get(err.client_id);
            clearPending(err.client_id);
            if (entry) {
              setMessageStatus(entry.chatId, err.client_id, 'failed');
            }
            pushToast(
              err.reason === 'rate_limited'
                ? 'Slow down — you are sending messages too fast.'
                : err.reason === 'forbidden'
                  ? "You can't post in this chat."
                  : 'Message failed to send.',
            );
            break;
          }
          case 'typing.update': {
            const t = event.payload as WsTypingUpdate;
            set((s) => {
              const chatTyping = new Set(s.typing[t.chat_id] ?? []);
              if (t.is_typing) chatTyping.add(t.user_id);
              else chatTyping.delete(t.user_id);
              return { typing: { ...s.typing, [t.chat_id]: chatTyping } };
            });
            break;
          }
          case 'message.read_update': {
            const r = event.payload as WsReadUpdate;
            set((s) => ({
              readReceipts: {
                ...s.readReceipts,
                [r.chat_id]: {
                  ...s.readReceipts[r.chat_id],
                  [r.user_id]: r.last_read_msg_id,
                },
              },
            }));
            break;
          }
          case 'presence.update': {
            const p = event.payload as WsPresenceUpdate;
            set((s) => {
              const online = new Set(s.onlineUsers);
              if (p.status === 'online') online.add(p.user_id);
              else online.delete(p.user_id);
              return { onlineUsers: online };
            });
            break;
          }
          case 'message.updated': {
            const u = event.payload as WsMessageUpdated;
            set((s) => ({
              messages: {
                ...s.messages,
                [u.chat_id]: (s.messages[u.chat_id] ?? []).map((m) =>
                  m.id === u.id
                    ? { ...m, content: u.content, updated_at: u.updated_at }
                    : m,
                ),
              },
            }));
            break;
          }
          case 'message.deleted': {
            const d = event.payload as WsMessageDeleted;
            set((s) => ({
              messages: {
                ...s.messages,
                [d.chat_id]: (s.messages[d.chat_id] ?? []).map((m) =>
                  m.id === d.id
                    ? { ...m, content: null, deleted_at: new Date().toISOString() }
                    : m,
                ),
              },
            }));
            break;
          }
        }
      });
    },
  };
});

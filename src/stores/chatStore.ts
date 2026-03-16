import { create } from 'zustand';
import { api } from '../api/http';
import { wsClient } from '../api/ws';
import type {
  Chat,
  ChatDetail,
  Message,
  User,
  WsEvent,
  WsMessageNew,
  WsMessageAck,
  WsTypingUpdate,
  WsReadUpdate,
  WsPresenceUpdate,
  WsMessageUpdated,
  WsMessageDeleted,
} from '../api/types';

interface ChatState {
  chats: Chat[];
  activeChatId: number | null;
  activeChatMembers: User[];
  messages: Record<number, Message[]>;
  typing: Record<number, Set<number>>; // chatId -> set of userIds
  onlineUsers: Set<number>;
  readReceipts: Record<number, Record<number, number>>; // chatId -> userId -> lastReadMsgId
  pendingClientIds: Map<string, number>; // clientId -> chatId (for ack)
  hasMore: Record<number, boolean>;

  fetchChats: () => Promise<void>;
  setActiveChat: (chatId: number | null) => Promise<void>;
  fetchMessages: (chatId: number, before?: number) => Promise<void>;
  sendMessage: (
    chatId: number,
    content: string,
    replyToId?: number | null,
  ) => void;
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
  initWsListeners: () => () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  activeChatId: null,
  activeChatMembers: [],
  messages: {},
  typing: {},
  onlineUsers: new Set(),
  readReceipts: {},
  pendingClientIds: new Map(),
  hasMore: {},

  fetchChats: async () => {
    const chats = await api<Chat[]>('/api/chats');
    set({ chats });
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
    const msgs = await api<Message[]>(
      `/api/chats/${chatId}/messages?${params}`,
    );
    set((s) => {
      const existing = before ? s.messages[chatId] ?? [] : [];
      const merged = before ? [...msgs, ...existing] : msgs;
      return {
        messages: { ...s.messages, [chatId]: merged },
        hasMore: { ...s.hasMore, [chatId]: msgs.length === 50 },
      };
    });
  },

  sendMessage: (chatId, content, replyToId) => {
    const clientId = crypto.randomUUID();
    get().pendingClientIds.set(clientId, chatId);
    wsClient.send('message.send', {
      chat_id: chatId,
      content,
      reply_to_id: replyToId ?? null,
      client_id: clientId,
    });
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
          m.id === messageId ? { ...m, content: null, deleted_at: new Date().toISOString() } : m,
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
          set((s) => ({
            messages: {
              ...s.messages,
              [msg.chat_id]: [...(s.messages[msg.chat_id] ?? []), message],
            },
          }));
          // Re-fetch chat list to update last message / ordering
          get().fetchChats();
          break;
        }
        case 'message.ack': {
          const ack = event.payload as WsMessageAck;
          get().pendingClientIds.delete(ack.client_id);
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
}));

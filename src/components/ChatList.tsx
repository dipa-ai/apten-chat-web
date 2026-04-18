import { useMemo, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import ChatSearch from './ChatSearch';
import type { Chat, Message } from '../api/types';

interface Props {
  onSelectChat: (chatId: number) => void;
  onNewChat: () => void;
}

function formatRelative(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const diffDays = (now.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function previewText(msg: Message | undefined, ownId: number | undefined, isGroup: boolean) {
  if (!msg) return '';
  if (msg.deleted_at) return 'Message deleted';
  const raw = msg.content ?? 'Attachment';
  if (msg.sender_id === ownId) return `You: ${raw}`;
  if (isGroup && msg.sender_display_name) {
    return `${msg.sender_display_name}: ${raw}`;
  }
  return raw;
}

export default function ChatList({ onSelectChat, onNewChat }: Props) {
  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const messages = useChatStore((s) => s.messages);
  const readReceipts = useChatStore((s) => s.readReceipts);
  const currentUser = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const enriched = chats.map((chat) => {
      const msgs = messages[chat.id];
      const last = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : undefined;
      const displayName = getChatName(chat);
      const preview = previewText(last, currentUser?.id, chat.type === 'group');
      const lastReadId = currentUser
        ? (readReceipts[chat.id]?.[currentUser.id] ?? 0)
        : 0;
      let unread = 0;
      if (msgs) {
        for (let i = msgs.length - 1; i >= 0; i--) {
          const m = msgs[i];
          if (m.id <= 0) continue; // skip optimistic
          if (m.id <= lastReadId) break;
          if (m.sender_id === currentUser?.id) continue;
          unread++;
        }
      }
      const timeSource = last?.created_at ?? chat.updated_at;
      return { chat, last, displayName, preview, unread, timeSource };
    });
    if (!q) return enriched;
    return enriched.filter(
      (it) =>
        it.displayName.toLowerCase().includes(q) ||
        it.preview.toLowerCase().includes(q),
    );
  }, [chats, messages, readReceipts, currentUser, query]);

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <ChatSearch value={query} onChange={setQuery} />
        <button
          className="new-chat-btn"
          onClick={onNewChat}
          title="New Chat"
          aria-label="New Chat"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path
              d="M14 3l3 3-9 9H5v-3z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="chat-list-items">
        {items.map(({ chat, displayName, preview, unread, timeSource }) => (
          <button
            key={chat.id}
            type="button"
            className={`chat-list-item ${activeChatId === chat.id ? 'active' : ''}`}
            onClick={() => onSelectChat(chat.id)}
          >
            <div className="chat-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="chat-info">
              <div className="chat-info-row">
                <span className="chat-name">{displayName}</span>
                <span className="chat-time">{formatRelative(timeSource)}</span>
              </div>
              <div className="chat-info-row">
                <span className="chat-last-message">{preview || 'No messages yet'}</span>
                {unread > 0 && (
                  <span className="chat-unread" aria-label={`${unread} unread`}>
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
        {items.length === 0 && (
          <div className="chat-list-empty">
            {chats.length === 0
              ? 'No chats yet. Start a conversation!'
              : 'No chats match your search.'}
          </div>
        )}
      </div>
    </div>
  );
}

function getChatName(chat: Chat): string {
  if (chat.type === 'group') return chat.name ?? 'Group Chat';
  return chat.name ?? `Chat #${chat.id}`;
}

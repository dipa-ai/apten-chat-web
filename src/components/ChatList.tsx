import { useChatStore } from '../stores/chatStore';
import type { Chat } from '../api/types';

interface Props {
  onNewChat: () => void;
}

export default function ChatList({ onNewChat }: Props) {
  const chats = useChatStore((s) => s.chats);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const messages = useChatStore((s) => s.messages);

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group') return chat.name ?? 'Group Chat';
    // For direct chats, we'd need members; fall back to name or id
    return chat.name ?? `Chat #${chat.id}`;
  };

  const getLastMessage = (chatId: number) => {
    const msgs = messages[chatId];
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-list">
      <div className="chat-list-header">
        <h2>Chats</h2>
        <button className="btn-icon" onClick={onNewChat} title="New Chat">
          +
        </button>
      </div>
      <div className="chat-list-items">
        {chats.map((chat) => {
          const last = getLastMessage(chat.id);
          return (
            <div
              key={chat.id}
              className={`chat-list-item ${activeChatId === chat.id ? 'active' : ''}`}
              onClick={() => setActiveChat(chat.id)}
            >
              <div className="chat-avatar">
                {getChatName(chat).charAt(0).toUpperCase()}
              </div>
              <div className="chat-info">
                <div className="chat-name">{getChatName(chat)}</div>
                {last && (
                  <div className="chat-last-message">
                    {last.deleted_at
                      ? 'Message deleted'
                      : last.content
                        ? last.content.length > 40
                          ? last.content.slice(0, 40) + '...'
                          : last.content
                        : 'Attachment'}
                  </div>
                )}
              </div>
              {last && (
                <div className="chat-time">{formatTime(last.created_at)}</div>
              )}
            </div>
          );
        })}
        {chats.length === 0 && (
          <div className="chat-list-empty">
            No chats yet. Start a conversation!
          </div>
        )}
      </div>
    </div>
  );
}

import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';
import EmptyChat from './EmptyChat';

interface Props {
  infoOpen: boolean;
  onToggleInfo: () => void;
}

export default function ChatArea({ infoOpen, onToggleInfo }: Props) {
  const activeChatId = useChatStore((s) => s.activeChatId);
  const chats = useChatStore((s) => s.chats);
  const members = useChatStore((s) => s.activeChatMembers);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const currentUser = useAuthStore((s) => s.user);

  if (activeChatId === null) {
    return (
      <div className="chat-area">
        <div className="chat-column chat-column-empty">
          <EmptyChat
            title="Select a chat to start messaging"
            subtitle="Pick a conversation on the left, or create a new one."
          />
        </div>
      </div>
    );
  }

  const chat = chats.find((c) => c.id === activeChatId);
  const isGroup = chat?.type === 'group';
  const counterpart =
    !isGroup && currentUser
      ? members.find((m) => m.id !== currentUser.id)
      : undefined;
  const chatName =
    chat?.name ??
    counterpart?.display_name ??
    (isGroup ? 'Group Chat' : `Chat #${activeChatId}`);

  const onlineMembers = members.filter((m) => onlineUsers.has(m.id));
  const dmOnline = !isGroup && counterpart != null && onlineUsers.has(counterpart.id);
  const subline = isGroup
    ? `${members.length} members${onlineMembers.length ? ` · ${onlineMembers.length} online` : ''}`
    : dmOnline
      ? 'online'
      : 'offline';

  return (
    <div className="chat-area">
      <div className="chat-column">
        <div className="chat-header">
          <div className="chat-header-main">
            <div className="chat-avatar chat-avatar-header">
              {chatName.charAt(0).toUpperCase()}
              {dmOnline && <span className="online-dot" />}
            </div>
            <div className="chat-header-text">
              <h3>{chatName}</h3>
              <span
                className={`chat-header-status ${dmOnline ? 'online' : ''}`}
              >
                {subline}
              </span>
            </div>
          </div>
          <div className="chat-header-actions">
            <button
              type="button"
              className={`btn-icon ${infoOpen ? 'active' : ''}`}
              onClick={onToggleInfo}
              aria-label="Toggle info panel"
              title="Info"
            >
              <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
                <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <circle cx="10" cy="6.5" r="1" fill="currentColor" />
                <path
                  d="M10 9v5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
        <MessageList chatId={activeChatId} />
        <TypingIndicator chatId={activeChatId} members={members} />
        <MessageInput chatId={activeChatId} />
      </div>
    </div>
  );
}

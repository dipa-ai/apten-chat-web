import { useChatStore } from '../stores/chatStore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

export default function ChatArea() {
  const activeChatId = useChatStore((s) => s.activeChatId);
  const chats = useChatStore((s) => s.chats);
  const members = useChatStore((s) => s.activeChatMembers);
  const onlineUsers = useChatStore((s) => s.onlineUsers);

  if (activeChatId === null) {
    return (
      <div className="chat-area empty">
        <p>Select a chat to start messaging</p>
      </div>
    );
  }

  const chat = chats.find((c) => c.id === activeChatId);
  const chatName =
    chat?.type === 'group'
      ? (chat.name ?? 'Group Chat')
      : (chat?.name ?? `Chat #${activeChatId}`);

  const onlineMembers = members.filter((m) => onlineUsers.has(m.id));

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div>
          <h3>{chatName}</h3>
          <span className="chat-header-status">
            {chat?.type === 'group'
              ? `${members.length} members, ${onlineMembers.length} online`
              : onlineMembers.length > 0
                ? 'online'
                : ''}
          </span>
        </div>
      </div>
      <MessageList chatId={activeChatId} />
      <TypingIndicator chatId={activeChatId} members={members} />
      <MessageInput chatId={activeChatId} />
    </div>
  );
}

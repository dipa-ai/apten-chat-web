import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';

interface Props {
  chatId: number;
  members: { id: number; display_name: string }[];
}

export default function TypingIndicator({ chatId, members }: Props) {
  const typing = useChatStore((s) => s.typing[chatId]);
  const currentUser = useAuthStore((s) => s.user);

  if (!typing || typing.size === 0) return null;

  const typingUsers = [...typing]
    .filter((uid) => uid !== currentUser?.id)
    .map((uid) => {
      const m = members.find((u) => u.id === uid);
      return m?.display_name ?? 'Someone';
    });

  if (typingUsers.length === 0) return null;

  const text =
    typingUsers.length === 1
      ? `${typingUsers[0]} is typing...`
      : typingUsers.length === 2
        ? `${typingUsers[0]} and ${typingUsers[1]} are typing...`
        : `${typingUsers[0]} and ${typingUsers.length - 1} others are typing...`;

  return <div className="typing-indicator">{text}</div>;
}

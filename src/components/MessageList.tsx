import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import MessageBubble from './MessageBubble';
import type { Message } from '../api/types';

const EMPTY_MESSAGES: Message[] = [];

interface Props {
  chatId: number;
}

export default function MessageList({ chatId }: Props) {
  const messages = useChatStore((s) => s.messages[chatId] ?? EMPTY_MESSAGES);
  const hasMore = useChatStore((s) => s.hasMore[chatId] ?? true);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const markRead = useChatStore((s) => s.markRead);
  const currentUser = useAuthStore((s) => s.user);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > prevLengthRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  // Mark last message as read
  useEffect(() => {
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      markRead(chatId, lastMsg.id);
    }
  }, [chatId, messages, markRead]);

  // Infinite scroll up
  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el || !hasMore) return;
    if (el.scrollTop < 100 && messages.length > 0) {
      const oldHeight = el.scrollHeight;
      fetchMessages(chatId, messages[0].id).then(() => {
        // Maintain scroll position after prepending
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - oldHeight;
        });
      });
    }
  }, [chatId, hasMore, messages, fetchMessages]);

  return (
    <div className="message-list" ref={listRef} onScroll={handleScroll}>
      {!hasMore && messages.length > 0 && (
        <div className="messages-start">Beginning of conversation</div>
      )}
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id === currentUser?.id}
          chatId={chatId}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

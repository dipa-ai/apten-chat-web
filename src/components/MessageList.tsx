import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';
import EmptyChat from './EmptyChat';
import ScrollToBottom from './ScrollToBottom';
import type { Message } from '../api/types';

const EMPTY_MESSAGES: Message[] = [];
const GROUP_WINDOW_MS = 5 * 60 * 1000;
const STUCK_TO_BOTTOM_THRESHOLD = 80;
const FAB_THRESHOLD = 200;

interface Props {
  chatId: number;
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function MessageList({ chatId }: Props) {
  const messages = useChatStore((s) => s.messages[chatId] ?? EMPTY_MESSAGES);
  const hasMore = useChatStore((s) => s.hasMore[chatId] ?? true);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const markRead = useChatStore((s) => s.markRead);
  const uploadFile = useChatStore((s) => s.uploadFile);
  const readReceipts = useChatStore((s) => s.readReceipts[chatId]);
  const activeChatMembers = useChatStore((s) => s.activeChatMembers);
  const currentUser = useAuthStore((s) => s.user);

  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stuckToBottomRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const lastReadIdRef = useRef<number>(0);
  const prevChatIdRef = useRef<number | null>(null);

  const [showFab, setShowFab] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Reset per-chat state when the chat changes.
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      stuckToBottomRef.current = true;
      lastReadIdRef.current = 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
      setShowFab(false);
    }
  }, [chatId]);

  // Keep view pinned to bottom when it was there, and update unread
  // count / FAB visibility when it wasn't.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stuckToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUnreadCount(0);
    } else if (messages.length > 0) {
      // Count incoming messages that arrived while user is scrolled up.
      setUnreadCount((c) => c + 1);
    }
  }, [messages.length]);

  // Debounced read-receipt: only send when the last *real* message id
  // advances and the user is looking at the bottom of the list.
  useEffect(() => {
    if (messages.length === 0) return;
    if (!stuckToBottomRef.current) return;
    const lastReal = [...messages].reverse().find((m) => m.id > 0);
    if (!lastReal) return;
    if (lastReal.id <= lastReadIdRef.current) return;
    lastReadIdRef.current = lastReal.id;
    markRead(chatId, lastReal.id);
  }, [chatId, messages, markRead]);

  const handleScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stuckToBottomRef.current = distanceFromBottom < STUCK_TO_BOTTOM_THRESHOLD;
    setShowFab(distanceFromBottom > FAB_THRESHOLD);
    if (stuckToBottomRef.current) setUnreadCount(0);

    if (
      hasMore &&
      !loadingMoreRef.current &&
      el.scrollTop < 100 &&
      messages.length > 0
    ) {
      loadingMoreRef.current = true;
      const oldHeight = el.scrollHeight;
      const oldTop = el.scrollTop;
      fetchMessages(chatId, messages[0].id)
        .then(() => {
          requestAnimationFrame(() => {
            if (!listRef.current) return;
            listRef.current.scrollTop =
              listRef.current.scrollHeight - oldHeight + oldTop;
          });
        })
        .finally(() => {
          loadingMoreRef.current = false;
        });
    }
  }, [chatId, hasMore, messages, fetchMessages]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    stuckToBottomRef.current = true;
    setUnreadCount(0);
    setShowFab(false);
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setDragOver(true);
    }
  };
  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget === e.target) setDragOver(false);
  };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(chatId, file);
  };

  // Pre-compute grouping flags so MessageBubble stays presentational.
  type Row =
    | { kind: 'date'; date: string; key: string }
    | {
        kind: 'msg';
        msg: Message;
        key: string;
        isFirstOfGroup: boolean;
        isLastOfGroup: boolean;
        isAuthorChange: boolean;
        isOwn: boolean;
      };

  const rows: Row[] = useMemo(() => {
    const result: Row[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const isOwn = msg.sender_id === currentUser?.id;
      const prevMs = prev ? new Date(prev.created_at).getTime() : 0;
      const curMs = new Date(msg.created_at).getTime();
      const nextMs = next ? new Date(next.created_at).getTime() : 0;

      const isFirstOfGroup =
        !prev ||
        prev.sender_id !== msg.sender_id ||
        curMs - prevMs > GROUP_WINDOW_MS ||
        !sameDay(prev.created_at, msg.created_at);
      const isLastOfGroup =
        !next ||
        next.sender_id !== msg.sender_id ||
        nextMs - curMs > GROUP_WINDOW_MS ||
        !sameDay(next.created_at, msg.created_at);
      // author-change = a different sender was just talking. Pure
      // time gaps within the same author are still "group-start" but
      // not "author-change", so we can space them less aggressively.
      const isAuthorChange = !!prev && prev.sender_id !== msg.sender_id;

      if (!prev || !sameDay(prev.created_at, msg.created_at)) {
        result.push({
          kind: 'date',
          date: msg.created_at,
          key: `d-${msg.created_at.slice(0, 10)}-${i}`,
        });
      }

      result.push({
        kind: 'msg',
        msg,
        key: msg._clientId ?? String(msg.id),
        isFirstOfGroup,
        isLastOfGroup,
        isAuthorChange,
        isOwn,
      });
    }
    return result;
  }, [messages, currentUser?.id]);

  // For read-receipt ticks on own messages: find the max lastReadMsgId
  // from *other* members of this chat.
  const maxOtherReadId = useMemo(() => {
    if (!readReceipts || !currentUser) return 0;
    let max = 0;
    for (const [uidStr, lastRead] of Object.entries(readReceipts)) {
      if (Number(uidStr) === currentUser.id) continue;
      if (lastRead > max) max = lastRead;
    }
    return max;
  }, [readReceipts, currentUser]);

  const isEmpty = messages.length === 0;

  return (
    <div
      className={`message-list-wrap ${dragOver ? 'drag-over' : ''}`}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="message-list" ref={listRef} onScroll={handleScroll}>
        {!isEmpty && <div className="message-list-spacer" aria-hidden="true" />}
        {!hasMore && messages.length > 0 && (
          <div className="messages-start">Beginning of conversation</div>
        )}
        {isEmpty ? (
          <EmptyChat
            title="No messages yet"
            subtitle="Say hi — messages you send will appear here."
          />
        ) : (
          rows.map((row) =>
            row.kind === 'date' ? (
              <DateSeparator key={row.key} date={row.date} />
            ) : (
              <MessageBubble
                key={row.key}
                message={row.msg}
                isOwn={row.isOwn}
                chatId={chatId}
                isFirstOfGroup={row.isFirstOfGroup}
                isLastOfGroup={row.isLastOfGroup}
                isAuthorChange={row.isAuthorChange}
                isGroupChat={activeChatMembers.length > 2}
                readByOther={row.isOwn && row.msg.id > 0 && row.msg.id <= maxOtherReadId}
              />
            ),
          )
        )}
        <div ref={bottomRef} />
      </div>
      <ScrollToBottom
        visible={showFab}
        unread={unreadCount}
        onClick={scrollToBottom}
      />
      {dragOver && (
        <div className="drop-overlay">
          <div className="drop-overlay-inner">
            <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
              <path
                d="M24 6v26M12 20l12-12 12 12M8 38h32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Drop file to send</span>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import MessageStatus from './MessageStatus';
import type { Message } from '../api/types';

interface Props {
  message: Message;
  isOwn: boolean;
  chatId: number;
  isFirstOfGroup: boolean;
  isLastOfGroup: boolean;
  isAuthorChange: boolean;
  isGroupChat: boolean;
  readByOther: boolean;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return <div className="bubble-avatar">{initial}</div>;
}

export default function MessageBubble({
  message,
  isOwn,
  chatId,
  isFirstOfGroup,
  isLastOfGroup,
  isAuthorChange,
  isGroupChat,
  readByOther,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content ?? '');
  const [showMenu, setShowMenu] = useState(false);

  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const retryMessage = useChatStore((s) => s.retryMessage);
  const replyTarget = useChatStore((s) =>
    message.reply_to_id
      ? (s.messages[chatId] ?? []).find((m) => m.id === message.reply_to_id)
      : undefined,
  );

  const isDeleted = message.deleted_at != null;
  const messageAge = new Date(message.created_at).getTime();
  // eslint-disable-next-line react-hooks/purity
  const canEditMsg = isOwn && !isDeleted && Date.now() - messageAge < 86_400_000;
  const showSender = !isOwn && isGroupChat && isFirstOfGroup && !isDeleted;
  const showAvatar = !isOwn && isGroupChat && isLastOfGroup && !isDeleted;

  const handleEdit = async () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    await editMessage(chatId, message.id, trimmed);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Delete this message?')) {
      await deleteMessage(chatId, message.id);
      setShowMenu(false);
    }
  };

  const handleCopy = async () => {
    if (message.content) {
      try {
        await navigator.clipboard.writeText(message.content);
      } catch {
        // clipboard access can fail silently
      }
    }
    setShowMenu(false);
  };

  const handleRetry = () => {
    if (message._clientId) retryMessage(chatId, message._clientId);
  };

  const groupClasses = [
    'message-row',
    isOwn ? 'own' : 'other',
    isFirstOfGroup ? 'group-start' : '',
    isLastOfGroup ? 'group-end' : '',
    isAuthorChange ? 'author-change' : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (isDeleted) {
    return (
      <div className={groupClasses}>
        {!isOwn && isGroupChat && (
          <div className="bubble-avatar-slot">
            {showAvatar && <Avatar name={message.sender_display_name} />}
          </div>
        )}
        <div className="message-bubble deleted">
          <span className="deleted-text">Message deleted</span>
        </div>
      </div>
    );
  }

  const bubbleClasses = [
    'message-bubble',
    isOwn ? 'own' : 'other',
    isFirstOfGroup ? 'group-first' : '',
    isLastOfGroup ? 'group-last' : '',
    message._status === 'pending' ? 'pending' : '',
    message._status === 'failed' ? 'failed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={groupClasses}>
      {!isOwn && isGroupChat && (
        <div className="bubble-avatar-slot">
          {showAvatar && <Avatar name={message.sender_display_name} />}
        </div>
      )}
      <div
        className={bubbleClasses}
        onMouseLeave={() => setShowMenu(false)}
      >
        {showSender && (
          <div className="message-sender">{message.sender_display_name}</div>
        )}
        {replyTarget && (
          <div className="reply-preview">
            <span className="reply-name">
              {replyTarget.sender_display_name || 'Message'}
            </span>
            <span className="reply-text">
              {replyTarget.deleted_at
                ? 'deleted message'
                : (replyTarget.content ?? 'attachment').slice(0, 80)}
            </span>
          </div>
        )}
        {editing ? (
          <div className="message-edit">
            <input
              type="text"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit();
                if (e.key === 'Escape') setEditing(false);
              }}
              autoFocus
            />
            <div className="edit-actions">
              <button onClick={handleEdit}>Save</button>
              <button onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="message-content">{message.content}</div>
            {(() => {
              const isUnsent =
                message._status === 'pending' || message._status === 'failed';
              const showTime = isLastOfGroup || isUnsent;
              const showStatus = isOwn && (isLastOfGroup || isUnsent);
              const hasMeta = showTime || showStatus || !!message.updated_at;
              if (!hasMeta) return null;
              return (
                <div className="message-meta">
                  {message.updated_at && (
                    <span className="message-edited">edited</span>
                  )}
                  {showTime && (
                    <span className="message-time">
                      {formatTime(message.created_at)}
                    </span>
                  )}
                  {showStatus && (
                    <MessageStatus
                      status={message._status}
                      read={isLastOfGroup && readByOther}
                      onRetry={handleRetry}
                    />
                  )}
                </div>
              );
            })()}
          </>
        )}
        <button
          type="button"
          className="message-menu-btn"
          onClick={() => setShowMenu((v) => !v)}
          aria-label="Message actions"
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
            <circle cx="4" cy="8" r="1.2" fill="currentColor" />
            <circle cx="8" cy="8" r="1.2" fill="currentColor" />
            <circle cx="12" cy="8" r="1.2" fill="currentColor" />
          </svg>
        </button>
        {showMenu && (
          <div className="message-menu">
            {message.content && (
              <button onClick={handleCopy}>
                <span>Copy</span>
              </button>
            )}
            {canEditMsg && (
              <button
                onClick={() => {
                  setEditing(true);
                  setEditContent(message.content ?? '');
                  setShowMenu(false);
                }}
              >
                <span>Edit</span>
              </button>
            )}
            {isOwn && (
              <button onClick={handleDelete} className="danger">
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

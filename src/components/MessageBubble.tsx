import { useEffect, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { apiBlobUrl } from '../api/http';
import MessageStatus from './MessageStatus';
import type { Attachment, Message } from '../api/types';

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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

// AttachmentView renders an attachment. File bytes are fetched with the bearer
// token (the static <img>/<a> endpoints require auth), so the thumbnail is
// loaded into an object URL and opening the file streams it the same way.
function AttachmentView({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.mime_type.startsWith('image/');
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    if (!isImage) return;
    let active = true;
    let objectUrl: string | null = null;
    apiBlobUrl(`/api/files/${attachment.id}/thumb`)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setThumbUrl(url);
      })
      .catch(() => {
        if (active) setThumbFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.id, isImage]);

  const openFile = async (download: boolean) => {
    try {
      const url = await apiBlobUrl(`/api/files/${attachment.id}`);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (download) a.download = attachment.file_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Defer revocation so the new tab / download has time to read the blob.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      // Surface nothing for now; the bubble still shows the file name.
    }
  };

  if (isImage && !thumbFailed) {
    return (
      <button
        type="button"
        className="attachment attachment-image"
        onClick={() => openFile(false)}
      >
        {thumbUrl ? (
          <img src={thumbUrl} alt={attachment.file_name} loading="lazy" />
        ) : (
          <span className="attachment-placeholder">{attachment.file_name}</span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      className="attachment attachment-file"
      onClick={() => openFile(true)}
    >
      <span className="attachment-file-name">{attachment.file_name}</span>
      <span className="attachment-file-size">{formatBytes(attachment.file_size)}</span>
    </button>
  );
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
            {message.content && (
              <div className="message-content">{message.content}</div>
            )}
            {message.attachments.length > 0 && (
              <div className="message-attachments">
                {message.attachments.map((attachment) => (
                  <AttachmentView key={attachment.id} attachment={attachment} />
                ))}
              </div>
            )}
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

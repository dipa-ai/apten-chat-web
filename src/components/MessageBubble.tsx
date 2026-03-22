import { useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import type { Message } from '../api/types';

interface Props {
  message: Message;
  isOwn: boolean;
  chatId: number;
}

export default function MessageBubble({ message, isOwn, chatId }: Props) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content ?? '');
  const [showMenu, setShowMenu] = useState(false);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);

  const isDeleted = message.deleted_at != null;

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const messageAge = new Date(message.created_at).getTime();
  // eslint-disable-next-line react-hooks/purity
  const canEditMsg = isOwn && !isDeleted && Date.now() - messageAge < 86_400_000;

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    await editMessage(chatId, message.id, editContent.trim());
    setEditing(false);
  };

  const handleDelete = async () => {
    if (confirm('Delete this message?')) {
      await deleteMessage(chatId, message.id);
      setShowMenu(false);
    }
  };

  if (isDeleted) {
    return (
      <div className={`message-bubble ${isOwn ? 'own' : ''} deleted`}>
        <div className="message-content deleted-text">Message deleted</div>
      </div>
    );
  }

  return (
    <div
      className={`message-bubble ${isOwn ? 'own' : ''}`}
      onMouseLeave={() => setShowMenu(false)}
    >
      {!isOwn && (
        <div className="message-sender">{message.sender_display_name}</div>
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
          <div className="message-meta">
            <span className="message-time">
              {formatTime(message.created_at)}
            </span>
            {message.updated_at && <span className="message-edited">edited</span>}
          </div>
        </>
      )}
      {isOwn && !editing && (
        <button
          className="message-menu-btn"
          onClick={() => setShowMenu(!showMenu)}
        >
          ...
        </button>
      )}
      {showMenu && (
        <div className="message-menu">
          {canEditMsg && (
            <button
              onClick={() => {
                setEditing(true);
                setEditContent(message.content ?? '');
                setShowMenu(false);
              }}
            >
              Edit
            </button>
          )}
          <button onClick={handleDelete}>Delete</button>
        </div>
      )}
    </div>
  );
}

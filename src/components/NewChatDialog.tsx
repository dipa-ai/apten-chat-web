import { useState, type FormEvent } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import type { User } from '../api/types';

interface Props {
  users: User[];
  onCreated: (chatId: number) => void;
  onClose: () => void;
}

export default function NewChatDialog({ users, onCreated, onClose }: Props) {
  const [type, setType] = useState<'direct' | 'group'>('direct');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const createChat = useChatStore((s) => s.createChat);
  const currentUser = useAuthStore((s) => s.user);

  const otherUsers = users.filter((u) => u.id !== currentUser?.id);

  const toggleUser = (id: number) => {
    if (type === 'direct') {
      setSelectedUsers([id]);
    } else {
      setSelectedUsers((prev) =>
        prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id],
      );
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;
    setLoading(true);
    try {
      const chat = await createChat(
        type,
        selectedUsers,
        type === 'group' ? groupName : undefined,
      );
      onCreated(chat.id);
      onClose();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>New Chat</h2>
        <div className="chat-type-toggle">
          <button
            className={type === 'direct' ? 'active' : ''}
            onClick={() => {
              setType('direct');
              setSelectedUsers([]);
            }}
          >
            Direct
          </button>
          <button
            className={type === 'group' ? 'active' : ''}
            onClick={() => {
              setType('group');
              setSelectedUsers([]);
            }}
          >
            Group
          </button>
        </div>
        {type === 'group' && (
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="group-name-input"
          />
        )}
        <form onSubmit={handleSubmit}>
          <div className="user-select-list">
            {otherUsers.map((user) => (
              <label key={user.id} className="user-select-item">
                <input
                  type={type === 'direct' ? 'radio' : 'checkbox'}
                  name="user"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUser(user.id)}
                />
                <span className="user-avatar-small">
                  {user.display_name.charAt(0).toUpperCase()}
                </span>
                <span>{user.display_name}</span>
                <span className="username">@{user.username}</span>
              </label>
            ))}
            {otherUsers.length === 0 && <p>No other users yet.</p>}
          </div>
          <div className="dialog-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || selectedUsers.length === 0}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

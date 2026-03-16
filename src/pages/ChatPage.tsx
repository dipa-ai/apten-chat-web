import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/http';
import type { User } from '../api/types';
import ChatList from '../components/ChatList';
import ChatArea from '../components/ChatArea';
import NewChatDialog from '../components/NewChatDialog';

export default function ChatPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const fetchChats = useChatStore((s) => s.fetchChats);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const initWsListeners = useChatStore((s) => s.initWsListeners);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetchChats();
    api<User[]>('/api/users').then(setUsers).catch(() => {});
    const unsub = initWsListeners();
    return unsub;
  }, [fetchChats, initWsListeners]);

  useEffect(() => {
    if (id) {
      setActiveChat(Number(id));
    }
  }, [id, setActiveChat]);

  useEffect(() => {
    if (activeChatId && !id) {
      navigate(`/chat/${activeChatId}`, { replace: true });
    }
  }, [activeChatId, id, navigate]);

  return (
    <div className="chat-page">
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-user">
          <span className="user-display-name">{user?.display_name}</span>
          <div className="sidebar-actions">
            {user?.is_admin && (
              <button
                className="btn-icon"
                onClick={() => navigate('/admin')}
                title="Admin"
              >
                ⚙
              </button>
            )}
            <button
              className="btn-icon"
              onClick={() => navigate('/settings')}
              title="Settings"
            >
              👤
            </button>
            <button className="btn-icon" onClick={logout} title="Logout">
              ⏻
            </button>
          </div>
        </div>
        <ChatList onNewChat={() => setShowNewChat(true)} />
      </div>
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>
      <ChatArea />
      {showNewChat && (
        <NewChatDialog users={users} onClose={() => setShowNewChat(false)} />
      )}
    </div>
  );
}

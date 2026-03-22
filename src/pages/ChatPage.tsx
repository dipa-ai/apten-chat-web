import { useEffect, useCallback, useState } from 'react';
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
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [showNewChat, setShowNewChat] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);

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

  const handleSelectChat = useCallback(
    (chatId: number) => {
      setActiveChat(chatId);
      navigate(`/chat/${chatId}`, { replace: true });
      setSidebarOpen(false);
    },
    [setActiveChat, navigate],
  );

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
        <ChatList
          onSelectChat={handleSelectChat}
          onNewChat={() => setShowNewChat(true)}
        />
      </div>
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>
      <ChatArea />
      {showNewChat && (
        <NewChatDialog
          users={users}
          onCreated={handleSelectChat}
          onClose={() => setShowNewChat(false)}
        />
      )}
    </div>
  );
}

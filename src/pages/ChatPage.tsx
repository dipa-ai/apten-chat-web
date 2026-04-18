import { useEffect, useCallback, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { api } from '../api/http';
import type { User } from '../api/types';
import ChatList from '../components/ChatList';
import ChatArea from '../components/ChatArea';
import InfoPanel from '../components/InfoPanel';
import NewChatDialog from '../components/NewChatDialog';
import Toasts from '../components/Toasts';

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(window.innerWidth >= 1280);
  const menuRef = useRef<HTMLDivElement>(null);

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
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSelectChat = useCallback(
    (chatId: number) => {
      setActiveChat(chatId);
      navigate(`/chat/${chatId}`, { replace: true });
      if (window.innerWidth <= 768) setSidebarOpen(false);
    },
    [setActiveChat, navigate],
  );

  const initial = user?.display_name?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="chat-page">
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-user">
          <div className="sidebar-user-main">
            <div className="user-avatar">{initial}</div>
            <div className="user-info">
              <div className="user-display-name">{user?.display_name}</div>
              <div className="user-username">@{user?.username}</div>
            </div>
          </div>
          <div className="user-menu-wrap" ref={menuRef}>
            <button
              className="btn-icon"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Account menu"
            >
              <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
                <circle cx="3.5" cy="8" r="1.4" fill="currentColor" />
                <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                <circle cx="12.5" cy="8" r="1.4" fill="currentColor" />
              </svg>
            </button>
            {menuOpen && (
              <div className="user-menu">
                <button onClick={() => { setMenuOpen(false); navigate('/settings'); }}>
                  Settings
                </button>
                {user?.is_admin && (
                  <button onClick={() => { setMenuOpen(false); navigate('/admin'); }}>
                    Admin
                  </button>
                )}
                <button
                  className="danger"
                  onClick={() => { setMenuOpen(false); logout(); }}
                >
                  Log out
                </button>
              </div>
            )}
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
        aria-label="Toggle sidebar"
      >
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
          <path
            d="M3 5h14M3 10h14M3 15h14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <ChatArea
        infoOpen={infoOpen}
        onToggleInfo={() => setInfoOpen((v) => !v)}
      />
      {infoOpen && <InfoPanel onClose={() => setInfoOpen(false)} />}
      {showNewChat && (
        <NewChatDialog
          users={users}
          onCreated={handleSelectChat}
          onClose={() => setShowNewChat(false)}
        />
      )}
      <Toasts />
    </div>
  );
}

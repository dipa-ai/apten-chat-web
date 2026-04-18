import { useMemo, useState } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import type { Message } from '../api/types';

interface Props {
  onClose: () => void;
}

const EMPTY_MESSAGES: Message[] = [];

export default function InfoPanel({ onClose }: Props) {
  const activeChatId = useChatStore((s) => s.activeChatId);
  const chats = useChatStore((s) => s.chats);
  const members = useChatStore((s) => s.activeChatMembers);
  const onlineUsers = useChatStore((s) => s.onlineUsers);
  const messages = useChatStore((s) =>
    activeChatId
      ? (s.messages[activeChatId] ?? EMPTY_MESSAGES)
      : EMPTY_MESSAGES,
  );
  const currentUser = useAuthStore((s) => s.user);
  const [query, setQuery] = useState('');

  const chat = chats.find((c) => c.id === activeChatId);
  const isGroup = chat?.type === 'group';
  const counterpart = useMemo(() => {
    if (!chat || isGroup || !currentUser) return null;
    return members.find((m) => m.id !== currentUser.id) ?? null;
  }, [chat, isGroup, members, currentUser]);

  const headerName =
    chat?.name ??
    counterpart?.display_name ??
    (chat ? `Chat #${chat.id}` : 'Info');
  const headerSubline = isGroup
    ? `${members.length} members`
    : counterpart
      ? `@${counterpart.username}`
      : '';

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return messages
      .filter((m) => m.content && m.content.toLowerCase().includes(q))
      .slice(-50)
      .reverse();
  }, [query, messages]);

  if (!chat) {
    return (
      <aside className="info-panel">
        <div className="info-header">
          <h3>Info</h3>
          <button
            className="btn-icon"
            onClick={onClose}
            aria-label="Close info panel"
          >
            ×
          </button>
        </div>
        <div className="info-empty">Select a chat to see details.</div>
      </aside>
    );
  }

  return (
    <aside className="info-panel">
      <div className="info-header">
        <h3>Details</h3>
        <button
          className="btn-icon"
          onClick={onClose}
          aria-label="Close info panel"
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <path
              d="M5 5l10 10M15 5L5 15"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="info-profile">
        <div className="info-avatar">{headerName.charAt(0).toUpperCase()}</div>
        <div className="info-name">{headerName}</div>
        <div className="info-subline">{headerSubline}</div>
        {!isGroup && counterpart && (
          <div
            className={`info-presence ${onlineUsers.has(counterpart.id) ? 'online' : ''}`}
          >
            <span className="presence-dot" />
            {onlineUsers.has(counterpart.id) ? 'online' : 'offline'}
          </div>
        )}
      </div>

      <div className="info-section">
        <div className="info-section-title">Search in chat</div>
        <div className="info-search">
          <svg viewBox="0 0 18 18" width="14" height="14" aria-hidden="true">
            <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Find messages…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {query.trim() && (
          <div className="info-search-results">
            {matches.length === 0 ? (
              <div className="info-hint">No matches.</div>
            ) : (
              matches.map((m) => (
                <div key={m.id} className="info-search-result">
                  <span className="search-result-sender">
                    {m.sender_display_name ||
                      (m.sender_id === currentUser?.id ? 'You' : 'Message')}
                  </span>
                  <span className="search-result-text">
                    {(m.content ?? '').slice(0, 120)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {isGroup && (
        <div className="info-section">
          <div className="info-section-title">
            Members · {members.length}
          </div>
          <div className="info-members">
            {members.map((m) => (
              <div key={m.id} className="info-member">
                <div className="user-avatar-small">
                  {m.display_name.charAt(0).toUpperCase()}
                </div>
                <div className="info-member-text">
                  <div>{m.display_name}</div>
                  <div className="info-member-handle">@{m.username}</div>
                </div>
                {onlineUsers.has(m.id) && (
                  <span className="presence-dot presence-dot-inline" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="info-section">
        <div className="info-section-title">Shared media</div>
        <div className="info-hint">Coming soon.</div>
      </div>
    </aside>
  );
}

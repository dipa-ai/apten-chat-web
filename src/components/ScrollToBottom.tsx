interface Props {
  visible: boolean;
  unread: number;
  onClick: () => void;
}

export default function ScrollToBottom({ visible, unread, onClick }: Props) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className="scroll-to-bottom"
      onClick={onClick}
      aria-label="Scroll to latest messages"
    >
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <path
          d="M4 7l6 6 6-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {unread > 0 && <span className="stb-badge">{unread > 99 ? '99+' : unread}</span>}
    </button>
  );
}

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function ChatSearch({ value, onChange }: Props) {
  return (
    <div className="chat-search">
      <svg viewBox="0 0 18 18" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 12l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        placeholder="Search chats"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          className="chat-search-clear"
          onClick={() => onChange('')}
        >
          ×
        </button>
      )}
    </div>
  );
}

import type { MessageStatus as Status } from '../api/types';

interface Props {
  status: Status | undefined;
  read: boolean;
  onRetry?: () => void;
}

export default function MessageStatus({ status, read, onRetry }: Props) {
  if (status === 'pending') {
    return (
      <span className="msg-status pending" title="Sending">
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 4v4l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <button
        type="button"
        className="msg-status failed"
        onClick={onRetry}
        title="Tap to retry"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
          <path
            d="M8 1l7 13H1z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11.5" r="0.8" fill="currentColor" />
        </svg>
        <span>Retry</span>
      </button>
    );
  }

  // sent / implicit delivered
  return (
    <span className={`msg-status ${read ? 'read' : 'sent'}`} title={read ? 'Read' : 'Sent'}>
      <svg viewBox="0 0 18 12" width="14" height="10" aria-hidden="true">
        <path
          d="M1 6.5L5 10.5L11 2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {read && (
          <path
            d="M6 6.5L10 10.5L17 2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </span>
  );
}

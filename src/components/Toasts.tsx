import { useChatStore } from '../stores/chatStore';

export default function Toasts() {
  const toasts = useChatStore((s) => s.toasts);
  const dismiss = useChatStore((s) => s.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.variant}`}>
          <span>{t.text}</span>
          <button
            type="button"
            className="toast-dismiss"
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

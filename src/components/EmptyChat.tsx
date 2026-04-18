interface Props {
  title: string;
  subtitle?: string;
}

export default function EmptyChat({ title, subtitle }: Props) {
  return (
    <div className="empty-chat">
      <svg viewBox="0 0 120 120" width="112" height="112" aria-hidden="true">
        <defs>
          <linearGradient id="ec-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.2" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <rect x="18" y="30" width="70" height="48" rx="14" fill="url(#ec-g)" stroke="var(--accent)" strokeOpacity="0.4" />
        <rect x="40" y="52" width="62" height="48" rx="14" fill="var(--bg-panel)" stroke="var(--accent)" strokeOpacity="0.6" />
        <circle cx="56" cy="76" r="2.5" fill="var(--accent)" />
        <circle cx="70" cy="76" r="2.5" fill="var(--accent)" />
        <circle cx="84" cy="76" r="2.5" fill="var(--accent)" />
      </svg>
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}
    </div>
  );
}

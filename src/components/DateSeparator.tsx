interface Props {
  date: string; // ISO
}

function formatLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';

  const diffDays = (today.getTime() - d.getTime()) / 86_400_000;
  if (diffDays < 7) {
    return d.toLocaleDateString([], { weekday: 'long' });
  }
  if (d.getFullYear() === today.getFullYear()) {
    return d.toLocaleDateString([], { month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DateSeparator({ date }: Props) {
  return (
    <div className="date-separator">
      <span>{formatLabel(date)}</span>
    </div>
  );
}

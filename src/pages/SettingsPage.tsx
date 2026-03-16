import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name ?? '');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await updateProfile({ display_name: displayName });
      setSaved(true);
    } catch {
      setError('Failed to update profile');
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <button onClick={() => navigate('/')}>← Back</button>
          <h1>Settings</h1>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="error">{error}</div>}
          {saved && <div className="success">Profile updated!</div>}
          <label>
            Username
            <input type="text" value={user?.username ?? ''} disabled />
          </label>
          <label>
            Display Name
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
          <button type="submit">Save</button>
        </form>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/http';
import type { Invite } from '../api/types';

export default function AdminPage() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);

  const fetchInvites = async () => {
    try {
      const data = await api<Invite[]>('/api/invites');
      setInvites(data ?? []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const createInvite = async () => {
    setLoading(true);
    try {
      await api('/api/invites', { method: 'POST' });
      await fetchInvites();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const deleteInvite = async (id: number) => {
    await api(`/api/invites/${id}`, { method: 'DELETE' });
    await fetchInvites();
  };

  const copyLink = (code: string, id: number) => {
    const url = `${location.origin}/register?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="settings-page">
      <div className="settings-container admin-container">
        <div className="settings-header">
          <button onClick={() => navigate('/')}>← Back</button>
          <h1>Admin Panel</h1>
        </div>
        <section>
          <div className="section-header">
            <h2>Invite Codes</h2>
            <button onClick={createInvite} disabled={loading}>
              {loading ? 'Creating...' : 'Create Invite'}
            </button>
          </div>
          <div className="invite-list">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className={`invite-item ${inv.used_by ? 'used' : ''}`}
              >
                <div className="invite-code">
                  <code>{inv.code.slice(0, 12)}...</code>
                  {!inv.used_by && (
                    <button
                      className="btn-small"
                      onClick={() => copyLink(inv.code, inv.id)}
                    >
                      {copied === inv.id ? 'Copied!' : 'Copy Link'}
                    </button>
                  )}
                </div>
                <div className="invite-meta">
                  <span>
                    {inv.used_by ? 'Used' : `Expires ${formatDate(inv.expires_at)}`}
                  </span>
                  {!inv.used_by && (
                    <button
                      className="btn-small btn-danger"
                      onClick={() => deleteInvite(inv.id)}
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
            {invites.length === 0 && <p>No invites yet.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}

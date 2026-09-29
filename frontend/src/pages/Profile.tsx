import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { authApi, profileApi } from '../lib/api';
import { formatDate, useFetch } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState, ErrorState, LoadingState } from '../components/States';
import type { UserPreferences } from '../types';

const PREF_FIELDS: { key: keyof UserPreferences; label: string }[] = [
  { key: 'preferFree', label: 'Prefer free options' },
  { key: 'noCreditCard', label: 'Avoid credit card requirements' },
  { key: 'noPayment', label: 'Avoid any payment' },
  { key: 'beginnerFriendly', label: 'Prefer beginner-friendly tools' },
  { key: 'apiRequired', label: 'Require API access' },
];

export function Profile() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const prefs = useFetch(() => profileApi.getPreferences().then((r) => r.data));
  const history = useFetch(() => profileApi.getSearchHistory().then((r) => r.data));

  const [form, setForm] = useState<Partial<UserPreferences> | null>(null);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  if (!authLoading && !user) {
    return <Navigate to="/login" replace state={{ from: '/profile' }} />;
  }

  const current: UserPreferences | null = form !== null ? { ...(prefs.data as UserPreferences), ...form } : (prefs.data ?? null);

  const savePrefs = async (e: FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setSaving(true);
    try {
      await profileApi.updatePreferences(current);
      setForm(null);
      prefs.reload();
      toast('Preferences saved.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save preferences.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    try {
      // ASSUMPTION: POST /auth/change-password { currentPassword, newPassword }.
      await authApi.requestPasswordReset(user?.email ?? '');
      setPwMsg('Password change is handled via a reset email — check your inbox.');
    } catch (err) {
      setPwMsg(err instanceof Error ? err.message : 'Could not start password change.');
    }
  };

  return (
    <>
      <div className="page-head">
        <h1>Your profile</h1>
        <p className="muted">{user?.email}</p>
      </div>

      <div className="grid grid-2">
        <Card>
          <h2>Preferences</h2>
          <p className="muted">
            These defaults pre-fill the recommendation constraints.
          </p>
          {prefs.loading && <LoadingState />}
          {prefs.error && <ErrorState message={prefs.error} onRetry={prefs.reload} />}
          {current && (
            <form onSubmit={savePrefs}>
              {PREF_FIELDS.map((f) => (
                <label key={f.key} className="check">
                  <input
                    type="checkbox"
                    checked={Boolean(current[f.key])}
                    onChange={(e) =>
                      setForm({ ...(form ?? {}), [f.key]: e.target.checked })
                    }
                  />
                  {f.label}
                </label>
              ))}
              <div className="field" style={{ marginTop: '0.75rem' }}>
                <label htmlFor="pref-region">Region (country code)</label>
                <input
                  id="pref-region"
                  className="input"
                  value={current.regionCode ?? ''}
                  onChange={(e) =>
                    setForm({ ...(form ?? {}), regionCode: e.target.value.toUpperCase().slice(0, 2) || null })
                  }
                  placeholder="e.g. US"
                  maxLength={2}
                  style={{ maxWidth: '10rem' }}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save preferences'}
              </Button>
            </form>
          )}
        </Card>

        <div>
          <Card>
            <h2>Account</h2>
            <dl className="fact-list">
              <dt>Email</dt>
              <dd>{user?.email}</dd>
              <dt>Display name</dt>
              <dd>{user?.displayName ?? '—'}</dd>
              <dt>Email verified</dt>
              <dd>{user?.emailVerified ? 'Yes' : 'No'}</dd>
            </dl>
            <form onSubmit={changePassword} style={{ marginTop: '1rem' }}>
              <div className="field">
                <label htmlFor="pw-current">Current password</label>
                <input
                  id="pw-current"
                  type="password"
                  className="input"
                  value={pw.current}
                  onChange={(e) => setPw({ ...pw, current: e.target.value })}
                  autoComplete="current-password"
                />
              </div>
              <div className="field">
                <label htmlFor="pw-next">New password</label>
                <input
                  id="pw-next"
                  type="password"
                  className="input"
                  value={pw.next}
                  onChange={(e) => setPw({ ...pw, next: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" variant="secondary" size="sm">
                Change password
              </Button>
              {pwMsg && <p className="form-note">{pwMsg}</p>}
            </form>
          </Card>

          <Card style={{ marginTop: '1rem' }}>
            <h2>Search history</h2>
            {history.loading && <LoadingState />}
            {history.error && <ErrorState message={history.error} onRetry={history.reload} />}
            {history.data && history.data.length === 0 && (
              <EmptyState title="No searches yet" />
            )}
            {history.data && history.data.length > 0 && (
              <ul className="pricing-limits">
                {history.data.slice(0, 20).map((h) => (
                  <li key={h.id}>
                    {h.query}{' '}
                    <span className="muted">· {formatDate(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

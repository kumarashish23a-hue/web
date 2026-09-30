import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, authApi } from '../lib/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageSeo } from '../components/Seo';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestLink = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const setNewPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Reset failed. The link may have expired.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageSeo
        meta={{
          title: 'Reset password',
          description: 'Request a password reset link or set a new password.',
          noindex: true,
        }}
      />
      <div className="form-card">
        <Card>
          <h1>{token ? 'Set a new password' : 'Reset your password'}</h1>
          {error && <p className="form-error">{error}</p>}
          {done ? (
            <p className="form-note">
              {token ? (
                <>
                  Password updated. <Link to="/login">Log in</Link>
                </>
              ) : (
                'If an account exists for that email, a reset link is on its way.'
              )}
            </p>
          ) : token ? (
            <form onSubmit={setNewPassword}>
              <div className="field">
                <label htmlFor="rp-password">New password</label>
                <input
                  id="rp-password"
                  type="password"
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <label htmlFor="rp-confirm">Confirm new password</label>
                <input
                  id="rp-confirm"
                  type="password"
                  className="input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? 'Saving…' : 'Set new password'}
              </Button>
            </form>
          ) : (
            <form onSubmit={requestLink}>
              <div className="field">
                <label htmlFor="rp-email">Email</label>
                <input
                  id="rp-email"
                  type="email"
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <Button type="submit" size="lg" disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </Button>
              <p className="form-note">
                <Link to="/login">Back to log in</Link>
              </p>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}

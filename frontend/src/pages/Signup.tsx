import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageSeo } from '../components/Seo';

export function Signup() {
  const { user, signup, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signup(email.trim(), password, displayName.trim() || undefined);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Sign-up failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageSeo
        meta={{
          title: 'Sign up',
          description: 'Create an AI Discovery account to save favorites and stacks.',
          noindex: true,
        }}
      />
      <div className="form-card">
      <Card>
        <h1>Create an account</h1>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="signup-name">Display name (optional)</label>
            <input
              id="signup-name"
              type="text"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-email">ID</label>
            <input
              id="signup-email"
              type="text"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={4}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>
        <p className="form-note">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </Card>
    </div>
    </>
  );
}

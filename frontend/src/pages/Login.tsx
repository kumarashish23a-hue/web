import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageSeo } from '../components/Seo';

export function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Login failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageSeo
        meta={{
          title: 'Log in',
          description: 'Log in to AI Discovery to save favorites and stacks.',
          noindex: true,
        }}
      />
      <div className="form-card">
      <Card>
        <h1>Log in</h1>
        {error && <p className="form-error">{error}</p>}
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" size="lg" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </Button>
        </form>
        <p className="form-note">
          No account yet? <Link to="/signup">Sign up</Link>
          {' · '}
          <Link to="/reset-password">Forgot password?</Link>
        </p>
      </Card>
    </div>
    </>
  );
}

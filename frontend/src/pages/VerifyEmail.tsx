import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, authApi } from '../lib/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { PageSeo } from '../components/Seo';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<'pending' | 'ok' | 'error'>('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('This link is missing its verification token.');
      return;
    }
    let cancelled = false;
    authApi
      .verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus('ok');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(
          err instanceof ApiError
            ? err.message
            : 'Verification failed. The link may have expired.',
        );
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <>
      <PageSeo
        meta={{
          title: 'Verify email',
          description: 'Confirm your email address.',
          noindex: true,
        }}
      />
      <div className="form-card">
        <Card>
          <h1>Verify your email</h1>
          {status === 'pending' && <p>Confirming your email address…</p>}
          {status === 'ok' && (
            <>
              <p className="form-note">Your email is verified. You're all set.</p>
              <Link to="/login">
                <Button size="lg">Log in</Button>
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <p className="form-error">{error}</p>
              <p className="form-note">
                <Link to="/login">Back to log in</Link>
              </p>
            </>
          )}
        </Card>
      </div>
    </>
  );
}

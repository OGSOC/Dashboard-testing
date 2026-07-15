import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useLogin, useMe } from '../api/hooks/useAuth';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { data: user, isLoading } = useMe();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && user) return <Navigate to="/" replace />;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    login.mutate(
      { email, password },
      {
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Login failed'),
      },
    );
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <h2 style={{ marginTop: 0 }}>Stock Dashboard</h2>
        <p className="text-secondary" style={{ fontSize: 13, marginTop: -8 }}>Sign in with the account created by `npm run db:seed`.</p>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p style={{ color: 'var(--critical)', fontSize: 13 }}>{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={login.isPending}>
            {login.isPending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}

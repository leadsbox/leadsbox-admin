import { useState } from 'react';
import type { FormEvent } from 'react';

type LoginPageProps = {
  onLogin: (identifier: string, password: string) => Promise<void>;
};

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!identifier.trim() || !password) {
      setError('Email/username and password are required.');
      return;
    }

    try {
      setSubmitting(true);
      await onLogin(identifier.trim(), password);
    } catch (loginError: any) {
      setError(loginError?.response?.data?.message || 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className='center-screen'>
      <form className='auth-card' onSubmit={handleSubmit}>
        <h1>LeadsBox Admin</h1>
        <p>Restricted dashboard for internal billing and growth operations.</p>

        <label htmlFor='identifier'>Email or Username</label>
        <input
          id='identifier'
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete='username'
          placeholder='founder@leadsboxapp.com'
        />

        <label htmlFor='password'>Password</label>
        <input
          id='password'
          type='password'
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete='current-password'
          placeholder='Enter password'
        />

        {error ? <div className='auth-error'>{error}</div> : null}

        <button type='submit' disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;

import { useState } from 'react';
import type { FormEvent } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import LeadsBoxBrand from '../components/LeadsBoxBrand';

type LoginPageProps = {
  onLogin: (identifier: string, password: string) => Promise<void>;
  onGoogleLogin: () => void;
};

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  admin_not_allowed: 'This Google account is not allowlisted for admin access.',
  admin_access_disabled: 'Admin access is currently disabled.',
  admin_google_not_configured: 'Google admin login is not configured yet.',
  bad_state: 'Google login session expired. Please try again.',
};

const LoginPage = ({ onLogin, onGoogleLogin }: LoginPageProps) => {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const oauthErrorCode = searchParams.get('error') || '';
  const oauthError = OAUTH_ERROR_MESSAGES[oauthErrorCode] || '';

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
        <div className='auth-brand'>
          <LeadsBoxBrand />
        </div>
        <h1>LeadsBox Admin</h1>
        <p>Restricted dashboard for internal billing and growth operations.</p>

        <label htmlFor='identifier'>Email or Username</label>
        <div className='field-wrap'>
          <Mail className='field-icon' />
          <input
            id='identifier'
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete='username'
            placeholder='founder@leadsboxapp.com'
          />
        </div>

        <label htmlFor='password'>Password</label>
        <div className='field-wrap'>
          <LockKeyhole className='field-icon' />
          <input
            id='password'
            type='password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete='current-password'
            placeholder='Enter password'
          />
        </div>

        {error || oauthError ? (
          <div className='auth-error'>{error || oauthError}</div>
        ) : null}

        <button type='submit' disabled={submitting}>
          {submitting ? 'Signing in...' : 'Sign in'}
        </button>

        <div className='auth-divider'>
          <span>or</span>
        </div>

        <button
          type='button'
          className='auth-google'
          disabled={submitting}
          onClick={onGoogleLogin}
        >
          <svg viewBox='0 0 24 24' aria-hidden='true'>
            <path
              fill='currentColor'
              d='M21.35 11.1H12v2.98h5.38a4.6 4.6 0 0 1-2 3.03v2.5h3.23c1.9-1.75 3-4.33 3-7.39 0-.7-.06-1.37-.26-2.02Z'
            />
            <path
              fill='currentColor'
              d='M12 22c2.7 0 4.97-.9 6.62-2.4l-3.23-2.5c-.9.61-2.03.98-3.39.98-2.61 0-4.83-1.76-5.62-4.14H3.03v2.57A9.99 9.99 0 0 0 12 22Z'
            />
            <path
              fill='currentColor'
              d='M6.38 13.94A5.95 5.95 0 0 1 6.06 12c0-.67.12-1.31.32-1.94V7.5H3.03A10 10 0 0 0 2 12c0 1.61.39 3.14 1.03 4.5l3.35-2.56Z'
            />
            <path
              fill='currentColor'
              d='M12 5.9c1.47 0 2.77.5 3.8 1.47l2.84-2.84C16.97 2.98 14.7 2 12 2A9.99 9.99 0 0 0 3.03 7.5l3.35 2.56C7.17 7.66 9.39 5.9 12 5.9Z'
            />
          </svg>
          Continue with Google
        </button>
        <small className='auth-hint'>
          Only allowlisted admin Google accounts can access this dashboard.
        </small>
      </form>
    </div>
  );
};

export default LoginPage;

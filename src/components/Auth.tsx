import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import './Auth.css';

type AuthProps = {
  onBack?: () => void;
};

type Mode = 'signin' | 'request' | 'requested';

export const Auth = ({ onBack }: AuthProps) => {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    const checkApprovalStatus = async () => {
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('approval_status')
          .eq('id', user.id)
          .single();

        if (data) {
          if (data.approval_status === 'denied') {
            setError('Your account has been denied by an administrator. Please contact support.');
            await supabase.auth.signOut();
          } else if (data.approval_status === 'pending') {
            setError('Your account is pending approval. An administrator will review your request shortly.');
            await supabase.auth.signOut();
          }
        }
      }
    };
    checkApprovalStatus();
  }, [user]);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('approval_status')
          .eq('id', sessionData.session.user.id)
          .single();

        if (profileData) {
          if (profileData.approval_status === 'pending') {
            setError('Your account is pending approval. An administrator will review your request shortly.');
            await supabase.auth.signOut();
          } else if (profileData.approval_status === 'denied') {
            setError('Your account has been denied. Please contact support for more information.');
            await supabase.auth.signOut();
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccess = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signUp(email, password);
      setMode('requested');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {onBack && (
          <button type="button" className="auth-back" onClick={onBack}>
            ← Back
          </button>
        )}
        <img src="/tk-icon.svg" alt="tk" className="auth-mark" />
        <h1>tk</h1>
        <p className="auth-tagline">Time, tracked.</p>

        {mode === 'requested' ? (
          <>
            <h2>Request sent</h2>
            <p className="auth-hint">
              Thanks — check your email to confirm the address, then sit tight. An admin will
              review your request and approve access from the Approvals tab.
            </p>
            <button type="button" className="submit-button" onClick={() => setMode('signin')}>
              Back to sign in
            </button>
          </>
        ) : (
          <>
            <h2>{mode === 'signin' ? 'Sign In' : 'Request Access'}</h2>

            <form onSubmit={mode === 'signin' ? handleSignIn : handleRequestAccess} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && <div className="error-message">{error}</div>}

              <button type="submit" disabled={loading} className="submit-button">
                {loading
                  ? mode === 'signin' ? 'Signing in…' : 'Sending request…'
                  : mode === 'signin' ? 'Sign In' : 'Request Access'}
              </button>
            </form>

            <button
              type="button"
              className="auth-mode-toggle"
              onClick={() => {
                setError('');
                setMode(mode === 'signin' ? 'request' : 'signin');
              }}
            >
              {mode === 'signin'
                ? 'New here? Request access'
                : 'Already have access? Sign in'}
            </button>
            {mode === 'request' && (
              <p className="auth-hint auth-hint--tight">
                Requests are reviewed by an admin before you can sign in — this isn't instant access.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

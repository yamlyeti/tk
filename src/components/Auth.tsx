import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import './Auth.css';

export const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        // Check approval status after login
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.user) {
          const { data: profileData } = await supabase
            .from('user_profiles')
            .select('approval_status')
            .eq('id', sessionData.session.user.id)
            .single();
          
          if (profileData) {
            if (profileData.approval_status === 'pending') {
              setError('Your account is pending approval. An administrator will review your registration shortly.');
              await supabase.auth.signOut();
            } else if (profileData.approval_status === 'denied') {
              setError('Your account has been denied. Please contact support for more information.');
              await supabase.auth.signOut();
            }
          }
        }
      } else {
        await signUp(email, password);
        setError('Registration successful! Please check your email for the confirmation link. Your account will be pending admin approval.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Time Keeping System</h1>
        <h2>{isLogin ? 'Sign In' : 'Sign Up'}</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
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
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          onClick={() => setIsLogin(!isLogin)}
          className="toggle-button"
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
        </button>
      </div>
    </div>
  );
};

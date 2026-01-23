import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/useAuth';
import { Auth } from './components/Auth';
import { TimeTracker } from './components/TimeTracker';
import { ProjectsView } from './components/ProjectsView';
import { Dashboard } from './components/Dashboard';
import { UserManagement } from './components/UserManagement';
import { UserProfile } from './components/UserProfile';
import { UserApprovals } from './components/UserApprovals';
import { OrganizationManagement } from './components/OrganizationManagement';
import { DarkModeToggle } from './components/DarkModeToggle';
import { supabase } from './lib/supabase';
import './App.css';
import './dark-mode.css';

interface UserProfile {
  approval_status: 'pending' | 'approved' | 'denied';
  is_active: boolean;
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<'tracker' | 'projects' | 'dashboard' | 'users' | 'profile' | 'approvals' | 'organizations'>('tracker');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [approvalError, setApprovalError] = useState<string>('');

  useEffect(() => {
    async function checkUserApproval() {
      if (!user) {
        setProfileLoading(false);
        setUserProfile(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('approval_status, is_active')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setApprovalError('Error checking account status. Please try signing in again.');
          await signOut();
          return;
        }

        if (!data) {
          setApprovalError('User profile not found. Please contact support.');
          await signOut();
          return;
        }

        if (data.approval_status === 'denied') {
          setApprovalError('Your account has been denied by an administrator. Please contact support.');
          await signOut();
          return;
        }

        if (data.approval_status === 'pending') {
          setApprovalError('Your account is pending approval. An administrator will review your registration shortly.');
          await signOut();
          return;
        }

        if (!data.is_active) {
          setApprovalError('Your account is inactive. Please contact support.');
          await signOut();
          return;
        }

        setUserProfile(data);
      } catch (err) {
        console.error('Unexpected error:', err);
        setApprovalError('An unexpected error occurred. Please try again.');
        await signOut();
      } finally {
        setProfileLoading(false);
      }
    }

    checkUserApproval();
  }, [user, signOut]);

  if (loading || profileLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) return <Auth />;

  if (approvalError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ color: 'var(--error-color, #dc2626)', fontSize: '18px', textAlign: 'center', maxWidth: '500px' }}>
          {approvalError}
        </div>
      </div>
    );
  }

  if (!userProfile || userProfile.approval_status !== 'approved') {
    return null;
  }

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
          <button className={view === 'tracker' ? 'active' : ''} onClick={() => setView('tracker')}>⏱️ Time Tracker</button>
          <button className={view === 'projects' ? 'active' : ''} onClick={() => setView('projects')}>📁 Projects</button>
          <button className={view === 'organizations' ? 'active' : ''} onClick={() => setView('organizations')}>🏢 Organizations</button>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>📊 Dashboard</button>
          <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>👥 Users</button>
          <button className={view === 'approvals' ? 'active' : ''} onClick={() => setView('approvals')}>✅ Approvals</button>
          <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}>👤 Profile</button>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <DarkModeToggle />
          <button 
            onClick={() => signOut()} 
            className="logout-btn"
            title="Logout"
          >
            🚪 Logout
          </button>
        </div>
      </nav>
      {view === 'tracker' && <TimeTracker />}
      {view === 'projects' && <ProjectsView />}
      {view === 'organizations' && <OrganizationManagement />}
      {view === 'dashboard' && <Dashboard />}
      {view === 'users' && <UserManagement />}
      {view === 'approvals' && <UserApprovals />}
      {view === 'profile' && <UserProfile />}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

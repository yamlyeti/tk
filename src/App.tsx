import { useState } from 'react';
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
import './App.css';
import './dark-mode.css';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<'tracker' | 'projects' | 'dashboard' | 'users' | 'profile' | 'approvals' | 'organizations'>('tracker');

  if (loading) {
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

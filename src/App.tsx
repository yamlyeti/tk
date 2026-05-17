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
import { ProjectBillingReport } from './components/ProjectBillingReport';
import { ManualTimeEntry } from './components/ManualTimeEntry';
import { supabase } from './lib/supabase';
import type { Project } from './types';
import './App.css';
import './dark-mode.css';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<'tracker' | 'projects' | 'dashboard' | 'users' | 'profile' | 'approvals' | 'organizations' | 'billing'>('tracker');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    supabase.from('projects').select('*').order('name').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: '24px' }}>
          <img src="/sa-logo.png" alt="SmartAgent" style={{ height: '32px', width: 'auto', filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' }} />
        </div>
        <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
          <button className={view === 'tracker' ? 'active' : ''} onClick={() => setView('tracker')}>⏱️ Time Tracker</button>
          <button className={view === 'projects' ? 'active' : ''} onClick={() => setView('projects')}>📁 Projects</button>
          <button className={view === 'organizations' ? 'active' : ''} onClick={() => setView('organizations')}>🏢 Organizations</button>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>📊 Dashboard</button>
          <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>👥 Users</button>
          <button className={view === 'approvals' ? 'active' : ''} onClick={() => setView('approvals')}>✅ Approvals</button>
          <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}>👤 Profile</button>
          <button className={view === 'billing' ? 'active' : ''} onClick={() => setView('billing')}>💰 Billing</button>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="nav-add-time" onClick={() => setShowManualEntry(true)}>
            ➕ Add Time
          </button>
          <span className="nav-user-email">{user?.email}</span>
          <DarkModeToggle />
          <button className="nav-signout" onClick={() => signOut()} title="Sign out">🚪</button>
        </div>
      </nav>
      {view === 'tracker' && <TimeTracker showManualEntry={showManualEntry} onManualEntryClose={() => setShowManualEntry(false)} />}
      {view === 'projects' && <ProjectsView />}
      {view === 'organizations' && <OrganizationManagement />}
      {view === 'dashboard' && <Dashboard />}
      {view === 'users' && <UserManagement />}
      {view === 'approvals' && <UserApprovals />}
      {view === 'profile' && <UserProfile />}
      {view === 'billing' && <ProjectBillingReport asPage onClose={() => setView('tracker')} />}
      {showManualEntry && view !== 'tracker' && (
        <ManualTimeEntry
          projects={projects}
          onSuccess={() => setShowManualEntry(false)}
          onClose={() => setShowManualEntry(false)}
        />
      )}
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

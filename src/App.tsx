import { useState, useEffect } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/useAuth';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
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
import { CommandPalette } from './components/CommandPalette';
import type { View } from './components/CommandPalette';
import { MobileNav } from './components/MobileNav';
import { supabase } from './lib/supabase';
import type { Project } from './types';
import './App.css';
import './dark-mode.css';

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('tracker');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [pendingFocus, setPendingFocus] = useState<{ entryId?: string; projectId?: string } | null>(null);

  const handleNavigate = (targetView: View, focus?: { entryId?: string; projectId?: string }) => {
    setView(targetView);
    setPendingFocus(focus ?? null);
  };

  useEffect(() => {
    supabase.from('projects').select('*').order('name').then(({ data }) => {
      if (data) setProjects(data);
    });
  }, []);

  useEffect(() => {
    if (user && window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [user]);

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

  if (!user) {
    if (showLoginForm) return <Auth onBack={() => setShowLoginForm(false)} />;
    return <LandingPage onSignIn={() => setShowLoginForm(true)} />;
  }

  return (
    <div className="app-container">
      <nav className="nav-bar">
        <div className="nav-brand">
          <img src="/tk-icon.svg" alt="tk" className="nav-logo" />
        </div>
        <div className="nav-tabs">
          <button className={view === 'tracker' ? 'active' : ''} onClick={() => setView('tracker')}>Time Tracker</button>
          <button className={view === 'projects' ? 'active' : ''} onClick={() => setView('projects')}>Projects</button>
          <button className={view === 'organizations' ? 'active' : ''} onClick={() => setView('organizations')}>Organizations</button>
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>Dashboard</button>
          <button className={view === 'users' ? 'active' : ''} onClick={() => setView('users')}>Users</button>
          <button className={view === 'approvals' ? 'active' : ''} onClick={() => setView('approvals')}>Approvals</button>
          <button className={view === 'profile' ? 'active' : ''} onClick={() => setView('profile')}>Profile</button>
          <button className={view === 'billing' ? 'active' : ''} onClick={() => setView('billing')}>Billing</button>
        </div>
        <div className="nav-actions">
          <button className="nav-add-time" onClick={() => setShowManualEntry(true)}>
            + Add Time
          </button>
          <span className="nav-user-email">{user?.email}</span>
          <DarkModeToggle />
          <button className="nav-signout" onClick={() => signOut()} title="Sign out">Sign out</button>
        </div>
      </nav>
      {view === 'tracker' && (
        <TimeTracker
          showManualEntry={showManualEntry}
          onManualEntryClose={() => setShowManualEntry(false)}
          focusEntryId={pendingFocus?.entryId}
          onFocusHandled={() => setPendingFocus(null)}
        />
      )}
      {view === 'projects' && <ProjectsView />}
      {view === 'organizations' && <OrganizationManagement />}
      {view === 'dashboard' && (
        <Dashboard
          initialProjectId={pendingFocus?.projectId}
          onFocusHandled={() => setPendingFocus(null)}
        />
      )}
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
      <CommandPalette projects={projects} onNavigate={handleNavigate} />
      <MobileNav
        view={view}
        onNavigate={setView}
        userEmail={user?.email}
        onAddTime={() => setShowManualEntry(true)}
        onSignOut={() => signOut()}
      />
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

import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import { Auth } from './components/Auth';
import { TimeTracker } from './components/TimeTracker';
import './App.css';

function AppContent() {
  const { user, loading } = useAuth();

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

  return user ? <TimeTracker /> : <Auth />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

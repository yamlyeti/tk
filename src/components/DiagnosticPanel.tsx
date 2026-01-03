import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';

export const DiagnosticPanel = () => {
  const { user } = useAuth();
  const [diagnostics, setDiagnostics] = useState<any>({});
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, [user]);

  const runDiagnostics = async () => {
    const results: any = {
      timestamp: new Date().toISOString(),
      user: {
        isLoggedIn: !!user,
        userId: user?.id || 'N/A',
        email: user?.email || 'N/A',
      },
      supabase: {
        url: import.meta.env.VITE_SUPABASE_URL || 'NOT SET',
        hasAnonKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      database: {
        projects: 'Not checked',
        canInsert: 'Not checked',
      }
    };

    if (user) {
      // Test projects table read
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .limit(1);
      
      results.database.projects = projectsError 
        ? `ERROR: ${projectsError.message}` 
        : `OK (${projects?.length || 0} found)`;

      // Test user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      results.database.userProfile = profileError
        ? `ERROR: ${profileError.message}`
        : `OK (${profile?.email})`;
    }

    setDiagnostics(results);
  };

  const testProjectInsert = async () => {
    if (!user) {
      alert('Not logged in!');
      return;
    }

    setTesting(true);
    const testProject = {
      user_id: user.id,
      name: `TEST ${Date.now()}`,
      description: 'Diagnostic test project',
    };

    console.log('🧪 Testing insert with:', testProject);

    const { data, error } = await supabase
      .from('projects')
      .insert(testProject)
      .select();

    if (error) {
      alert(`❌ INSERT FAILED: ${error.message}\n\nCheck console for details.`);
      console.error('Insert error details:', error);
    } else {
      alert(`✅ INSERT SUCCESS!\n\nProject created: ${data[0].name}`);
      console.log('Insert success:', data);
      
      // Clean up test project
      await supabase.from('projects').delete().eq('id', data[0].id);
    }

    setTesting(false);
    runDiagnostics();
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#1a1a1a',
      color: '#fff',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '400px',
      fontSize: '12px',
      fontFamily: 'monospace',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 9999,
      maxHeight: '80vh',
      overflow: 'auto',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px' }}>🔍 Diagnostics Panel</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <strong>User:</strong>
        <div style={{ color: user ? '#4ade80' : '#ef4444' }}>
          {diagnostics.user?.isLoggedIn ? '✅ Logged In' : '❌ Not Logged In'}
        </div>
        {user && (
          <>
            <div>ID: {diagnostics.user?.userId?.slice(0, 8)}...</div>
            <div>Email: {diagnostics.user?.email}</div>
          </>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Supabase:</strong>
        <div>URL: {diagnostics.supabase?.url?.slice(0, 30)}...</div>
        <div style={{ color: diagnostics.supabase?.hasAnonKey ? '#4ade80' : '#ef4444' }}>
          API Key: {diagnostics.supabase?.hasAnonKey ? '✅ Set' : '❌ Missing'}
        </div>
      </div>

      {user && (
        <div style={{ marginBottom: '12px' }}>
          <strong>Database:</strong>
          <div>Projects: {diagnostics.database?.projects}</div>
          <div>Profile: {diagnostics.database?.userProfile}</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        <button
          onClick={runDiagnostics}
          style={{
            padding: '6px 12px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          🔄 Refresh
        </button>
        
        {user && (
          <button
            onClick={testProjectInsert}
            disabled={testing}
            style={{
              padding: '6px 12px',
              background: testing ? '#666' : '#10b981',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: testing ? 'not-allowed' : 'pointer',
              fontSize: '11px',
            }}
          >
            {testing ? '⏳ Testing...' : '🧪 Test Insert'}
          </button>
        )}
      </div>

      <div style={{ 
        marginTop: '12px', 
        fontSize: '10px', 
        color: '#888',
        paddingTop: '12px',
        borderTop: '1px solid #333'
      }}>
        Last check: {new Date(diagnostics.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
};

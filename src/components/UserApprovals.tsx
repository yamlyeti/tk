import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { UserCheck, Clock, Mail, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import './UserApprovals.css';

interface PendingUser {
  id: string;
  email: string;
  full_name: string | null;
  approval_status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

export function UserApprovals() {
  const { user: currentUser } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [currentUserProfile, setCurrentUserProfile] = useState<{ role: string } | null>(null);

  useEffect(() => {
    loadCurrentUserProfile();
    loadPendingUsers();
  }, [filter]);

  async function loadCurrentUserProfile() {
    if (!currentUser) return;
    
    const { data } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', currentUser.id)
      .single();
    
    if (data) {
      setCurrentUserProfile(data);
    }
  }

  async function loadPendingUsers() {
    setLoading(true);
    let query = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.eq('approval_status', 'pending');
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading users:', error);
    } else {
      setPendingUsers(data || []);
    }
    setLoading(false);
  }

  async function approveUser(userId: string) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ approval_status: 'approved', is_active: true })
      .eq('id', userId);

    if (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    } else {
      alert('User approved successfully!');
      loadPendingUsers();
    }
  }

  async function denyUser(userId: string) {
    const confirmed = window.confirm('Are you sure you want to deny this user? They will not be able to access the system.');
    if (!confirmed) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({ approval_status: 'denied', is_active: false })
      .eq('id', userId);

    if (error) {
      console.error('Error denying user:', error);
      alert('Failed to deny user');
    } else {
      alert('User denied');
      loadPendingUsers();
    }
  }

  if (currentUserProfile?.role !== 'admin') {
    return (
      <div className="user-approvals-container">
        <div className="access-denied">
          <XCircle size={48} />
          <h2>Access Denied</h2>
          <p>Only administrators can access user approvals.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="user-approvals-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="user-approvals-container">
      <div className="approvals-header">
        <div className="header-content">
          <h1>
            <UserCheck className="header-icon" />
            User Approvals
          </h1>
          <p className="subtitle">Review and approve new user registrations</p>
        </div>

        <div className="filter-tabs">
          <button
            className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            <Clock size={18} />
            Pending ({pendingUsers.filter(u => u.approval_status === 'pending').length})
          </button>
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Users ({pendingUsers.length})
          </button>
        </div>
      </div>

      <div className="approvals-stats">
        <div className="stat-card pending">
          <Clock size={24} />
          <div className="stat-content">
            <div className="stat-value">
              {pendingUsers.filter(u => u.approval_status === 'pending').length}
            </div>
            <div className="stat-label">Pending Approval</div>
          </div>
        </div>
        <div className="stat-card approved">
          <CheckCircle size={24} />
          <div className="stat-content">
            <div className="stat-value">
              {pendingUsers.filter(u => u.approval_status === 'approved').length}
            </div>
            <div className="stat-label">Approved</div>
          </div>
        </div>
        <div className="stat-card denied">
          <XCircle size={24} />
          <div className="stat-content">
            <div className="stat-value">
              {pendingUsers.filter(u => u.approval_status === 'denied').length}
            </div>
            <div className="stat-label">Denied</div>
          </div>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="empty-state">
          <UserCheck size={64} />
          <h3>No {filter === 'pending' ? 'Pending' : ''} Users</h3>
          <p>
            {filter === 'pending'
              ? 'All user registrations have been reviewed.'
              : 'No users found in the system.'}
          </p>
        </div>
      ) : (
        <div className="users-list">
          {pendingUsers.map((user) => (
            <div key={user.id} className={`user-card ${user.approval_status}`}>
              <div className="user-avatar">
                {user.email.charAt(0).toUpperCase()}
              </div>
              
              <div className="user-info">
                <div className="user-name">
                  {user.full_name || 'No name provided'}
                </div>
                <div className="user-details">
                  <span className="detail-item">
                    <Mail size={14} />
                    {user.email}
                  </span>
                  <span className="detail-item">
                    <Calendar size={14} />
                    Registered {new Date(user.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="user-status">
                <span className={`status-badge ${user.approval_status}`}>
                  {user.approval_status === 'pending' && <Clock size={14} />}
                  {user.approval_status === 'approved' && <CheckCircle size={14} />}
                  {user.approval_status === 'denied' && <XCircle size={14} />}
                  {user.approval_status.charAt(0).toUpperCase() + user.approval_status.slice(1)}
                </span>
              </div>

              {user.approval_status === 'pending' && (
                <div className="user-actions">
                  <button
                    className="action-btn approve"
                    onClick={() => approveUser(user.id)}
                    title="Approve User"
                  >
                    <CheckCircle size={18} />
                    Approve
                  </button>
                  <button
                    className="action-btn deny"
                    onClick={() => denyUser(user.id)}
                    title="Deny User"
                  >
                    <XCircle size={18} />
                    Deny
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

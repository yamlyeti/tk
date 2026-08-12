import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, X, Save } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import './UserProfile.css';

interface UserProfileData {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  is_active: boolean;
  approval_status: 'pending' | 'approved' | 'denied';
  created_at: string;
}

interface Stats {
  totalSeconds: number;
  entryCount: number;
  projectCount: number;
}

export function UserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    loadStats();
  }, [user]);

  async function loadProfile() {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
    } else if (data) {
      setProfile(data);
      setFullName(data.full_name || '');
    }
    setLoading(false);
  }

  async function loadStats() {
    if (!user) return;

    const [{ data: entries }, { data: projectIds }] = await Promise.all([
      supabase.from('time_entries').select('duration').eq('user_id', user.id).not('end_time', 'is', null),
      supabase.from('projects').select('id').eq('user_id', user.id),
    ]);

    setStats({
      totalSeconds: (entries || []).reduce((sum, e) => sum + (e.duration || 0), 0),
      entryCount: (entries || []).length,
      projectCount: (projectIds || []).length,
    });
  }

  async function saveProfile() {
    if (!user || !profile) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({ full_name: fullName })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } else {
      await loadProfile();
      setEditing(false);
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const formatMemberSince = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const statusLabel = (p: UserProfileData) => {
    if (!p.is_active) return 'Deactivated';
    if (p.approval_status === 'pending') return 'Pending approval';
    if (p.approval_status === 'denied') return 'Denied';
    return 'Active';
  };

  if (loading) {
    return <div className="profile-loading">Loading profile…</div>;
  }

  if (!profile) {
    return <div className="profile-loading">Profile not found</div>;
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-identity">
          <div className="profile-avatar">
            {(profile.full_name || profile.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="profile-name">{profile.full_name || 'No name set'}</h2>
            <p className="profile-email">
              <Mail size={14} />
              {profile.email}
            </p>
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="profile-edit-btn">
            Edit Profile
          </button>
        )}
      </div>

      <div className="profile-card">
        {editing ? (
          <div className="profile-edit-form">
            <div className="profile-field">
              <label>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>
            <div className="profile-edit-actions">
              <button
                onClick={() => {
                  setEditing(false);
                  setFullName(profile.full_name || '');
                }}
                className="profile-cancel-btn"
              >
                <X size={16} />
                Cancel
              </button>
              <button onClick={saveProfile} className="profile-save-btn">
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="profile-meta-grid">
              <div className="profile-meta-item">
                <span className="profile-meta-label">Role</span>
                <span className={`profile-role-badge ${profile.role}`}>{profile.role}</span>
              </div>
              <div className="profile-meta-item">
                <span className="profile-meta-label">Status</span>
                <span className={`profile-status-badge ${profile.is_active && profile.approval_status === 'approved' ? 'ok' : 'warn'}`}>
                  {statusLabel(profile)}
                </span>
              </div>
              <div className="profile-meta-item">
                <span className="profile-meta-label">Member since</span>
                <span className="profile-meta-value">{formatMemberSince(profile.created_at)}</span>
              </div>
            </div>

            {stats && (
              <div className="profile-stats-grid">
                <div className="profile-stat">
                  <span className="profile-stat-value">{formatDuration(stats.totalSeconds)}</span>
                  <span className="profile-stat-label">Time tracked</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-value">{stats.entryCount}</span>
                  <span className="profile-stat-label">Entries logged</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-value">{stats.projectCount}</span>
                  <span className="profile-stat-label">Projects</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

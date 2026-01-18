import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Trash2, DollarSign, ChevronUp, History } from 'lucide-react';
import type { ProjectRate, CurrentProjectRate } from '../types';
import './ProjectTeamManagement.css';

interface ProjectMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  added_at: string;
  user_profiles: {
    email: string;
    full_name: string | null;
  };
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
}

interface ProjectTeamManagementProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ProjectTeamManagement({ projectId, projectName, onClose }: ProjectTeamManagementProps) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'member'>('member');
  const [loading, setLoading] = useState(true);

  // Rate management state
  const [memberRates, setMemberRates] = useState<Map<string, CurrentProjectRate>>(new Map());
  const [editingRateFor, setEditingRateFor] = useState<string | null>(null);
  const [rateForm, setRateForm] = useState({
    hourly_rate: '',
    currency: 'USD',
    effective_date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [showRateHistory, setShowRateHistory] = useState<string | null>(null);
  const [rateHistory, setRateHistory] = useState<ProjectRate[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadMembers();
    loadAllUsers();
    loadMemberRates();
    getCurrentUser();
  }, [projectId]);

  async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  }

  async function loadMembers() {
    // Use LEFT JOIN instead of INNER JOIN to show members even if user_profiles is missing
    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        user_profiles (
          email,
          full_name
        )
      `)
      .eq('project_id', projectId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error loading members:', error);
    } else {
      // Filter out any members where user_profiles is completely null
      // and log them for debugging
      const validMembers = (data || []).filter(member => {
        if (!member.user_profiles) {
          console.warn('Member missing user_profiles:', member.user_id);
          return false;
        }
        return true;
      });
      setMembers(validMembers);
    }
    setLoading(false);
  }

  async function loadAllUsers() {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('is_active', true)
      .order('email');

    if (error) {
      console.error('Error loading users:', error);
    } else {
      setAllUsers(data || []);
    }
  }

  async function addMember() {
    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    const { error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: selectedUser,
        role: selectedRole,
      });

    if (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member. They may already be on this project.');
    } else {
      await loadMembers();
      setSelectedUser('');
      setSelectedRole('member');
    }
  }

  async function removeMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member?')) return;

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    } else {
      await loadMembers();
    }
  }

  async function updateMemberRole(memberId: string, newRole: 'admin' | 'member' | 'owner') {
    const { error } = await supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating member role:', error);
      alert('Failed to update member role');
    } else {
      await loadMembers();
    }
  }

  async function loadMemberRates() {
    const { data, error } = await supabase
      .from('current_project_rates')
      .select('*')
      .eq('project_id', projectId);

    if (error) {
      console.error('Error loading rates:', error);
    } else {
      const ratesMap = new Map<string, CurrentProjectRate>();
      data?.forEach(rate => {
        ratesMap.set(rate.user_id, rate);
      });
      setMemberRates(ratesMap);
    }
  }

  async function startEditingRate(userId: string) {
    const existingRate = memberRates.get(userId);
    if (existingRate) {
      setRateForm({
        hourly_rate: existingRate.hourly_rate.toString(),
        currency: existingRate.currency,
        effective_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    } else {
      setRateForm({
        hourly_rate: '',
        currency: 'USD',
        effective_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
    setEditingRateFor(userId);
  }

  async function saveRate(userId: string) {
    if (!rateForm.hourly_rate || !currentUserId) {
      alert('Please enter a valid hourly rate');
      return;
    }

    const { error } = await supabase
      .from('project_rates')
      .insert({
        project_id: projectId,
        user_id: userId,
        hourly_rate: parseFloat(rateForm.hourly_rate),
        currency: rateForm.currency,
        effective_date: rateForm.effective_date,
        notes: rateForm.notes || null,
        set_by: currentUserId
      });

    if (error) {
      console.error('Error setting rate:', error);
      alert('Failed to set rate. You may not have permission.');
    } else {
      await loadMemberRates();
      setEditingRateFor(null);
      setRateForm({
        hourly_rate: '',
        currency: 'USD',
        effective_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  }

  async function loadRateHistory(userId: string) {
    const { data, error } = await supabase
      .from('project_rates')
      .select('*')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .order('effective_date', { ascending: false });

    if (error) {
      console.error('Error loading rate history:', error);
    } else {
      setRateHistory(data || []);
      setShowRateHistory(userId);
    }
  }

  const availableUsers = allUsers.filter(
    (user) => !members.some((m) => m.user_id === user.id)
  );

  const filteredUsers = availableUsers.filter(
    (user) =>
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="team-modal-overlay">
        <div className="team-loading">
          <div className="team-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="team-modal-overlay">
      <div className="team-modal">
        <div className="team-modal-header">
          <div>
            <h2>
              <Users size={24} />
              Team Management
            </h2>
            <p className="team-modal-subtitle">{projectName}</p>
          </div>
          <button onClick={onClose} className="team-close-button">
            &times;
          </button>
        </div>

        <div className="team-modal-content">
          {/* Add Member Section */}
          <div className="team-section">
            <div className="team-add-section">
              <h3 className="team-section-title">
                <UserPlus size={20} />
                Add Team Member
              </h3>
              <input
                type="text"
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="team-search-input"
              />
              <div className="team-add-controls">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="team-select"
                >
                  <option value="">Select a user...</option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email} ({user.email})
                    </option>
                  ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'member')}
                  className="team-select"
                  style={{ flex: '0 0 auto', width: '120px' }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={addMember}
                  disabled={!selectedUser}
                  className="team-button team-button-primary"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Current Members */}
          <div className="team-section">
            <h3 className="team-section-title">
              Current Team Members ({members.length})
            </h3>
            {members.length === 0 ? (
              <div className="team-no-data">
                <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <h4 style={{ margin: '0 0 8px 0' }}>No team members</h4>
                <p style={{ margin: 0 }}>Add team members to collaborate on this project.</p>
              </div>
            ) : (
              <div className="team-members-list">
                {members.map((member) => (
                  <div key={member.id} className="team-member-card">
                    <div className="team-member-header">
                      <div className="team-member-info">
                        <div className="team-member-avatar purple">
                          {(member.user_profiles.full_name || member.user_profiles.email)[0].toUpperCase()}
                        </div>
                        <div className="team-member-details">
                          <p className="team-member-name">
                            {member.user_profiles.full_name || 'No name'}
                          </p>
                          <p className="team-member-email">
                            {member.user_profiles.email}
                          </p>
                        </div>
                      </div>
                      <div className="team-member-actions">
                        <select
                          value={member.role}
                          onChange={(e) => updateMemberRole(member.id, e.target.value as 'admin' | 'member' | 'owner')}
                          disabled={member.role === 'owner'}
                          className="team-select"
                          style={{ width: '120px' }}
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => removeMember(member.id)}
                            className="team-icon-button danger"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Billable Rates Section */}
          {members.length > 0 && (
            <div className="team-section">
              <h3 className="team-section-title">
                <DollarSign size={20} />
                Billable Rates
              </h3>
              <div className="team-members-list">
                {members.map((member) => {
                  const rate = memberRates.get(member.user_id);
                  const isEditing = editingRateFor === member.user_id;
                  const showingHistory = showRateHistory === member.user_id;

                  return (
                    <div key={`rate-${member.id}`} className="team-member-card">
                      <div className="team-member-header">
                        <div className="team-member-info">
                          <div className="team-member-avatar green">
                            {(member.user_profiles.full_name || member.user_profiles.email)[0].toUpperCase()}
                          </div>
                          <div className="team-member-details">
                            <p className="team-member-name">
                              {member.user_profiles.full_name || 'No name'}
                            </p>
                            {rate ? (
                              <div className="team-member-rate">
                                {rate.currency} {rate.hourly_rate.toFixed(2)}/hr
                                <span className={`team-rate-badge ${rate.rate_source === 'project' ? 'project' : 'org'}`}>
                                  {rate.rate_source === 'project' ? 'Project' : 'Org Default'}
                                </span>
                              </div>
                            ) : (
                              <p className="team-no-rate">No rate set</p>
                            )}
                          </div>
                        </div>
                        {!isEditing && (
                          <div className="team-member-actions">
                            <button
                              onClick={() => startEditingRate(member.user_id)}
                              className="team-button team-button-primary"
                              style={{ padding: '8px 16px', fontSize: '13px' }}
                            >
                              {rate ? 'Update Rate' : 'Set Rate'}
                            </button>
                            {rate && (
                              <button
                                onClick={() => loadRateHistory(member.user_id)}
                                className="team-icon-button"
                                title="View rate history"
                              >
                                <History size={18} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Edit Rate Form */}
                      {isEditing && (
                        <div className="team-rate-form">
                          <h4 className="team-rate-form-title">
                            Set Billable Rate for {member.user_profiles.full_name || member.user_profiles.email}
                          </h4>
                          <div className="team-form-grid">
                            <div className="team-form-group">
                              <label className="team-form-label">Hourly Rate</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={rateForm.hourly_rate}
                                onChange={(e) => setRateForm({ ...rateForm, hourly_rate: e.target.value })}
                                className="team-form-input"
                                placeholder="150.00"
                              />
                            </div>
                            <div className="team-form-group">
                              <label className="team-form-label">Currency</label>
                              <select
                                value={rateForm.currency}
                                onChange={(e) => setRateForm({ ...rateForm, currency: e.target.value })}
                                className="team-form-select"
                              >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="CAD">CAD</option>
                                <option value="AUD">AUD</option>
                              </select>
                            </div>
                          </div>
                          <div className="team-form-group">
                            <label className="team-form-label">Effective Date</label>
                            <input
                              type="date"
                              value={rateForm.effective_date}
                              onChange={(e) => setRateForm({ ...rateForm, effective_date: e.target.value })}
                              className="team-form-input"
                            />
                          </div>
                          <div className="team-form-group">
                            <label className="team-form-label">Notes (optional)</label>
                            <textarea
                              value={rateForm.notes}
                              onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })}
                              className="team-form-textarea"
                              placeholder="Rate change reason or additional context..."
                            />
                          </div>
                          <div className="team-form-actions">
                            <button
                              onClick={() => saveRate(member.user_id)}
                              className="team-button team-button-primary"
                            >
                              Save Rate
                            </button>
                            <button
                              onClick={() => setEditingRateFor(null)}
                              className="team-button team-button-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Rate History */}
                      {showingHistory && (
                        <div className="team-rate-history">
                          <div className="team-history-header">
                            <h4 className="team-history-title">
                              <History size={16} />
                              Rate History
                            </h4>
                            <button
                              onClick={() => setShowRateHistory(null)}
                              className="team-icon-button"
                            >
                              <ChevronUp size={18} />
                            </button>
                          </div>
                          <div className="team-history-list">
                            {rateHistory.length > 0 ? (
                              rateHistory.map((historyRate) => (
                                <div key={historyRate.id} className="team-history-item">
                                  <div className="team-history-item-header">
                                    <div>
                                      <p className="team-history-rate">
                                        {historyRate.currency} {historyRate.hourly_rate.toFixed(2)}/hr
                                      </p>
                                      <p className="team-history-dates">
                                        Effective: {new Date(historyRate.effective_date).toLocaleDateString()}
                                        {historyRate.end_date && (
                                          <> · Ended: {new Date(historyRate.end_date).toLocaleDateString()}</>
                                        )}
                                      </p>
                                      {historyRate.notes && (
                                        <p className="team-history-notes">{historyRate.notes}</p>
                                      )}
                                    </div>
                                    {!historyRate.end_date && (
                                      <span className="team-current-badge">Current</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="team-no-data">No rate history available</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="team-modal-footer">
          <button onClick={onClose} className="team-button team-button-secondary" style={{ width: '100%' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import './UserManagement.css';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  is_active: boolean;
  approval_status?: 'pending' | 'approved' | 'denied';
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

interface Organization {
  id: string;
  name: string;
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Record<string, string[]>>({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [userOrganizations, setUserOrganizations] = useState<Record<string, string[]>>({});
  const [showAssignOrgModal, setShowAssignOrgModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'member'>('member');

  useEffect(() => {
    loadUsers();
    loadCurrentUserProfile();
    loadProjects();
    loadOrganizations();
  }, []);

  async function loadCurrentUserProfile() {
    if (!currentUser) return;

    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (data) {
      setCurrentUserProfile(data);
    }
  }

  async function loadUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading users:', error);
    } else {
      setUsers(data || []);
      if (data) {
        const projectAssignments: Record<string, string[]> = {};
        const orgAssignments: Record<string, string[]> = {};
        for (const user of data) {
          const { data: memberData } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', user.id);
          projectAssignments[user.id] = memberData?.map(m => m.project_id) || [];

          const { data: orgMemberData } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', user.id);
          orgAssignments[user.id] = orgMemberData?.map(m => m.organization_id) || [];
        }
        setUserProjects(projectAssignments);
        setUserOrganizations(orgAssignments);
      }
    }
    setLoading(false);
  }

  async function loadProjects() {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');

    if (data) {
      setProjects(data);
    }
  }

  async function loadOrganizations() {
    const { data } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');

    if (data) {
      setOrganizations(data);
    }
  }

  async function toggleUserStatus(userId: string, currentStatus: boolean) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user status:', error);
      alert('Failed to update user status');
    } else {
      await loadUsers();
    }
  }

  async function updateUserRole(userId: string, newRole: 'admin' | 'member') {
    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    } else {
      await loadUsers();
    }
  }

  async function toggleProjectAssignment(projectId: string) {
    if (!selectedUserId) return;

    const isAssigned = userProjects[selectedUserId]?.includes(projectId);

    if (isAssigned) {
      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', selectedUserId);

      if (error) {
        console.error('Error removing project assignment:', error);
        alert('Failed to remove project assignment');
      }
    } else {
      const { error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: selectedUserId,
          role: 'member'
        });

      if (error) {
        console.error('Error adding project assignment:', error);
        alert('Failed to add project assignment');
      }
    }

    await loadUsers();
  }

  async function toggleOrganizationAssignment(organizationId: string) {
    if (!selectedUserId) return;

    const isAssigned = userOrganizations[selectedUserId]?.includes(organizationId);

    if (isAssigned) {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', organizationId)
        .eq('user_id', selectedUserId);

      if (error) {
        console.error('Error removing organization assignment:', error);
        alert('Failed to remove organization assignment');
      }
    } else {
      const { error } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organizationId,
          user_id: selectedUserId,
          role: 'member'
        });

      if (error) {
        console.error('Error adding organization assignment:', error);
        alert('Failed to add organization assignment');
      }
    }

    await loadUsers();
  }

  async function addUser() {
    if (!newUserEmail || !newUserName) {
      alert('Please enter both email and name');
      return;
    }

    // Note: In a real app, you'd use Supabase Auth to create the user
    // For now, we'll just add to user_profiles (requires the user to sign up separately)
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        email: newUserEmail,
        full_name: newUserName,
        role: newUserRole,
        is_active: true
      });

    if (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user. They may need to sign up first.');
    } else {
      setShowAddUserModal(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('member');
      await loadUsers();
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    if (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    } else {
      await loadUsers();
    }
  }

  const isAdmin = currentUserProfile?.role === 'admin';

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' ? user.is_active : !user.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
    members: users.filter(u => u.role === 'member').length,
  };

  if (loading) {
    return <div className="um-loading">Loading users…</div>;
  }

  return (
    <div className="um-container">
      <div className="um-header">
        <div>
          <h2 className="um-title">User Management</h2>
          <p className="um-subtitle">
            {stats.total} users · {stats.active} active · {stats.admins} admin{stats.admins === 1 ? '' : 's'} · {stats.members} member{stats.members === 1 ? '' : 's'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowAddUserModal(true)} className="um-add-btn">
            + Add User
          </button>
        )}
      </div>

      <div className="um-filters">
        <div className="um-search">
          <Search size={16} className="um-search-icon" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'member')}>
          <option value="all">All Roles</option>
          <option value="admin">Admins</option>
          <option value="member">Members</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="um-table-wrap">
        <table className="um-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              {isAdmin && <th className="um-th-actions">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="um-user-cell">
                    <div className="um-avatar">{(user.full_name || user.email)[0].toUpperCase()}</div>
                    <div>
                      <div className="um-user-name">{user.full_name || 'No name'}</div>
                      {user.id === currentUser?.id && <span className="um-you-tag">(You)</span>}
                    </div>
                  </div>
                </td>
                <td className="um-muted">{user.email}</td>
                <td>
                  {isAdmin && user.id !== currentUser?.id ? (
                    <select
                      className="um-role-select"
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value as 'admin' | 'member')}
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`um-badge um-badge--${user.role}`}>{user.role}</span>
                  )}
                </td>
                <td>
                  <span className={`um-badge ${user.is_active ? 'um-badge--active' : 'um-badge--inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="um-muted">{new Date(user.created_at).toLocaleDateString()}</td>
                {isAdmin && (
                  <td className="um-actions-cell">
                    <button
                      className="um-action-link"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowAssignModal(true);
                      }}
                    >
                      Projects
                    </button>
                    <button
                      className="um-action-link"
                      onClick={() => {
                        setSelectedUserId(user.id);
                        setShowAssignOrgModal(true);
                      }}
                    >
                      Orgs
                    </button>
                    {user.id !== currentUser?.id && (
                      <>
                        <button
                          className="um-action-link"
                          onClick={() => toggleUserStatus(user.id, user.is_active)}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="um-action-icon" onClick={() => deleteUser(user.id)} title="Delete user">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Project Assignment Modal */}
      {showAssignModal && selectedUserId && (
        <div className="um-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Projects</h3>
            <div className="um-checkbox-list">
              {projects.map(project => (
                <label key={project.id} className="um-checkbox-row">
                  <input
                    type="checkbox"
                    checked={userProjects[selectedUserId]?.includes(project.id)}
                    onChange={() => toggleProjectAssignment(project.id)}
                  />
                  <span>{project.name}</span>
                </label>
              ))}
            </div>
            <button onClick={() => setShowAssignModal(false)} className="um-modal-done-btn">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Assign Organizations Modal */}
      {showAssignOrgModal && selectedUserId && (
        <div className="um-modal-overlay" onClick={() => setShowAssignOrgModal(false)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Organizations</h3>
            <div className="um-checkbox-list">
              {organizations.map(org => (
                <label key={org.id} className="um-checkbox-row">
                  <input
                    type="checkbox"
                    checked={userOrganizations[selectedUserId]?.includes(org.id)}
                    onChange={() => toggleOrganizationAssignment(org.id)}
                  />
                  <span>{org.name}</span>
                </label>
              ))}
            </div>
            <button onClick={() => setShowAssignOrgModal(false)} className="um-modal-done-btn">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="um-modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="um-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New User</h3>
            <div className="um-form-fields">
              <div className="um-field">
                <label>Email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className="um-field">
                <label>Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="John Doe"
                />
              </div>
              <div className="um-field">
                <label>Role</label>
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'member')}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="um-modal-actions">
              <button onClick={() => setShowAddUserModal(false)} className="um-modal-cancel-btn">
                Cancel
              </button>
              <button onClick={addUser} className="um-modal-done-btn">
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

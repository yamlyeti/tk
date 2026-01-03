import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Shield, Mail, Calendar, Check, X, Edit2, UserPlus, Trash2, Search, Download } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  is_active: boolean;
  created_at: string;
}

interface UserInvitation {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'member';
  invited_at: string;
  status: 'pending' | 'accepted' | 'expired';
}

interface Project {
  id: string;
  name: string;
}

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserProfile>>({});
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userProjects, setUserProjects] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadUsers();
    loadCurrentUserProfile();
    loadInvitations();
    loadProjects();
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
      // Load project assignments for each user
      if (data) {
        const projectAssignments: Record<string, string[]> = {};
        for (const user of data) {
          const { data: memberData } = await supabase
            .from('project_members')
            .select('project_id')
            .eq('user_id', user.id);
          projectAssignments[user.id] = memberData?.map(m => m.project_id) || [];
        }
        setUserProjects(projectAssignments);
      }
    }
    setLoading(false);
  }

  async function loadInvitations() {
    const { data, error } = await supabase
      .from('user_invitations')
      .select('*')
      .order('invited_at', { ascending: false });

    if (error) {
      console.error('Error loading invitations:', error);
    } else {
      setInvitations(data || []);
    }
  }

  async function loadProjects() {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('Error loading projects:', error);
    } else {
      setProjects(data || []);
    }
  }

  async function updateUser(userId: string, updates: Partial<UserProfile>) {
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    if (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user');
    } else {
      await loadUsers();
      setEditingUser(null);
      setEditForm({});
    }
  }

  function startEdit(user: UserProfile) {
    setEditingUser(user.id);
    setEditForm({
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
    });
  }

  function cancelEdit() {
    setEditingUser(null);
    setEditForm({});
  }

  async function saveEdit(userId: string) {
    await updateUser(userId, editForm);
  }

  async function inviteUser() {
    if (!inviteEmail.trim()) {
      alert('Please enter an email address');
      return;
    }

    // Create a temporary user profile that will be claimed when they sign up
    // This allows tracking invited users
    const { error } = await supabase
      .from('user_invitations')
      .insert({
        email: inviteEmail.toLowerCase().trim(),
        full_name: inviteName.trim() || null,
        role: inviteRole,
        invited_by: currentUser?.id,
        invited_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating invitation:', error);
      alert('Failed to create invitation. This user may already be invited or registered.');
    } else {
      alert(`Invitation created for ${inviteEmail}. Share the app signup link with them!`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('member');
      await loadInvitations();
    }
  }

  async function deleteInvitation(invitationId: string) {
    const { error } = await supabase
      .from('user_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      console.error('Error deleting invitation:', error);
      alert('Failed to delete invitation');
    } else {
      await loadInvitations();
    }
  }

  function openAssignProjects(userId: string) {
    setSelectedUserId(userId);
    setShowAssignModal(true);
  }

  async function toggleProjectAssignment(projectId: string) {
    if (!selectedUserId) return;

    const isAssigned = userProjects[selectedUserId]?.includes(projectId);

    if (isAssigned) {
      // Remove assignment
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
      // Add assignment
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

  function exportUsers() {
    const csv = [
      ['Email', 'Name', 'Role', 'Status', 'Joined'],
      ...filteredUsers.map(u => [
        u.email,
        u.full_name || '',
        u.role,
        u.is_active ? 'Active' : 'Inactive',
        new Date(u.created_at).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-8 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-4xl font-bold text-white drop-shadow-lg">
              User Management
            </h2>
            <p className="text-purple-100 mt-2 text-lg">
              Manage users and their permissions
            </p>
          </div>
          <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl">
            <User className="h-8 w-8 text-white" />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <div className="text-white/80 text-sm font-medium">Total Users</div>
            <div className="text-3xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <div className="text-white/80 text-sm font-medium">Active</div>
            <div className="text-3xl font-bold text-white mt-1">{stats.active}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <div className="text-white/80 text-sm font-medium">Admins</div>
            <div className="text-3xl font-bold text-white mt-1">{stats.admins}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20">
            <div className="text-white/80 text-sm font-medium">Members</div>
            <div className="text-3xl font-bold text-white mt-1">{stats.members}</div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/30 dark:to-pink-900/30 rounded-2xl shadow-xl p-6 border-2 border-purple-300 dark:border-purple-700">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3 flex-1 min-w-[300px]">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-purple-300 dark:border-purple-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="px-4 py-2.5 border-2 border-purple-300 dark:border-purple-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admins</option>
              <option value="member">Members</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-2.5 border-2 border-purple-300 dark:border-purple-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {isAdmin && (
            <div className="flex gap-3">
              <button
                onClick={exportUsers}
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium flex items-center gap-2"
              >
                <Download className="h-5 w-5" />
                Export CSV
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium flex items-center gap-2"
              >
                <UserPlus className="h-5 w-5" />
                Invite User
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/30 dark:to-pink-900/30 rounded-2xl shadow-2xl overflow-hidden border-2 border-purple-300 dark:border-purple-700 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white">
              <tr>
                <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider shadow-lg">
                  User
                </th>
                <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">
                  Joined
                </th>
                {isAdmin && (
                  <th className="px-6 py-5 text-right text-sm font-bold uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => (
                <tr 
                  key={user.id}
                  className="hover:bg-gradient-to-r hover:from-purple-100 hover:via-pink-100 hover:to-blue-100 dark:hover:from-purple-800/30 dark:hover:via-pink-800/30 dark:hover:to-blue-800/30 transition-all duration-300 border-b border-purple-200 dark:border-purple-800/50 hover:scale-[1.01] hover:shadow-lg"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <input
                        type="text"
                        value={editForm.full_name || ''}
                        onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                        className="px-3 py-2 border-2 border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm"
                      />
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-full flex items-center justify-center shadow-xl ring-2 ring-purple-300 dark:ring-purple-700 animate-pulse-slow">
                          <User className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.full_name || 'No name'}
                          </div>
                          {user.id === currentUser?.id && (
                            <span className="text-xs text-purple-600 dark:text-purple-400">(You)</span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-gray-900 dark:text-white">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {user.email}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id && isAdmin ? (
                      <select
                        value={editForm.role || user.role}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as 'admin' | 'member' })}
                        className="px-3 py-2 border-2 border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-md ${
                        user.role === 'admin'
                          ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 dark:from-purple-900 dark:to-pink-900 dark:text-purple-200'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                      }`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id && isAdmin ? (
                      <select
                        value={editForm.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.value === 'active' })}
                        className="px-3 py-2 border-2 border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 shadow-sm"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium shadow-md ${
                        user.is_active
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {user.is_active ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {editingUser === user.id ? (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => saveEdit(user.id)}
                            className="p-2 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-all"
                            title="Save"
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Cancel"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openAssignProjects(user.id)}
                            className="p-2 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-all"
                            title="Assign Projects"
                          >
                            <Shield className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => startEdit(user)}
                            disabled={user.id === currentUser?.id}
                            className="p-2 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Edit"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => deleteUser(user.id)}
                              className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/30 dark:to-pink-900/30 rounded-2xl">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your filters or search term.
          </p>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-purple-300 dark:border-purple-700">
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <UserPlus className="mr-3 h-6 w-6" />
                  Invite New User
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-4 py-2.5 border-2 border-purple-300 dark:border-purple-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 border-2 border-purple-300 dark:border-purple-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="w-full px-4 py-2.5 border-2 border-purple-300 dark:border-purple-600 rounded-xl focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={inviteUser}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium"
                >
                  Send Invite
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Assignment Modal */}
      {showAssignModal && selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full border-2 border-purple-300 dark:border-purple-700">
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <Shield className="mr-3 h-6 w-6" />
                  Assign Projects
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-2 max-h-96 overflow-y-auto">
              {projects.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No projects available
                </p>
              ) : (
                projects.map((project) => (
                  <label
                    key={project.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={userProjects[selectedUserId]?.includes(project.id) || false}
                      onChange={() => toggleProjectAssignment(project.id)}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-900 dark:text-white font-medium">
                      {project.name}
                    </span>
                  </label>
                ))
              )}
            </div>
            <div className="p-6 pt-0">
              <button
                onClick={() => setShowAssignModal(false)}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-medium"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Invitations Section */}
      {isAdmin && invitations.filter(i => i.status === 'pending').length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-900 dark:via-amber-900/30 dark:to-orange-900/30 rounded-2xl shadow-xl p-6 border-2 border-amber-300 dark:border-amber-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Mail className="mr-2 h-5 w-5 text-amber-600" />
            Pending Invitations ({invitations.filter(i => i.status === 'pending').length})
          </h3>
          <div className="space-y-2">
            {invitations.filter(i => i.status === 'pending').map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {invitation.email}
                  </div>
                  {invitation.full_name && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {invitation.full_name}
                    </div>
                  )}
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Invited {new Date(invitation.invited_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    invitation.role === 'admin'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {invitation.role}
                  </span>
                  <button
                    onClick={() => deleteInvitation(invitation.id)}
                    className="p-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    title="Cancel Invitation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

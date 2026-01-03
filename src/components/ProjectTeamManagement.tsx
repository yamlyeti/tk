import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Trash2 } from 'lucide-react';

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

  useEffect(() => {
    loadMembers();
    loadAllUsers();
  }, [projectId]);

  async function loadMembers() {
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
      setMembers(data || []);
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center">
                <Users className="mr-3" />
                Team Management
              </h2>
              <p className="text-purple-100 mt-1">{projectName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <span className="text-2xl">&times;</span>
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Add Member Section */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-700 p-6 rounded-xl mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <UserPlus className="mr-2 h-5 w-5" />
              Add Team Member
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search users by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Select a user...</option>
                    {filteredUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as 'admin' | 'member')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={addMember}
                  disabled={!selectedUser}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Current Members */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Team Members ({members.length})
            </h3>
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {(member.user_profiles.full_name || member.user_profiles.email)[0].toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.user_profiles.full_name || 'No name'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {member.user_profiles.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <select
                      value={member.role}
                      onChange={(e) => updateMemberRole(member.id, e.target.value as 'admin' | 'member' | 'owner')}
                      disabled={member.role === 'owner'}
                      className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                      <option value="owner">Owner</option>
                    </select>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {members.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No team members</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Add team members to collaborate on this project.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Building2, Users, FolderOpen, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import './OrganizationManagement.css';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  created_by: string;
  created_at: string;
}

interface OrganizationStats {
  project_count: number;
  member_count: number;
  total_hours: number;
}

interface UserProfile {
  is_active: boolean;
  approval_status: string;
}

interface MemberProfile {
  id: string;
  email: string;
  full_name?: string | null;
}

export function OrganizationManagement() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [orgStats, setOrgStats] = useState<Record<string, OrganizationStats>>({});
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // For assigning members to organizations
  const [users, setUsers] = useState<MemberProfile[]>([]);
  const [showAssignMembersModal, setShowAssignMembersModal] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [orgMembers, setOrgMembers] = useState<Record<string, string[]>>({});

  // For assigning projects to organizations
  const [projectsForAssign, setProjectsForAssign] = useState<any[]>([]);
  const [showAssignProjectsModal, setShowAssignProjectsModal] = useState(false);
  const [orgProjects, setOrgProjects] = useState<Record<string, string[]>>({});

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadUserProfile();
    loadOrganizations();
  }, []);

  async function loadUserProfile() {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_profiles')
      .select('is_active, approval_status')
      .eq('id', user.id)
      .single();
    
    if (data) {
      setUserProfile(data);
    }
  }

  async function loadOrganizations() {
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading organizations:', error);
    } else {
      setOrganizations(data || []);
      
      // Load stats for each organization
      if (data) {
        for (const org of data) {
          await loadOrgStats(org.id);
        }
      }
    }
    setLoading(false);
  }

  async function loadOrgStats(orgId: string) {
    // Get project count
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    // Get member count
    const { count: memberCount } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId);

    // Get total hours from view
    const { data: statsData } = await supabase
      .from('organization_time_stats')
      .select('total_hours')
      .eq('organization_id', orgId);

    const totalHours = statsData?.reduce((sum, row) => sum + (row.total_hours || 0), 0) || 0;

    setOrgStats(prev => ({
      ...prev,
      [orgId]: {
        project_count: projectCount || 0,
        member_count: memberCount || 0,
        total_hours: totalHours
      }
    }));
  }

  // Load users for assignment modal
  async function loadUsersForAssign() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .order('full_name');
    if (data) setUsers(data);
  }

  // Load members for a given organization
  async function loadOrgMembers(orgId: string) {
    const { data } = await supabase
      .from('organization_members')
      .select('organization_id, user_id')
      .eq('organization_id', orgId);
    const memberIds = data?.map((m: any) => m.user_id) || [];
    setOrgMembers(prev => ({ ...prev, [orgId]: memberIds }));
  }

  async function openAssignMembersModal(orgId: string) {
    setSelectedOrgId(orgId);
    await loadUsersForAssign();
    await loadOrgMembers(orgId);
    setShowAssignMembersModal(true);
  }

  async function toggleMemberAssignment(userId: string) {
    if (!selectedOrgId) return;
    const isAssigned = orgMembers[selectedOrgId]?.includes(userId);
    if (isAssigned) {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', selectedOrgId)
        .eq('user_id', userId);
      if (error) {
        console.error('Error removing member:', error);
        alert('Failed to remove member');
        return;
      }
    } else {
      const { error } = await supabase
        .from('organization_members')
        .insert({ organization_id: selectedOrgId, user_id: userId, role: 'member' });
      if (error) {
        console.error('Error adding member:', error);
        alert('Failed to add member');
        return;
      }
    }

    await loadOrgMembers(selectedOrgId);
    await loadOrgStats(selectedOrgId);
  }

  // --- Project assignment helpers ---
  async function loadProjectsForAssign() {
    const { data } = await supabase
      .from('projects')
      .select('id, name, organization_id')
      .order('name');
    if (data) setProjectsForAssign(data);
  }

  async function loadOrgProjects(orgId: string) {
    const { data } = await supabase
      .from('projects')
      .select('id')
      .eq('organization_id', orgId);
    const projIds = data?.map((p: any) => p.id) || [];
    setOrgProjects(prev => ({ ...prev, [orgId]: projIds }));
  }

  async function openAssignProjectsModal(orgId: string) {
    setSelectedOrgId(orgId);
    await loadProjectsForAssign();
    await loadOrgProjects(orgId);
    setShowAssignProjectsModal(true);
  }

  async function toggleProjectAssignment(projectId: string) {
    if (!selectedOrgId) return;
    const isAssigned = orgProjects[selectedOrgId]?.includes(projectId);
    if (isAssigned) {
      // detach project from org
      const { error } = await supabase
        .from('projects')
        .update({ organization_id: null })
        .eq('id', projectId);
      if (error) {
        console.error('Error removing project from org:', error);
        alert('Failed to remove project from organization');
        return;
      }
    } else {
      const { error } = await supabase
        .from('projects')
        .update({ organization_id: selectedOrgId })
        .eq('id', projectId);
      if (error) {
        console.error('Error assigning project to org:', error);
        alert('Failed to assign project to organization');
        return;
      }
    }

    await loadOrgProjects(selectedOrgId);
    await loadOrgStats(selectedOrgId);
  }

  async function handleCreateOrganization() {
    if (!name.trim()) {
      alert('Please enter an organization name');
      return;
    }

    // Check user approval status before creating
    if (!userProfile?.is_active || userProfile?.approval_status !== 'approved') {
      alert('Your account must be active and approved to create organizations');
      return;
    }

    const { error } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        created_by: user?.id
      });

    if (error) {
      console.error('Error creating organization:', error);
      alert('Failed to create organization: ' + error.message);
    } else {
      setName('');
      setDescription('');
      setShowCreateModal(false);
      loadOrganizations();
    }
  }

  async function handleUpdateOrganization() {
    if (!editingOrg || !name.trim()) return;

    const { error } = await supabase
      .from('organizations')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingOrg.id);

    if (error) {
      console.error('Error updating organization:', error);
      alert('Failed to update organization');
    } else {
      setEditingOrg(null);
      setName('');
      setDescription('');
      loadOrganizations();
    }
  }

  async function handleDeleteOrganization(orgId: string, orgName: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${orgName}"? This will also delete all projects and time entries within this organization.`
    );
    if (!confirmed) return;

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) {
      console.error('Error deleting organization:', error);
      alert('Failed to delete organization');
    } else {
      loadOrganizations();
    }
  }

  function openEditModal(org: Organization) {
    setEditingOrg(org);
    setName(org.name);
    setDescription(org.description || '');
  }

  function closeModal() {
    setShowCreateModal(false);
    setEditingOrg(null);
    setName('');
    setDescription('');
  }

  if (loading) {
    return (
      <div className="org-management-container">
        <div className="loading">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div className="org-management-container">
      <div className="org-header">
        <div className="header-content">
          <h1>
            <Building2 className="header-icon" />
            Organizations
          </h1>
          <p className="subtitle">Manage your organizations and their projects</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          <Plus size={20} />
          New Organization
        </button>
      </div>

      {organizations.length === 0 ? (
        <div className="empty-state">
          <Building2 size={64} />
          <h3>No Organizations Yet</h3>
          <p>Create your first organization to group related projects together.</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={20} />
            Create Organization
          </button>
        </div>
      ) : (
        <div className="org-grid">
          {organizations.map((org) => {
            const stats = orgStats[org.id] || { project_count: 0, member_count: 0, total_hours: 0 };
            return (
              <div key={org.id} className="org-card">
                <div className="org-card-header">
                  <div className="org-avatar">
                    {org.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="org-info">
                    <h3 className="org-name">{org.name}</h3>
                    {org.description && (
                      <p className="org-description">{org.description}</p>
                    )}
                  </div>
                  <div className="org-actions">
                    <button
                      className="action-btn edit"
                      onClick={() => openEditModal(org)}
                      title="Edit Organization"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="action-btn assign-projects"
                      onClick={() => openAssignProjectsModal(org.id)}
                      title="Assign Projects"
                    >
                      <FolderOpen size={16} />
                    </button>
                    <button
                      className="action-btn assign"
                      onClick={() => openAssignMembersModal(org.id)}
                      title="Assign Members"
                    >
                      <Users size={16} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={() => handleDeleteOrganization(org.id, org.name)}
                      title="Delete Organization"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="org-stats">
                  <div className="stat-item">
                    <FolderOpen size={18} />
                    <div>
                      <div className="stat-value">{stats.project_count}</div>
                      <div className="stat-label">Projects</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <Users size={18} />
                    <div>
                      <div className="stat-value">{stats.member_count}</div>
                      <div className="stat-label">Members</div>
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-icon">⏱️</span>
                    <div>
                      <div className="stat-value">{stats.total_hours.toFixed(1)}h</div>
                      <div className="stat-label">Total Time</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Members Modal */}
       {showAssignMembersModal && selectedOrgId && (
         <div className="modal-overlay" onClick={() => setShowAssignMembersModal(false)}>
           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header">
               <h2>Assign Members</h2>
               <button className="close-btn" onClick={() => setShowAssignMembersModal(false)}>
                 <X size={20} />
               </button>
             </div>
             <div className="modal-body">
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {users.map(u => (
                   <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', border: '1px solid #eee', borderRadius: '8px' }}>
                     <input
                       type="checkbox"
                       checked={orgMembers[selectedOrgId]?.includes(u.id)}
                       onChange={() => toggleMemberAssignment(u.id)}
                     />
                     <div style={{ fontSize: '16px' }}>{u.full_name || u.email}</div>
                   </label>
                 ))}
               </div>
             </div>
             <div className="modal-footer">
               <button className="btn-secondary" onClick={() => setShowAssignMembersModal(false)}>Done</button>
             </div>
           </div>
         </div>
       )}

       {/* Assign Projects Modal */}
       {showAssignProjectsModal && selectedOrgId && (
         <div className="modal-overlay" onClick={() => setShowAssignProjectsModal(false)}>
           <div className="modal-content" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header">
               <h2>Assign Projects</h2>
               <button className="close-btn" onClick={() => setShowAssignProjectsModal(false)}>
                 <X size={20} />
               </button>
             </div>
             <div className="modal-body">
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {projectsForAssign.map(p => (
                   <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', border: '1px solid #eee', borderRadius: '8px' }}>
                     <input
                       type="checkbox"
                       checked={orgProjects[selectedOrgId]?.includes(p.id)}
                       onChange={() => toggleProjectAssignment(p.id)}
                     />
                     <div style={{ fontSize: '16px' }}>{p.name}</div>
                     <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>{p.organization_id ? 'Assigned' : ''}</div>
                   </label>
                 ))}
               </div>
             </div>
             <div className="modal-footer">
               <button className="btn-secondary" onClick={() => setShowAssignProjectsModal(false)}>Done</button>
             </div>
           </div>
         </div>
       )}

{/* Create/Edit Modal */}
      {(showCreateModal || editingOrg) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingOrg ? 'Edit Organization' : 'Create Organization'}</h2>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="org-name">Organization Name *</label>
                <input
                  id="org-name"
                  type="text"
                  placeholder="e.g., Ojohsy Org"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="org-description">Description</label>
                <textarea
                  id="org-description"
                  placeholder="Optional description for this organization"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={editingOrg ? handleUpdateOrganization : handleCreateOrganization}
              >
                <Check size={18} />
                {editingOrg ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

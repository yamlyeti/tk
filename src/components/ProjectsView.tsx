import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import { ProjectTeamManagement } from './ProjectTeamManagement';
import { EditProjectModal } from './EditProjectModal';
import type { Project, TimeEntry, Organization } from '../types';
import './ProjectsView.css';

export const ProjectsView = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [githubLink, setGithubLink] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [managingTeam, setManagingTeam] = useState<{ id: string; name: string } | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('👤 ProjectsView - User state:', {
      isLoggedIn: !!user,
      userId: user?.id,
      email: user?.email
    });
  }, [user]);

  useEffect(() => {
    fetchProjects();
    fetchOrganizations();
    fetchEntries();
  }, []);

  const fetchOrganizations = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('*')
      .order('name');
    
    if (data) {
      setOrganizations(data);
    }
  };

  const fetchProjects = async () => {
    console.log('📂 Fetching projects...');
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('❌ Failed to fetch projects:', error);
    } else {
      console.log(`✅ Fetched ${data?.length || 0} projects`);
    }
    setProjects(data || []);
  };

  const fetchEntries = async () => {
    const { data } = await supabase.from('time_entries').select('*');
    setEntries(data || []);
  };

  const addProject = async () => {
    if (!user) {
      console.error('❌ Cannot create project: No user logged in');
      alert('Error: You must be logged in to create a project.');
      return;
    }
    
    if (!name.trim()) {
      alert('Please enter a project name.');
      return;
    }
    
    setLoading(true);
    console.log('🚀 Creating project:', { 
      user_id: user.id, 
      name: name.trim(),
      tags: tags.trim() || null,
      description: description.trim() || null,
      github_link: githubLink.trim() || null,
      organization_id: selectedOrgId || null,
    });
    
    const { data, error } = await supabase.from('projects').insert({
      user_id: user.id,
      name: name.trim(),
      tags: tags.trim() || null,
      description: description.trim() || null,
      github_link: githubLink.trim() || null,
      organization_id: selectedOrgId || null,
    }).select();
    
    if (error) {
      console.error('❌ Failed to create project:', error);
      alert(`Failed to create project: ${error.message}`);
    } else {
      console.log('✅ Project created successfully:', data);
      setName('');
      setTags('');
      setDescription('');
      setGithubLink('');
      setSelectedOrgId('');
      setShowCreateForm(false);
      fetchProjects();
    }
    setLoading(false);
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    console.log('🗑️ Deleting project:', id);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      console.error('❌ Failed to delete project:', error);
      alert(`Failed to delete project: ${error.message}`);
    } else {
      console.log('✅ Project deleted successfully');
      fetchProjects();
    }
  };

  const updateProject = async (
    id: string,
    name: string,
    tags: string,
    description: string,
    githubLink: string,
    organizationId: string | null
  ) => {
    console.log('✏️ Updating project:', id, { organizationId });
    const { error } = await supabase
      .from('projects')
      .update({
        name: name.trim(),
        tags: tags.trim() || null,
        description: description.trim() || null,
        github_link: githubLink.trim() || null,
        organization_id: organizationId || null,
      })
      .eq('id', id);

    if (error) {
      console.error('❌ Failed to update project:', error);
      alert(`Failed to update project: ${error.message}`);
      return false;
    } else {
      console.log('✅ Project updated successfully');
      fetchProjects();
      return true;
    }
  };

  const getProjectTime = (projectId: string) => {
    return entries
      .filter((e) => e.project_id === projectId && e.duration)
      .reduce((sum, e) => sum + (e.duration || 0), 0);
  };

  const getProjectEntryCount = (projectId: string) => {
    return entries.filter((e) => e.project_id === projectId).length;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="projects-container">
      <div className="projects-header-row">
        <h2>Projects</h2>
        <button
          className="new-project-toggle"
          onClick={() => setShowCreateForm((prev) => !prev)}
        >
          {showCreateForm ? '✕ Cancel' : '+ New Project'}
        </button>
      </div>

      {showCreateForm && (
        <div className="add-project-section">
          <div className="add-project-form">
            <div className="form-group">
              <label>Organization (Optional)</label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
              >
                <option value="">No Organization (Personal Project)</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Project Name *</label>
              <input
                type="text"
                placeholder="Enter project name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Tags</label>
              <input
                type="text"
                placeholder="Comma separated (e.g., web, frontend, react)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                placeholder="Brief description of the project"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="form-group">
              <label>GitHub Link</label>
              <input
                type="url"
                placeholder="https://github.com/username/repo"
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
              />
            </div>

            <button
              onClick={addProject}
              disabled={loading || !name.trim()}
              className="add-project-button"
            >
              {loading ? 'Creating...' : '+ Add Project'}
            </button>
          </div>
        </div>
      )}

      <div className="projects-section">
        <h3>All Projects ({projects.length})</h3>
        {projects.length === 0 ? (
          <p className="no-projects">No projects yet. Create your first project above!</p>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => {
              const totalTime = getProjectTime(project.id);
              const entryCount = getProjectEntryCount(project.id);
              const organization = organizations.find(o => o.id === project.organization_id);
              
              return (
                <div key={project.id} className="project-card">
                  <div className="drag-handle">⋮⋮</div>
                  {organization && (
                    <div className="project-org-badge">
                      🏢 {organization.name}
                    </div>
                  )}
                  <div className="project-header">
                    <h4>{project.name}</h4>
                    <div className="project-actions">
                      <button
                        onClick={() => setEditingProject(project)}
                        className="edit-project-button"
                        title="Edit project"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => setManagingTeam({ id: project.id, name: project.name })}
                        className="manage-team-button"
                        title="Manage team"
                      >
                        👥
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="delete-project-button"
                        title="Delete project"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  
                  {project.description && (
                    <p className="project-description">{project.description}</p>
                  )}
                  
                  {project.tags && (
                    <div className="project-tags-display">
                      {project.tags.split(',').map((tag, i) => (
                        <span key={i} className="tag">{tag.trim()}</span>
                      ))}
                    </div>
                  )}
                  
                  {project.github_link && (
                    <a 
                      href={project.github_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="github-link"
                    >
                      🔗 View on GitHub
                    </a>
                  )}
                  
                  <div className="project-stats">
                    <div className="stat">
                      <span className="stat-label">Total Time:</span>
                      <span className="stat-value">{formatTime(totalTime)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Entries:</span>
                      <span className="stat-value">{entryCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {managingTeam && (
        <ProjectTeamManagement
          projectId={managingTeam.id}
          projectName={managingTeam.name}
          onClose={() => setManagingTeam(null)}
        />
      )}

      {editingProject && (
        <EditProjectModal
          project={editingProject}
          onSave={updateProject}
          onClose={() => setEditingProject(null)}
        />
      )}
    </div>
  );
};

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';
import './EditProjectModal.css';

interface EditProjectModalProps {
  project: Project;
  onSave: (
    id: string,
    name: string,
    tags: string,
    description: string,
    githubLink: string,
    organizationId: string | null
  ) => Promise<boolean>;
  onClose: () => void;
}

export const EditProjectModal = ({ project, onSave, onClose }: EditProjectModalProps) => {
  const [name, setName] = useState(project.name);
  const [tags, setTags] = useState(project.tags || '');
  const [description, setDescription] = useState(project.description || '');
  const [githubLink, setGithubLink] = useState(project.github_link || '');
  const [organizationId, setOrganizationId] = useState<string | null>(project.organization_id || null);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchOrgs = async () => {
      const { data } = await supabase.from('organizations').select('id,name').order('name');
      if (data) setOrganizations(data);
    };
    fetchOrgs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Project name is required');
      return;
    }

    setLoading(true);
    const success = await onSave(project.id, name, tags, description, githubLink, organizationId);
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="edit-project-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>✏️ Edit Project</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              placeholder="Enter project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Organization (Optional)</label>
            <select
              value={organizationId || ''}
              onChange={(e) => setOrganizationId(e.target.value || null)}
            >
              <option value="">No Organization (Personal Project)</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
            <small>Select or remove an organization assignment</small>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <input
              type="text"
              placeholder="Comma separated (e.g., web, frontend, react)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <small>Press comma or enter to separate tags</small>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="Brief description of the project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
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

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !name.trim()} className="primary">
              {loading ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

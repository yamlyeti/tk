import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';
import './Templates.css';

interface Template {
  id: string;
  name: string;
  description: string;
  tags: string;
  projectId: string;
  isFavorite: boolean;
}

interface TemplatesProps {
  onStartFromTemplate: (description: string, tags: string, projectId: string) => void;
}

export function Templates({ onStartFromTemplate }: TemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    tags: '',
    projectId: '',
    isFavorite: false,
  });

  useEffect(() => {
    loadTemplates();
    loadProjects();
  }, []);

  const loadTemplates = () => {
    const saved = localStorage.getItem('taskTemplates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    }
  };

  const loadProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('name');
    setProjects(data || []);
  };

  const saveTemplates = (newTemplates: Template[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('taskTemplates', JSON.stringify(newTemplates));
  };

  const addTemplate = () => {
    if (!newTemplate.name || !newTemplate.description) return;

    const template: Template = {
      id: Date.now().toString(),
      ...newTemplate,
    };

    saveTemplates([...templates, template]);
    setNewTemplate({ name: '', description: '', tags: '', projectId: '', isFavorite: false });
    setShowAddForm(false);
  };

  const deleteTemplate = (id: string) => {
    if (!confirm('Delete this template?')) return;
    saveTemplates(templates.filter((t) => t.id !== id));
  };

  const toggleFavorite = (id: string) => {
    saveTemplates(
      templates.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  const startFromTemplate = (template: Template) => {
    onStartFromTemplate(template.description, template.tags, template.projectId);
  };

  const favoriteTemplates = templates.filter((t) => t.isFavorite);
  const regularTemplates = templates.filter((t) => !t.isFavorite);

  return (
    <div className="templates-container">
      <div className="templates-header">
        <h3>📝 Task Templates</h3>
        <button onClick={() => setShowAddForm(!showAddForm)} className="add-template-btn">
          {showAddForm ? '✕ Cancel' : '+ New Template'}
        </button>
      </div>

      {showAddForm && (
        <div className="template-form">
          <input
            type="text"
            placeholder="Template name (e.g., Daily Standup)"
            value={newTemplate.name}
            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
            className="template-input"
          />
          <input
            type="text"
            placeholder="Task description"
            value={newTemplate.description}
            onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
            className="template-input"
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={newTemplate.tags}
            onChange={(e) => setNewTemplate({ ...newTemplate, tags: e.target.value })}
            className="template-input"
          />
          <select
            value={newTemplate.projectId}
            onChange={(e) => setNewTemplate({ ...newTemplate, projectId: e.target.value })}
            className="template-select"
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button onClick={addTemplate} className="save-template-btn">
            💾 Save Template
          </button>
        </div>
      )}

      {favoriteTemplates.length > 0 && (
        <div className="templates-section">
          <h4>⭐ Favorites</h4>
          <div className="templates-list">
            {favoriteTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                projects={projects}
                onStart={() => startFromTemplate(template)}
                onToggleFavorite={() => toggleFavorite(template.id)}
                onDelete={() => deleteTemplate(template.id)}
              />
            ))}
          </div>
        </div>
      )}

      {regularTemplates.length > 0 && (
        <div className="templates-section">
          <h4>📋 All Templates</h4>
          <div className="templates-list">
            {regularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                projects={projects}
                onStart={() => startFromTemplate(template)}
                onToggleFavorite={() => toggleFavorite(template.id)}
                onDelete={() => deleteTemplate(template.id)}
              />
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && !showAddForm && (
        <div className="no-templates">
          <p>No templates yet. Create one to save time on recurring tasks!</p>
        </div>
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  projects: Project[];
  onStart: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}

function TemplateCard({ template, projects, onStart, onToggleFavorite, onDelete }: TemplateCardProps) {
  const project = projects.find((p) => p.id === template.projectId);

  return (
    <div className="template-card">
      <div className="drag-handle">⋮⋮</div>
      <div className="template-content">
        <div className="template-name">{template.name}</div>
        <div className="template-description">{template.description}</div>
        {template.tags && <div className="template-tags">{template.tags}</div>}
        {project && <div className="template-project">📁 {project.name}</div>}
      </div>
      <div className="template-actions">
        <button onClick={onToggleFavorite} className="template-favorite-btn" title="Toggle favorite">
          {template.isFavorite ? '⭐' : '☆'}
        </button>
        <button onClick={onStart} className="template-start-btn">
          ▶ Start
        </button>
        <button onClick={onDelete} className="template-delete-btn" title="Delete template">
          🗑
        </button>
      </div>
    </div>
  );
}

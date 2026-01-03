import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';
import './ProjectSelect.css';

interface ProjectSelectProps {
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ProjectSelect({ value, onChange, disabled = false }: ProjectSelectProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('name');
    setProjects(data || []);
  };
  
  return (
    <select 
      value={value || ''} 
      onChange={e => onChange(e.target.value)} 
      disabled={disabled} 
      className="project-select"
    >
      <option value="">Select Project (optional)</option>
      {projects.length === 0 && <option disabled>No projects yet - create one first!</option>}
      {projects.map(p => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

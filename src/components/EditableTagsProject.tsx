import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ProjectSelect } from './ProjectSelect';
import { Autocomplete } from './Autocomplete';
import type { TimeEntry, Project } from '../types';

interface EditableTagsProps {
  entry: TimeEntry;
  onUpdate: () => void;
}

interface EditableProjectProps {
  entry: TimeEntry;
  projects: Project[];
  onUpdate: () => void;
}

export function EditableTags({ entry, onUpdate }: EditableTagsProps) {
  const [tags, setTags] = useState(entry.tags || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingTags, setExistingTags] = useState<string[]>([]);

  useEffect(() => {
    if (editing) {
      fetchExistingTags();
    }
  }, [editing]);

  const fetchExistingTags = async () => {
    const { data } = await supabase
      .from('time_entries')
      .select('tags')
      .not('tags', 'is', null);

    if (data) {
      const allTags = new Set<string>();
      data.forEach((entry: { tags: string }) => {
        if (entry.tags) {
          entry.tags.split(',').forEach((tag: string) => {
            const trimmedTag = tag.trim();
            if (trimmedTag) allTags.add(trimmedTag);
          });
        }
      });
      setExistingTags(Array.from(allTags).sort());
    }
  };
  
  const save = async () => {
    setSaving(true);
    setError('');
    console.log('Saving tags:', { entryId: entry.id, tags: tags.trim() });
    
    const { data, error: updateError } = await supabase
      .from('time_entries')
      .update({ tags: tags.trim() || null })
      .eq('id', entry.id)
      .select();
    
    if (updateError) {
      console.error('Error updating tags:', updateError);
      setError(updateError.message);
    } else {
      console.log('Tags updated successfully:', data);
      setEditing(false);
      onUpdate();
    }
    setSaving(false);
  };
  
  if (editing) {
    return (
      <div className="editable-field">
        <Autocomplete
          value={tags}
          onChange={setTags}
          suggestions={existingTags}
          placeholder="Enter tags"
          disabled={saving}
          multiple={true}
        />
        <button onClick={save} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} disabled={saving} className="cancel-btn">Cancel</button>
        {error && <span style={{ color: 'red', fontSize: '0.8rem' }}>{error}</span>}
      </div>
    );
  }
  
  return (
    <span className="entry-tags clickable" onClick={() => setEditing(true)} title="Click to edit">
      {entry.tags || 'Add tags'}
    </span>
  );
}

export function EditableProject({ entry, projects, onUpdate }: EditableProjectProps) {
  const [projectId, setProjectId] = useState(entry.project_id || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const save = async () => {
    setSaving(true);
    setError('');
    console.log('Saving project:', { entryId: entry.id, projectId: projectId || null });
    
    const { data, error: updateError } = await supabase
      .from('time_entries')
      .update({ project_id: projectId || null })
      .eq('id', entry.id)
      .select();
    
    if (updateError) {
      console.error('Error updating project:', updateError);
      setError(updateError.message);
    } else {
      console.log('Project updated successfully:', data);
      setEditing(false);
      onUpdate();
    }
    setSaving(false);
  };
  
  const projectName = projects.find(p => p.id === entry.project_id)?.name || 'No Project';
  
  if (editing) {
    return (
      <div className="editable-field">
        <ProjectSelect value={projectId} onChange={setProjectId} />
        <button onClick={save} disabled={saving} className="save-btn">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={() => setEditing(false)} disabled={saving} className="cancel-btn">Cancel</button>
        {error && <span style={{ color: 'red', fontSize: '0.8rem' }}>{error}</span>}
      </div>
    );
  }
  
  return (
    <span className="entry-project clickable" onClick={() => setEditing(true)} title="Click to edit">
      {projectName}
    </span>
  );
}

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/useAuth';
import type { Project } from '../types';
import './ManualTimeEntry.css';

interface ManualTimeEntryProps {
  projects: Project[];
  onSuccess: () => void;
  onClose: () => void;
}

export const ManualTimeEntry = ({ projects, onSuccess, onClose }: ManualTimeEntryProps) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [projectId, setProjectId] = useState('');
  const [tags, setTags] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('');
  const [entryMode, setEntryMode] = useState<'duration' | 'timerange'>('duration');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !description.trim()) {
      alert('Please enter a description');
      return;
    }

    setLoading(true);

    try {
      let startDateTime: string;
      let endDateTime: string;
      let durationSeconds: number;

      if (entryMode === 'duration') {
        // Simple hour entry: "I worked 3 hours on 1/1/26"
        const totalHours = parseFloat(hours || '0');
        const totalMinutes = parseFloat(minutes || '0');
        
        if (totalHours === 0 && totalMinutes === 0) {
          alert('Please enter hours or minutes');
          setLoading(false);
          return;
        }

        durationSeconds = Math.round((totalHours * 3600) + (totalMinutes * 60));
        
        // Set start time to beginning of selected date with the startTime
        startDateTime = `${date}T${startTime}:00`;
        
        // Calculate end time based on duration
        const start = new Date(startDateTime);
        const end = new Date(start.getTime() + (durationSeconds * 1000));
        endDateTime = end.toISOString();
        
      } else {
        // Time range entry: "I worked from 9am to 5pm"
        if (!endTime) {
          alert('Please enter an end time');
          setLoading(false);
          return;
        }

        startDateTime = `${date}T${startTime}:00`;
        endDateTime = `${date}T${endTime}:00`;
        
        const start = new Date(startDateTime);
        const end = new Date(endDateTime);
        
        if (end <= start) {
          alert('End time must be after start time');
          setLoading(false);
          return;
        }
        
        durationSeconds = Math.round((end.getTime() - start.getTime()) / 1000);
      }

      const { error } = await supabase.from('time_entries').insert({
        user_id: user.id,
        project_id: projectId || null,
        description: description.trim(),
        notes: notes.trim() || null,
        tags: tags.trim() || null,
        start_time: startDateTime,
        end_time: endDateTime,
        duration: durationSeconds,
        paused_duration: 0,
        is_paused: false,
      });

      if (error) {
        console.error('Error adding manual entry:', error);
        alert(`Failed to add entry: ${error.message}`);
      } else {
        console.log('✅ Manual entry added successfully');
        onSuccess();
        onClose();
      }
    } catch (err) {
      console.error('Error:', err);
      alert('Failed to add entry');
    }

    setLoading(false);
  };

  const calculateDuration = () => {
    if (entryMode === 'duration') {
      const h = parseFloat(hours || '0');
      const m = parseFloat(minutes || '0');
      return `${h}h ${m}m`;
    } else if (startTime && endTime) {
      const start = new Date(`${date}T${startTime}:00`);
      const end = new Date(`${date}T${endTime}:00`);
      if (end > start) {
        const diff = (end.getTime() - start.getTime()) / 1000;
        const h = Math.floor(diff / 3600);
        const m = Math.floor((diff % 3600) / 60);
        return `${h}h ${m}m`;
      }
    }
    return '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="manual-entry-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Add Manual Time Entry</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Description *</label>
            <input
              type="text"
              placeholder="What did you work on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              placeholder="Additional notes or details (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <input
              type="text"
              placeholder="Comma separated (e.g., meeting, client)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="entry-mode-toggle">
            <button
              type="button"
              className={entryMode === 'duration' ? 'active' : ''}
              onClick={() => setEntryMode('duration')}
            >
              ⏱️ Duration
            </button>
            <button
              type="button"
              className={entryMode === 'timerange' ? 'active' : ''}
              onClick={() => setEntryMode('timerange')}
            >
              📅 Time Range
            </button>
          </div>

          {entryMode === 'duration' ? (
            <>
              <div className="time-inputs">
                <div className="form-group">
                  <label>Hours</label>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    placeholder="0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Minutes</label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0"
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Start Time (optional)</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <small>Used to calculate end time</small>
              </div>
            </>
          ) : (
            <div className="time-inputs">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>End Time *</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {calculateDuration() && (
            <div className="duration-preview">
              <strong>Total Duration:</strong> {calculateDuration()}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className="primary">
              {loading ? 'Adding...' : '✅ Add Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

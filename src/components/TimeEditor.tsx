import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeEntry } from '../types';
import './TimeEditor.css';

interface TimeEditorProps {
  entry: TimeEntry;
  onUpdate: () => void;
}

export function TimeEditor({ entry, onUpdate }: TimeEditorProps) {
  const [editing, setEditing] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openEditor = () => {
    // Convert timestamps to datetime-local format
    const start = new Date(entry.start_time);
    const startLocal = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setStartTime(startLocal);

    if (entry.end_time) {
      const end = new Date(entry.end_time);
      const endLocal = new Date(end.getTime() - end.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEndTime(endLocal);
    } else {
      setEndTime('');
    }

    setEditing(true);
  };

  const save = async () => {
    if (!startTime) {
      setError('Start time is required');
      return;
    }

    setSaving(true);
    setError('');

    const start = new Date(startTime).getTime();
    const end = endTime ? new Date(endTime).getTime() : null;

    let duration = null;
    if (end) {
      duration = Math.floor((end - start) / 1000);
      if (duration < 0) {
        setError('End time must be after start time');
        setSaving(false);
        return;
      }
    }

    const { error: updateError } = await supabase
      .from('time_entries')
      .update({
        start_time: new Date(startTime).toISOString(),
        end_time: endTime ? new Date(endTime).toISOString() : null,
        duration: duration,
      })
      .eq('id', entry.id);

    if (updateError) {
      console.error('Error updating time:', updateError);
      setError(updateError.message);
    } else {
      setEditing(false);
      onUpdate();
    }
    setSaving(false);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (editing) {
    return (
      <div className="time-editor">
        <div className="time-editor-fields">
          <div className="time-field">
            <label>Start Time</label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="time-field">
            <label>End Time</label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
        {error && <div className="time-editor-error">{error}</div>}
        <div className="time-editor-actions">
          <button onClick={save} disabled={saving} className="save-btn">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} disabled={saving} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="time-display">
      <div className="time-info">
        <div><strong>Start:</strong> {formatDateTime(entry.start_time)}</div>
        {entry.end_time && (
          <div><strong>End:</strong> {formatDateTime(entry.end_time)}</div>
        )}
        <div><strong>Duration:</strong> {formatDuration(entry.duration)}</div>
      </div>
      <button onClick={openEditor} className="edit-time-btn" title="Edit times">
        ✏️ Edit
      </button>
    </div>
  );
}

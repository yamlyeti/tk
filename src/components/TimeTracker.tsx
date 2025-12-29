import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import type { TimeEntry } from '../types';
import './TimeTracker.css';

export const TimeTracker = () => {
  const { user, signOut } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error loading entries:', error);
        return;
      }

      setEntries(data || []);
      const active = data?.find((entry) => !entry.end_time);
      setActiveEntry(active || null);
      if (active) {
        const start = new Date(active.start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }
    };

    fetchEntries();
  }, [user]);

  useEffect(() => {
    let interval: number | undefined;
    if (activeEntry) {
      interval = window.setInterval(() => {
        const start = new Date(activeEntry.start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeEntry]);

  const loadEntries = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (error) {
      console.error('Error loading entries:', error);
      return;
    }

    setEntries(data || []);
    const active = data?.find((entry) => !entry.end_time);
    setActiveEntry(active || null);
    if (active) {
      const start = new Date(active.start_time).getTime();
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    }
  };

  const startTimer = async () => {
    if (!user || !description.trim()) return;

    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        description: description.trim(),
        start_time: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting timer:', error);
      setError('Error starting timer. Please make sure the database is set up correctly.');
    } else {
      setActiveEntry(data);
      setDescription('');
      setElapsedTime(0);
      loadEntries();
    }
    setLoading(false);
  };

  const stopTimer = async () => {
    if (!activeEntry) return;

    setLoading(true);
    const endTime = new Date().toISOString();
    const startTime = new Date(activeEntry.start_time).getTime();
    // eslint-disable-next-line react-hooks/purity
    const duration = Math.floor((Date.now() - startTime) / 1000);

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime,
        duration: duration,
      })
      .eq('id', activeEntry.id);

    if (error) {
      console.error('Error stopping timer:', error);
    } else {
      setActiveEntry(null);
      setElapsedTime(0);
      loadEntries();
    }
    setLoading(false);
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);

    if (error) {
      console.error('Error deleting entry:', error);
    } else {
      loadEntries();
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '00:00:00';
    return formatTime(seconds);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="tracker-container">
      <div className="tracker-header">
        <h1>Time Keeping System</h1>
        <div className="user-info">
          <span>{user?.email}</span>
          <button onClick={signOut} className="signout-button">
            Sign Out
          </button>
        </div>
      </div>

      <div className="timer-section">
        <div className="timer-input">
          <input
            type="text"
            placeholder="What are you working on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!!activeEntry}
          />
          {activeEntry ? (
            <div className="active-timer">
              <div className="timer-display">{formatTime(elapsedTime)}</div>
              <button onClick={stopTimer} disabled={loading} className="stop-button">
                Stop
              </button>
            </div>
          ) : (
            <button
              onClick={startTimer}
              disabled={loading || !description.trim()}
              className="start-button"
            >
              Start
            </button>
          )}
        </div>
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError('')} className="error-close">×</button>
          </div>
        )}
        {activeEntry && (
          <div className="active-description">
            <strong>Working on:</strong> {activeEntry.description}
          </div>
        )}
      </div>

      <div className="entries-section">
        <h2>Time Entries</h2>
        {entries.length === 0 ? (
          <p className="no-entries">No time entries yet. Start tracking your time!</p>
        ) : (
          <div className="entries-list">
            {entries.map((entry) => (
              <div key={entry.id} className="entry-card">
                <div className="entry-header">
                  <h3>{entry.description}</h3>
                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="delete-button"
                    disabled={!entry.end_time}
                  >
                    Delete
                  </button>
                </div>
                <div className="entry-details">
                  <div className="entry-time">
                    <strong>Start:</strong> {formatDate(entry.start_time)}
                  </div>
                  {entry.end_time && (
                    <div className="entry-time">
                      <strong>End:</strong> {formatDate(entry.end_time)}
                    </div>
                  )}
                  <div className="entry-duration">
                    <strong>Duration:</strong> {formatDuration(entry.duration)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

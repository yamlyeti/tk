import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/useAuth';
import { supabase } from '../lib/supabase';
import type { TimeEntry, Project } from '../types';
import { EditableTags, EditableProject } from './EditableTagsProject';
import { ProjectSelect } from './ProjectSelect';
import { TagsInput } from './TagsInput';
import { TimeEditor } from './TimeEditor';
import { KeyboardShortcuts } from './KeyboardShortcuts';
import { Goals } from './Goals';
import { PomodoroTimer } from './PomodoroTimer';
import { ManualTimeEntry } from './ManualTimeEntry';
import { useTimerNotifications } from '../hooks/useTimerNotifications';
import { useIdleDetection, IdleDialog } from '../hooks/useIdleDetection';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import './TimeTracker.css';

interface TimeTrackerProps {
  showManualEntry?: boolean;
  onManualEntryClose?: () => void;
}

export const TimeTracker = ({ showManualEntry: externalShowManualEntry, onManualEntryClose }: TimeTrackerProps) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [projectId, setProjectId] = useState('');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string>('');
  const [entryOrder, setEntryOrder] = useState<string[]>([]);
  const [cardOrder, setCardOrder] = useState<string[]>(['track-time', 'goals', 'pomodoro']);
  const [entriesExpanded, setEntriesExpanded] = useState(false);
  const [internalShowManualEntry, setInternalShowManualEntry] = useState(false);
  const showManualEntry = externalShowManualEntry ?? internalShowManualEntry;
  const setShowManualEntry = (val: boolean) => {
    setInternalShowManualEntry(val);
    if (!val) onManualEntryClose?.();
  };

  const shortcuts = [
    {
      key: 's',
      altKey: true,
      handler: () => {
        if (activeEntry) {
          if (activeEntry.is_paused) {
            resumeTimer();
          } else {
            stopTimer();
          }
        } else if (description.trim()) {
          startTimer();
        }
      },
      description: 'Start/Stop Timer',
    },
    {
      key: 'p',
      altKey: true,
      handler: () => {
        if (activeEntry) {
          if (activeEntry.is_paused) {
            resumeTimer();
          } else {
            pauseTimer();
          }
        }
      },
      description: 'Pause/Resume Timer',
    },
    {
      key: 'n',
      altKey: true,
      handler: () => {
        const descInput = document.querySelector('.description-input') as HTMLInputElement;
        if (descInput) {
          descInput.focus();
          descInput.select();
        }
      },
      description: 'New Entry (Focus Description)',
    },
  ];

  // Timer notifications
  useTimerNotifications({
    isTimerActive: !!activeEntry && !activeEntry.is_paused,
    elapsedSeconds: elapsedTime,
  });

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
    if (!entryOrder.length && data && data.length > 0) {
      setEntryOrder(data.map(e => e.id));
    }
    const active = data?.find((entry) => !entry.end_time);
    setActiveEntry(active || null);
    if (active) {
      const start = new Date(active.start_time).getTime();
      const now = Date.now();
      setElapsedTime(Math.floor((now - start) / 1000));
    }
  };

  const loadProjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    setProjects(data || []);
  };

  useEffect(() => {
    if (!user) return;
    loadEntries();
    loadProjects();
  }, [user]);

  useEffect(() => {
    let interval: number | undefined;
    if (activeEntry && !activeEntry.is_paused) {
      interval = window.setInterval(() => {
        const start = new Date(activeEntry.start_time).getTime();
        const now = Date.now();
        const pausedDuration = activeEntry.paused_duration || 0;
        setElapsedTime(Math.floor((now - start) / 1000) - pausedDuration);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeEntry]);

  const startTimer = async () => {
    if (!user || !description.trim()) return;

    setLoading(true);
    setError('');
    
    const startTime = customStart ? new Date(customStart).toISOString() : new Date().toISOString();
    const endTime = customEnd ? new Date(customEnd).toISOString() : null;
    
    let duration = null;
    if (customStart && customEnd) {
      const start = new Date(customStart).getTime();
      const end = new Date(customEnd).getTime();
      duration = Math.floor((end - start) / 1000);
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        user_id: user.id,
        description: description.trim(),
        notes: notes.trim() || null,
        tags: tags.trim() || null,
        project_id: projectId || null,
        start_time: startTime,
        end_time: endTime,
        duration: duration,
      })
      .select()
      .single();

    if (error) {
      console.error('Error starting timer:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setError(`Error: ${error.message || 'Database setup issue. Check console for details.'}`);
    } else {
      if (!endTime) {
        setActiveEntry(data);
      }
      setDescription('');
      setNotes('');
      setTags('');
      setProjectId('');
      setCustomStart('');
      setCustomEnd('');
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
    const pausedDuration = activeEntry.paused_duration || 0;
    const duration = Math.floor((Date.now() - startTime) / 1000) - pausedDuration;

    const { error } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime,
        duration: duration,
        is_paused: false,
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

  const pauseTimer = async () => {
    if (!activeEntry || activeEntry.is_paused) return;

    setLoading(true);
    const { error } = await supabase
      .from('time_entries')
      .update({
        is_paused: true,
        pause_start_time: new Date().toISOString(),
      })
      .eq('id', activeEntry.id);

    if (error) {
      console.error('Error pausing timer:', error);
    } else {
      loadEntries();
    }
    setLoading(false);
  };

  const resumeTimer = async () => {
    if (!activeEntry || !activeEntry.is_paused) return;

    setLoading(true);
    
    // Calculate how long it was paused
    const pauseStart = activeEntry.pause_start_time ? new Date(activeEntry.pause_start_time).getTime() : Date.now();
    const pauseDuration = Math.floor((Date.now() - pauseStart) / 1000);
    const totalPausedDuration = (activeEntry.paused_duration || 0) + pauseDuration;

    const { error } = await supabase
      .from('time_entries')
      .update({
        is_paused: false,
        pause_start_time: null,
        paused_duration: totalPausedDuration,
      })
      .eq('id', activeEntry.id);

    if (error) {
      console.error('Error resuming timer:', error);
    } else {
      loadEntries();
    }
    setLoading(false);
  };

  // Idle detection (must be after pauseTimer and resumeTimer are defined)
  const {
    showIdleDialog,
    idleDuration,
    handleKeepTime,
    handleDiscardTime,
  } = useIdleDetection({
    isTimerActive: !!activeEntry && !activeEntry.is_paused,
    onPauseTimer: pauseTimer,
    onResumeTimer: resumeTimer,
  });

  const deleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    const { error } = await supabase.from('time_entries').delete().eq('id', id);

    if (error) {
      console.error('Error deleting entry:', error);
    } else {
      setEntryOrder(prev => prev.filter(entryId => entryId !== id));
      loadEntries();
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    if (result.droppableId === 'entries-list') {
      const newOrder = Array.from(entryOrder);
      const [removed] = newOrder.splice(result.source.index, 1);
      newOrder.splice(result.destination.index, 0, removed);
      setEntryOrder(newOrder);
    } else if (result.droppableId === 'main-cards') {
      const newOrder = Array.from(cardOrder);
      const [removed] = newOrder.splice(result.source.index, 1);
      newOrder.splice(result.destination.index, 0, removed);
      setCardOrder(newOrder);
    }
  };

  const renderCard = (cardId: string) => {
    switch (cardId) {
      case 'track-time':
        return (
          <div key={cardId} className="timer-section">
            <h2>Track Time</h2>
            <div className="timer-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="What are you working on? *"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!!activeEntry}
                  className="description-input"
                />
              </div>
              
              <div className="form-row">
                <textarea
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!!activeEntry}
                  className="notes-input"
                  rows={2}
                />
              </div>
              
              <div className="form-row">
                <TagsInput
                  value={tags}
                  onChange={setTags}
                  disabled={!!activeEntry}
                />
                <ProjectSelect value={projectId} onChange={setProjectId} disabled={!!activeEntry} />
              </div>
              
              <div className="form-row">
                <div className="datetime-group">
                  <label>Start Time (optional)</label>
                  <input
                    type="datetime-local"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    disabled={!!activeEntry}
                  />
                </div>
                <div className="datetime-group">
                  <label>End Time (optional)</label>
                  <input
                    type="datetime-local"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    disabled={!!activeEntry}
                  />
                </div>
              </div>
              
              {!activeEntry && (
                <button
                  onClick={startTimer}
                  disabled={loading || !description.trim()}
                  className="start-button"
                >
                  ▶ Start Timer
                </button>
              )}
            </div>
            
            {error && (
              <div className="error-banner">
                {error}
                <button onClick={() => setError('')} className="error-close">×</button>
              </div>
            )}
          </div>
        );
      case 'goals':
        return <Goals key={cardId} />;
      case 'pomodoro':
        return <PomodoroTimer key={cardId} />;
      default:
        return null;
    }
  };

  const orderedEntries = entryOrder
    .map(id => entries.find(e => e.id === id))
    .filter((e): e is TimeEntry => e !== undefined);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="tracker-container">
      <KeyboardShortcuts shortcuts={shortcuts} />
      
      <div className="tracker-header">
      </div>

      <IdleDialog
        show={showIdleDialog}
        idleDuration={idleDuration}
        onKeepTime={handleKeepTime}
        onDiscardTime={handleDiscardTime}
      />

      {activeEntry && (
        <div className="active-timer-banner">
          <div className="timer-display">
            {formatTime(elapsedTime)}
            {activeEntry.is_paused && <span className="paused-indicator">⏸ PAUSED</span>}
          </div>
          <p className="active-task">Working on: <strong>{activeEntry.description}</strong></p>
          <div className="timer-controls">
            {activeEntry.is_paused ? (
              <button onClick={resumeTimer} disabled={loading} className="resume-button">
                ▶ Resume
              </button>
            ) : (
              <button onClick={pauseTimer} disabled={loading} className="pause-button">
                ⏸ Pause
              </button>
            )}
            <button onClick={stopTimer} disabled={loading} className="stop-button">
              ⏹ Stop
            </button>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="main-cards">
          {(provided) => (
            <div 
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="cards-container"
            >
              {cardOrder.map((cardId, index) => (
                <Draggable key={cardId} draggableId={cardId} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`draggable-card-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
                    >
                      <div 
                        {...provided.dragHandleProps}
                        className="card-drag-handle"
                        title="Drag to reorder"
                      >
                        ⋮⋮
                      </div>
                      {renderCard(cardId)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>

        <div className="entries-section">
          <button
            className="entries-toggle-header"
            onClick={() => setEntriesExpanded(prev => !prev)}
          >
            <h2 style={{ margin: 0 }}>Recent Entries {entries.length > 0 && `(${entries.length})`}</h2>
            <span className="entries-toggle-chevron">{entriesExpanded ? '▲' : '▼'}</span>
          </button>
          {entriesExpanded && entries.length === 0 ? (
            <p className="no-entries">No time entries yet. Start tracking your time!</p>
          ) : entriesExpanded ? (
            <Droppable droppableId="entries-list">
              {(provided) => (
                <div
                  className="entries-list"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {orderedEntries.map((entry, index) => (
                    <Draggable key={entry.id} draggableId={entry.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`entry-card ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <div className="entry-content">
                            <div className="entry-main">
                              <div 
                                {...provided.dragHandleProps}
                                className="drag-handle"
                                title="Drag to reorder"
                              >
                                ⋮⋮
                              </div>
                              <h3>{entry.description}</h3>
                              {entry.notes && (
                                <div className="entry-notes">
                                  <span className="notes-icon">📝</span>
                                  <p>{entry.notes}</p>
                                </div>
                              )}
                              <div className="entry-meta">
                                <div className="meta-item">
                                  <span className="meta-label">Tags:</span>
                                  <EditableTags entry={entry} onUpdate={loadEntries} />
                                </div>
                                <div className="meta-item">
                                  <span className="meta-label">Project:</span>
                                  <EditableProject entry={entry} projects={projects} onUpdate={loadEntries} />
                                </div>
                              </div>
                            </div>
                            <TimeEditor entry={entry} onUpdate={loadEntries} />
                          </div>
                          <div className="entry-actions">
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="delete-button"
                              disabled={!entry.end_time}
                              title={!entry.end_time ? 'Stop the timer first' : 'Delete entry'}
                            >
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ) : null}
        </div>
      </DragDropContext>

      {showManualEntry && (
        <ManualTimeEntry
          projects={projects}
          onSuccess={() => {
            loadEntries();
            loadProjects();
          }}
          onClose={() => setShowManualEntry(false)}
        />
      )}
    </div>
  );
};

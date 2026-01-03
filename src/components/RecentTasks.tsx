import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { TimeEntry } from '../types';
import './RecentTasks.css';

interface RecentTasksProps {
  onStartTask: (description: string, tags: string, projectId: string) => void;
}

export function RecentTasks({ onStartTask }: RecentTasksProps) {
  const [recentTasks, setRecentTasks] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentTasks();
  }, []);

  const fetchRecentTasks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .not('end_time', 'is', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      // Get unique tasks (by description)
      const uniqueTasks = data.filter((task, index, self) =>
        index === self.findIndex((t) => t.description === task.description)
      ).slice(0, 5);
      setRecentTasks(uniqueTasks);
    }
    setLoading(false);
  };

  const handleStartTask = (task: TimeEntry) => {
    onStartTask(task.description, task.tags || '', task.project_id || '');
  };

  if (loading) {
    return null;
  }

  if (recentTasks.length === 0) {
    return null;
  }

  return (
    <div className="recent-tasks">
      <h3>⚡ Recent Tasks</h3>
      <div className="recent-tasks-list">
        {recentTasks.map((task) => (
          <div key={task.id} className="recent-task-item">
            <div className="recent-task-info">
              <div className="recent-task-description">{task.description}</div>
              {task.tags && (
                <div className="recent-task-tags">{task.tags}</div>
              )}
            </div>
            <div className="recent-task-actions">
              <button
                onClick={() => handleStartTask(task)}
                className="recent-task-start"
                title="Start this task again"
              >
                ▶ Start
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

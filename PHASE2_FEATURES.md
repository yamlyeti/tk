# Phase 2 Features - Time Tracking App

## 🎉 New Features Implemented

### 1. Timer Notifications 🔔
- **Desktop Notifications**: Get notified when timer milestones are reached
  - Every 30 minutes during active tracking
  - When timer reaches 1 hour, 2 hours, 4 hours, and 8 hours
- **Browser Permission**: App requests notification permission on first use
- **Smart Timing**: Only notifies during active (non-paused) timer sessions

### 2. Entry Templates 📋
- **Quick Start Templates**: Create reusable templates for common tasks
- **Template Management**: 
  - Add new templates with description, project, and tags
  - Edit existing templates
  - Delete templates you no longer need
- **One-Click Start**: Click any template to instantly start a timer with pre-filled data
- **Auto-save**: Templates persist across sessions in Supabase

### 3. Idle Detection ⏸️
- **Smart Idle Monitoring**: Detects when you've been inactive for 5 minutes
- **Automatic Pause**: Timer automatically pauses when idle detected
- **User Choice Dialog**: When you return, choose to:
  - **Keep Time**: Resume timer and count the idle time
  - **Discard Time**: Resume timer but subtract the idle period
- **Background Tracking**: Works continuously while timer is active

## How to Use

### Notifications
1. When you first start a timer, allow notification permissions in your browser
2. Continue working - notifications will appear at key milestones
3. Click notification to return to the app

### Templates
1. Navigate to **Templates** section (below Recent Tasks)
2. Click **+ New Template** to create one
3. Fill in:
   - Description (what is this task?)
   - Project (optional)
   - Tags (optional, comma-separated)
4. Click template card to start a timer with those settings

### Idle Detection
1. Start any timer
2. Leave your computer or stop interacting with the browser
3. After 5 minutes of inactivity, a dialog will appear
4. Choose whether to keep or discard the idle time
5. Timer automatically resumes

## Technical Details

### Database Schema
- New `templates` table stores user templates
- Columns: `id`, `user_id`, `description`, `project_id`, `tags`, `created_at`

### Browser APIs Used
- **Notifications API**: For desktop notifications
- **Page Visibility API**: To detect when user switches tabs
- **Mouse/Keyboard Events**: For idle detection

### Performance
- Idle detection runs every 60 seconds (minimal battery impact)
- Notifications throttled to prevent spam
- All features work offline with local state management

## Future Enhancements
- Template sharing between users
- Customizable idle timeout
- Notification sound customization
- Template categories/folders
- Export/import templates

---
*Built with React, TypeScript, Supabase, and ❤️*

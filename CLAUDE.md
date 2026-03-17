# Claude Code Instructions

## Brain Folder Protocol

The `brain/` folder is the project's persistent knowledge base. It contains architecture decisions, roadmaps, feature plans, task tracking, and execution checklists.

### Before any task
Read the relevant files in `brain/` before starting work. At minimum check:
- `brain/tasks/in-progress.md` — active tasks and priorities
- `brain/progress.md` — current progress and blockers
- `brain/system/architecture.md` — system architecture overview
- Any feature-specific file in `brain/features/` or `brain/decisions/` related to the task

### After every task
Update the brain folder to reflect what was done:
- Update `brain/tasks/` if a task was completed or a new one was discovered
- Update `brain/progress.md` with what changed and any notes
- Add a new file in `brain/decisions/` if an important architectural or design decision was made
- Update the relevant feature plan file if a feature was advanced

Keeping `brain/` up to date is mandatory — it is the shared memory across all sessions.

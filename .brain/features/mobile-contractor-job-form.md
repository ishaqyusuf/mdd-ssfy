# Mobile Contractor Job Form

## Purpose

Track the Expo workflow used by contractors and job administrators to select a
worker, project, task, and unit before submitting or assigning a job.

## Final Detail Step

- The final detail step presents the selected job context before submission.
- Standard project jobs show the project and builder plus explicit Lot / Block,
  Model, and Selected Task fields.
- Projectless custom jobs show the entered project name and identify the task
  as custom.
- Task quantity rows use Item and Qty as the active mobile columns. Rate and
  Total remain commented out as standalone columns and render with Max beneath
  the item title in the compact `Max: … Rate: … Total: …` description.
- The context is derived from the existing job-form defaults and selected
  options. It does not change the job save payload or persistence behavior.

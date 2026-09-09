# Production worker reassignment

Status: Implemented; live acceptance pending

Requested: change the worker from Production assignment rows and calendar cards,
automatically transferring remaining unsubmitted work while preserving submissions.

- [x] Permission-checked transaction and assignment row locks.
- [x] Full transfer and partial total/LH/RH split with original submission ownership.
- [x] Shared worker picker, pencil actions and assignment refresh events.
- [x] Fully submitted guard, active worker validation and focused regression tests.
- [ ] Real database concurrent submit/reassign and pending review acceptance.
- [ ] Browser checks for calendar, assignment row, keyboard and tablet.

Feature: ../features/production-worker-reassignment.md

# API Permissions

## Purpose
Tracks authentication and authorization patterns across API surfaces.

## Current Notes
- Permission logic is implemented in API middleware and route-level orchestration.
- Sales / dispatch permission surface now includes `viewPacking` for the warehouse pickup-packing tunnel at `/sales/packing-list`.
- `viewPacking` grants access to the packing-list workspace itself.
- Community operations now include a restricted `CommunityUnit` permission surface:
  - it gets read-style community access for projects, units, and templates
  - install-cost queries and mutations are explicitly blocked server-side for that role
- Admins use the same route but get extra controls:
  - an additional `Cancelled` tab
  - lifecycle actions like `Mark Completed`, `Cancel`, and move-back-to-queue

## TODO
- Document core permission boundaries and any admin-only or repair-only flows.

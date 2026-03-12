# Dispatch Control Phase 0 Status

## Fixture IDs

- `F1` mixed produceable + non-produceable deliverables
- `F2` listed + partial packed + pending (`dispatchId=3419`)
- `F3` mark-as-fulfilled creates or selects dispatch
- `F4` same dispatch verified on web + mobile (`dispatchId=3420`)

## Capture Grid

| Fixture | Issue 1 | Issue 2 | Issue 3 | Issue 4 | Issue 5 | Issue 6 |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Todo | Todo | Todo | Todo | Todo | Todo |
| F2 | In Progress (3419) | Todo | Todo | Todo | Todo | Todo |
| F3 | Todo | Todo | Todo | Todo | Todo | Todo |
| F4 | Todo | Todo | In Progress (3420) | Todo | Todo | Todo |

## Notes

- Use `README.md` artifact requirements for each folder.
- Update this file as evidence is added.
- Additional dispatch IDs can be appended as they are confirmed (user said `3419, 3420, ...`).
- Current local blocker for live baseline capture:
  - Prisma cannot connect to DB (`localhost:3306`) in this environment, so API/row snapshots for `3419/3420` are pending runtime access.

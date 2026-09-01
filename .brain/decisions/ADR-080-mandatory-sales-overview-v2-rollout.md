# ADR: Mandatory Sales Overview V2 Rollout

## Status

Accepted

## Context

Sales Overview used role and saved rollout settings to choose V1 or V2. This
left users on different detail experiences and allowed cached V1 responses to
retain the old header or Production renderer after office acceptance.

## Decision

The canonical `sales.getSaleOverview` endpoint always loads V2. The canonical
sheet always renders the V2 header, General tab, and Production tab for every
authorized viewer. Existing permission and URL-mode boundaries remain intact.

## Alternatives

- Continue the office-default and Super Admin preview split.
- Change only the persisted office default and retain a runtime V1 branch.
- Create a second Sales Overview route.

## Consequences

- All roles use one detail design and one server projection.
- Cached or stale rollout settings cannot select V1.
- Compatibility settings and legacy components remain temporarily but are not
  reachable from the canonical gateway, increasing short-term dead-code cost.

## Implementation Notes

- `sales.getSaleOverview` selects `getSaleOverviewLoader("v2")`.
- General, header, and Production gateways render V2 without role/version
  fallback.
- The Sales Overview open contract, permissions, and query parameters do not
  change.

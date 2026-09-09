# Sales completion presentation and progressive detail

Status: Accepted — user requested all Sales UI simplifications on 2026-09-08.

## Decision

Ordinary workflow screens present administrative and operational completion as
Completed with green completion styling. Keep method/source distinctions in
audit history and commands, not routine status badges or explanatory panels.
Each required stage retains its own completion/progress; a non-required stage
on a completed order is presented as complete without inventing work quantities.

Use one visible Completed filter for both canonical headline codes. Expand at
the shared exact predicate and indexed candidate builder so counts and exports
agree. Saved administrative-only queries remain compatible. Normalize labels
on materialized reads instead of rewriting stored operational evidence.

Keep the Sales Overview focused on state, financial amounts and actions.
Detailed invoice calculations and Special Order evidence are disclosed on
request. One sticky action bar replaces duplicate footer controls. Existing
permission-aware Special Order controls remain reachable through Order actions;
Troubleshooting uses the existing sales-resolution permission boundary.

## Consequences

No schema, data migration, operational quantities or audit-event changes.
Completion is a presentation choice, not fabricated delivery/production proof.
Users can still inspect historical provenance and perform authorized existing
commands. Regression coverage must prove stage independence, fee/refund amounts,
filter parity and preserved action access.

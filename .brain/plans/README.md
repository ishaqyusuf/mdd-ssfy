# Project Brain Plan Organization

## Small Plans
Keep a small, self-contained plan as one dated Markdown file:

`YYYY-MM-DD-<plan-name>.md`

## Large Plans
Use a dedicated folder when a program spans multiple pages, phases, or
independently executed feature plans:

```text
.brain/plans/<program-name>/
  map.md
  01-<first-scope>-plan.md
  02-<second-scope>-plan.md
```

Rules:
- `map.md` owns the program goal, scope map, sequence, shared constraints, and
  active child plan.
- Numbered child plans own implementation detail, tests, acceptance criteria,
  and completion evidence for one bounded scope.
- Only one child plan should be active when the program requires monitored,
  sequential execution.
- Add child plans when their scope becomes concrete; do not create empty
  placeholder files for deferred work.
- Use repository-relative Brain links and update every reference when a plan is
  moved.
- Preserve completed child plans in the program folder as durable history.

## First Large Plan
`.brain/plans/sales-system-page-by-page-modernization/map.md`

# Community Operations Workspace

## Goal
- Turn Community into an operations workspace with a dashboard, richer project indexing, and dedicated overview pages for projects and units.

## Routes
- `/community`
  - Community dashboard with summary widgets and dashboard tabs, including a dedicated Projects tab before Productions for broader project monitoring views.
- `/community/projects`
  - Project index with a standard `SearchFilter` header, project-specific analytics cards, row selection, batch archive actions, and inline supervisor management.
- `/community/projects/[slug]`
  - Project overview with production, invoice, job, and unit visibility plus quick actions, with the recent activity area composed as a single tabbed widget under `components/widgets/project-overview`.
- `/community/project-units`
  - Unit index with analytics and route-first navigation into unit overview pages.
- `/community/project-units/[slug]`
  - Unit overview with production, invoice, job, and template context.

## Query Layer
- `communityProjectsOverview`
  - Supports both lean project index cards and the broader project-monitoring views rendered inside the main dashboard Projects tab.
- `communityProjectUnitsOverview`
  - Summary metrics, unit trend, production-status mix, recent units.
- `communityProjectOverview`
  - Project summary, production distribution, recent units, recent production, invoice activity, recent jobs.
- `communityProjectUnitOverview`
  - Unit summary, production history, invoice tasks, recent jobs.

## UX Details
- Projects support `builderId`, `refNo`, and `status` filters through the standard `SearchFilter` header pattern.
- Project rows expose action menus for overview, units, edit, and archive toggles.
- Supervisor is editable inline from the table via a popover editor.
- Project and unit pages use card-based analytics and activity sections built from Community-specific tRPC summaries.
- The project-units table exposes lightweight readiness columns for install cost and template configuration so operators can spot missing setup before entering the print flow.
- `CommunityUnit` is the restricted units/template role:
  - sidebar access is limited to community projects, units, and templates
  - the unit index is reduced to `Project`, `Builder`, `Model`, `Lot`, and `Block`
  - users can create units and edit templates, but install-cost data/actions are hidden and blocked
- The project-units print modal is a unit-by-unit review gate: each selected unit appears with its own checkbox, install-cost summary, template-printability status, submitted-job count with jobs CTA, and production status, while `Print` and `Production` act only on the checked eligible rows and keep the modal open.
- Project overview activity content is organized inside the `components/widgets/project-overview` tabbed widget with Units, Production, Invoices, and Jobs panes.

## Operational Actions
- Batch archive / mark active on project table selections.
- Project-level "mark all production completed" action updates open production tasks for the project.
- Project overview exposes add-unit, edit-project, and invoice drill-down actions.

## Follow-up Ideas
- Preselect project context when adding a unit from project overview.
- Add project-level invoice edit modal instead of invoice-page drill-down.
- Add richer chart interactions and explicit recent submissions widgets for jobs/production where needed.

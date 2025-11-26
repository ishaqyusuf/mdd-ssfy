# Gemini Project Memory

This file helps me remember important details about this project.

## How to Use

You can ask me to remember specific facts about the project. I will store them here for future reference.

**Example:**

> "Hey Gemini, remember that all new components should be written in TypeScript."

I will then add this to my memory.

## Current Project Information

*   This is a monorepo project with `apps` and `packages` directories.
*   The primary prisma schema files are located at `packages/db/src/schema/sales.prisma` and `packages/db/src/schema/sales-inventory.prisma`.
*   Database queries are located in `apps/api/src/db/queries/`.
*   TRPC routers are located in `apps/api/src/trpc/routers/`.

## Page Refactoring Guide

When refactoring pages, the process involves migrating old code to a new, standardized structure. The refactored code for each page is exported to a markdown file following the naming convention `./refactor.${page_name}.md`.

The new code structure generally includes:

*   A new page file located under `apps/www/src/app/(sidebar)/...`.
*   A dedicated header component for the page.
*   A search filter component for the page.
*   A custom React hook for managing filter parameters (`use-${page_name}-filter-params.ts`).
*   Updates to `apps/api/src/db/queries/filters.ts` to include new filter functions.
*   Updates to `apps/api/src/trpc/routers/filters.route.ts` to expose new filter TRPC procedures.
*   A new data table component for displaying data.
*   A new batch actions component (if applicable).
*   New TRPC router, schema, and database query files specific to the page's data.
*   A new columns definition file for the data table.

## Modal Refactoring Guide

This guide outlines the process for refactoring existing modals to a new, standardized approach. The goal is to centralize modal implementations, leverage modern React practices, and integrate with tRPC for data operations.

**New Modal Approach Principles:**

*   **Centralized Location:** All new modals should reside in `apps/www/src/components/modals/`.
*   **Dedicated Hooks:** Each modal should have a dedicated hook (e.g., `useInboundStatusModal`) for managing its open/close state and any associated data.
*   **UI Components:** Utilize `@gnd/ui/Dialog` or `@gnd/ui/Sheet` for the modal UI.
*   **Data Fetching & Mutations:** All data fetching and mutations within modals should use tRPC, following patterns seen in `sales-email-sender` and `employee-form-modal`.
*   **Form Management:** Use `react-hook-form` with `zod` for form validation and submission.
*   **Global Integration:** New modals should be added to `apps/www/src/components/modals/global-modals.tsx` for centralized management and rendering.
*   **Folder Structure for Complex Modals:** If a modal requires multiple components (e.g., tabs, complex forms), organize them within a dedicated folder: `apps/www/src/components/modals/example-modal/index.tsx`, `apps/www/src/components/modals/example-modal/sub-component.tsx`, etc.

**Refactoring Process:**

1.  **Identify Refactorable Modals:** Locate existing modal implementations that do not conform to the new standard. These often involve custom modal logic, direct API calls, or non-standard UI components.
2.  **Create New Modal Component:** Develop the new modal component in the `apps/www/src/components/modals/` directory, adhering to the principles above.
3.  **Migrate Logic:** Transfer the existing modal's logic, including state management, data fetching, and form handling, to the new component and its associated hook.
4.  **Integrate with tRPC:** Convert any direct API calls to tRPC queries and mutations.
5.  **Update Global Modals:** Add the new modal component to `apps/www/src/components/modals/global-modals.tsx`.
6.  **Update Call Sites:** Modify all places where the old modal was used to now open the new modal via its dedicated hook.
7.  **Deprecate/Remove Old Modal:** Once the refactoring is complete and verified, deprecate or remove the old modal file.

**Output Format:**

Each refactored modal will be saved in a separate markdown file named `./gemini/modals/${modal_name}.md`. Each file will contain:

*   The new component code.
*   The associated hook.
*   Any relevant tRPC definitions.
*   Clear labels and links to the original file paths for easy reference.

## Refactored Modals (Plans Created):

*   `customer-profile-update-modal.tsx` (Plan: `./modal.customer-profile-update.md`)
*   `employee-form-modal.tsx` (Plan: `./modal.employee-form.md`)
*   `inbound-status-modal.tsx` (Plan: `./modal.inbound-status.md`)
*   `labor-cost-modal.tsx` (Plan: `./modal.labor-cost.md`)
*   `sales-email-sender.tsx` (Plan: `./modal.sales-email-sender.md`)
*   `sales-preview-modal.tsx` (Plan: `./modal.sales-preview.md`)
*   `transaction-overview-modal.tsx` (Plan: `./modal.transaction-overview.md`)
*   `user-account-update-required-modal.tsx` (Plan: `./modal.user-account-update-required.md`)

## Code Agent Prompt

*   **Keyword:** "Agent: "
*   **Response Storage:** Responses should be stored in `./gemini/${timestamp}-${responseTitle}.md`
 

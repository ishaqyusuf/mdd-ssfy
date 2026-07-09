# Sidebar Footer Account Menu Hover Loop Fix

Issue: https://github.com/ishaqyusuf/mdd-ssfy/issues/39

## Problem Statement

The desktop sidebar footer account menu flickers after the footer is clicked. The menu is stable while the pointer is inside the dropdown, but moving to other areas of the sidebar can close the menu and start a sidebar collapse/expand loop. From the user perspective, the footer account menu should feel like part of the sidebar instead of a detached floating surface.

## Solution

Clicking the sidebar footer opens the account dropdown inside the sidebar. The dropdown remains requested-open while the sidebar is collapsed from mouse leave, so leaving the sidebar hides both the sidebar and dropdown without resetting menu state. Hovering back over the sidebar expands it and restores the dropdown in its current requested-open state.

## User Stories

1. As a desktop web user, I want clicking the sidebar footer to open the account dropdown, so that I can access profile, notification settings, and logout actions.
2. As a desktop web user, I want the account dropdown to appear within the sidebar, so that it feels anchored to the footer instead of floating separately.
3. As a desktop web user, I want the dropdown to stay stable when I move between the dropdown and other sidebar areas, so that the sidebar does not flicker.
4. As a desktop web user, I want leaving the sidebar to collapse the sidebar and hide the dropdown, so that hover-collapse behavior remains predictable.
5. As a desktop web user, I want hovering back over the sidebar to restore the previously open dropdown, so that I do not lose account-menu context accidentally.
6. As a desktop web user, I want clicking outside or selecting a menu item to close the dropdown normally, so that standard menu behavior still works.
7. As a keyboard user, I want the account menu to keep dropdown semantics, so that focus and keyboard interaction remain accessible.
8. As a developer, I want the footer interaction to avoid competing hover surfaces, so that collapse/open timers do not fight each other.

## Implementation Decisions

- Add a non-portal dropdown content primitive that matches the existing dropdown styling and behavior while rendering in the local component tree.
- Use the non-portal dropdown content for the sidebar footer account menu so the dropdown belongs to the sidebar/footer tree.
- Run the footer dropdown in non-modal mode to avoid unnecessary focus/pointer capture for a navigation-shell menu.
- Preserve the separate requested-open state for the account menu and derive actual visibility from sidebar expansion.
- Keep collapse-on-sidebar-leave behavior intact and continue preserving requested-open state while collapsed.
- Remove the footer account menu's dependency on the floating hover-surface enter/leave handlers.
- No schema, API, permission, or data contract changes are needed.

## Testing Decisions

- The primary testing seam is the shared site navigation footer account menu behavior at the component/package boundary.
- A good regression test should assert external interaction behavior: click footer opens the menu, moving within the sidebar does not close or flicker, leaving the sidebar hides the menu without resetting requested-open state, and re-entering restores it.
- Existing focused validation should include the site navigation package typecheck and focused lint/import checks for the touched dropdown and footer components.
- Manual browser hover testing should be performed by a human because this interaction depends on precise pointer movement and the current browser automation path cannot reliably simulate the reported hover loop.

## Out of Scope

- Redesigning the full sidebar navigation.
- Changing mobile sidebar behavior.
- Changing profile, notification settings, or logout destinations.
- Reworking active nav item hover expansion.
- Adding new account menu actions.

## Further Notes

- The reported failure mode comes from the dropdown behaving like a separate hover surface from the sidebar. The fix keeps the account menu visually and structurally attached to the sidebar while preserving the user's requested-open state across sidebar collapse.

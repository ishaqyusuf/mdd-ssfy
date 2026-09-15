# GND Millwork App Accessibility readiness

Date: 2026-09-15
Status: Questionnaire not started; no support claims approved or published

## Live App Store Connect observation

The signed-in Account Holder opened GND Millwork > App Accessibility read-only.
The page displays **Get Started**, so no accessibility nutrition-label answers
have been submitted. The adjacent App Review page says submitted items will
appear there and currently lists none. No field or review item was changed.

Apple asks separately about VoiceOver, Voice Control, Larger Text, Dark
Interface, Differentiate Without Color Alone, Sufficient Contrast, Reduced
Motion, Captions and Audio Descriptions. A source search is not sufficient to
claim any one of these for the whole release candidate.

## Source evidence and limits

- The app has light/dark theme plumbing in root providers and navigation.
  This supports a test plan, not an app-wide Dark Interface declaration.
- Some production components use accessibility labels, roles, hints and state;
  the Privacy Policy link has a link role, label and hint. Other matches are in
  a development-only design-system preview. Scattered props do not prove that
  all common tasks work with VoiceOver or Voice Control.
- No app-wide evidence was found in this narrow inventory for 200% Larger Text,
  reduced-motion behavior, color-independent state, or measured contrast.
- Captions and Audio Descriptions are relevant only if the exact candidate
  includes meaningful audio/video content. The first-release route inventory
  does not prove such content, but runtime and bundled assets must be checked.

## Candidate QA matrix

Use the exact clean release candidate and the least-privilege synthetic review
account. Test every role/workflow represented in screenshots or review notes.

| Apple feature | Minimum evidence before selecting support |
| --- | --- |
| VoiceOver | Navigate sign-in, role landing, one primary workflow, documents/notifications, Settings and sign-out without blocked/unlabeled controls; confirm meaningful focus order and announcements. |
| Voice Control | Complete the same common tasks by visible/control names without ambiguous duplicate targets. |
| Larger Text | At 200% or greater, complete common tasks without clipped, hidden or unreachable content; verify keyboard and modal/sheet layouts. |
| Dark Interface | Inspect every represented common task in system dark mode, including modals, sheets, images, status bars and error/loading states. |
| Differentiate Without Color Alone | Confirm status, error, selection and progress states have text, iconography or shape beyond color. |
| Sufficient Contrast | Measure release themes and state variants against the applicable accessibility contrast criteria; visual judgment alone is insufficient. |
| Reduced Motion | Enable Reduce Motion and confirm nonessential animation is removed/reduced without breaking feedback or navigation. |
| Captions | If meaningful audio/video exists, verify synchronized text for dialogue and relevant sounds; otherwise document the candidate inventory supporting Not Applicable/unsupported. |
| Audio Descriptions | If meaningful video exists, verify description support; otherwise document the candidate inventory supporting Not Applicable/unsupported. |

Test at required iPhone and supported iPad form factors, with the on-screen
keyboard, offline/error states, expired/revoked session, and permission-denied
states. Record candidate build ID, OS/device, tested role, result, defects and
reviewer. Do not use production personal/customer data.

## Decision gate

Accessibility labels are optional product-page declarations but must be
accurate. Do not click Get Started, save, or publish answers until release-build
QA supports each selected claim and the owner approves the evidence. Failing to
publish optional labels does not waive the app's accessibility obligations or
App Review usability requirements.

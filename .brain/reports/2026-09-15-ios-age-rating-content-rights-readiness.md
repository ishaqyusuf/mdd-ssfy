# GND Millwork iOS age-rating and content-rights readiness

Date: 2026-09-15
Status: source-backed answer worksheet; no App Store Connect choice was
selected, saved, or submitted.

## Live Apple form evidence

The Account Holder opened the existing GND Millwork App Information page on
September 15, 2026. Age Ratings is unset. Opening **Set Up Age Ratings** without
choosing an answer showed Apple's current Step 1 fields, then the dialog was
cancelled:

- Parental Controls
- Age Assurance
- Unrestricted Web Access
- User-Generated Content
- Social Media
- Social Media Disabled for Users Under 13
- Messaging and Chat
- Advertising

The page identifies the later content groups as Mature Themes, Medical or
Wellness, Sexuality or Nudity, Violence, and Chance-Based Activities. Apple's
current official definitions and regional rating behavior are documented at
[Age ratings values and definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions).

Opening **Set Up Content Rights Information** showed exactly two choices:

1. the app contains, shows, or accesses third-party content and the developer
   has the necessary rights; or
2. the app does not contain, show, or access third-party content.

That dialog was also cancelled without selecting or saving. Apple states that
apps accessing third-party content must have the necessary rights in each
country or region where they are available; see
[App information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information).

## Proposed age-rating answers

These values are ready for product/legal review. Recheck them against the exact
release candidate and its reachable role configuration immediately before
entry.

| Apple field | Proposed answer | Source-backed reason | Remaining gate |
| --- | --- | --- | --- |
| Parental Controls | **No** | No child-account, guardian, content-filter, usage-limit, or communication-restriction control was found in the production mobile routes. | Confirm no remotely configured feature adds one. |
| Age Assurance | **No** | Company-issued authentication verifies account access, not age; no Declared Age Range API, identity-age verification, or age-estimation flow was found. | Confirm no external login/policy layer performs age assurance for this app. |
| Unrestricted Web Access | **No** | No reachable in-app WebView or free browsing interface was found. The app opens fixed privacy/document/contact destinations through the operating system. | Inspect the exact binary and ensure uploaded document URLs cannot become an unrestricted in-app browser. |
| User-Generated Content | **No** | Employees can submit operational records, documents, photos, signatures, and notes, but source shows permission-scoped workflow records rather than broad distribution of user-created content as an intended experience. | Product owner confirms no public/community feed or broad user audience is enabled. |
| Social Media | **No** | No feed, follower, discovery, redistribution, reaction, or amplification experience was found. | Confirm remote feature flags cannot expose one. |
| Social Media Disabled for Users Under 13 | **No / not applicable** | The app has no social-media capability and no under-13 social-media gate. | Enter the portal value that Apple permits when Social Media is No. |
| Messaging and Chat | **No** | Reachable job and dispatch screens render read-only activity history. A reusable chat composer exists in source, but no production mobile route outside examples imports or renders `Chat`, `Inbox`, or the message-send controls. | Re-run route/source inspection for the exact candidate; change to Yes if a direct/group/public composer becomes reachable. |
| Advertising | **No** | No ad SDK, paid placement, banner, native ad, video ad, or promoted-product surface was identified in the release routes. | Confirm final dependencies, remote configuration, and business intent. |

### Proposed frequency answers

Use **None** for each current mature-content field, subject to exact-candidate
review:

- Profanity or Crude Humor
- Horror/Fear Themes
- Alcohol, Tobacco, or Drug Use or References
- Medical or Treatment Information
- Health or Wellness Topics
- Mature or Suggestive Themes
- Sexual Content or Nudity
- Graphic Sexual Content and Nudity
- Cartoon or Fantasy Violence
- Realistic Violence
- Prolonged Graphic or Sadistic Realistic Violence
- Guns or Other Weapons
- Gambling
- Simulated Gambling
- Contests
- Loot Boxes

The inspected production route source provides millwork operations, jobs,
sales, dispatch, documents, HRM, notifications, and settings—not any listed
content experience. Incidental misuse of a permission-gated upload field is not
being treated as an intended content category; product/legal should change an
answer if real first-release records predictably contain one of these subjects.

With the proposed answers, Apple's global baseline may be the lowest rating,
but the generated result is authoritative and can vary by country/region or OS
rating system. Do not put a numeric rating in listing copy until the completed
questionnaire displays it.

## Content-rights recommendation

The conservative proposed choice is:

> **Yes, it contains, shows, or accesses third-party content, and I have the
> necessary rights.**

Reason: authorized users can access operational information that may originate
from customers, employees, contractors, builders, vendors, suppliers, product
manufacturers, or uploaded documents/media. The fact that access is private and
business-only does not prove that every item is seller-authored.

This answer is gated on an authorized owner confirming that ZEROES AND ONE TECH
HUB NIG LIMITED and the GND operating entity have sufficient licenses,
employment/contract terms, customer/vendor permissions, and other legal bases
for every country or region selected for distribution. Engineering source
cannot prove those rights. If legal instead establishes that the exact
candidate contains only first-party content, it may direct the second choice
with supporting evidence.

## Exact action-time checklist

Before any portal save:

1. product owner confirms the proposed capability and frequency answers against
   the final role-visible app;
2. release owner reviews the exact IPA dependency inventory and reachable URLs;
3. legal/content owner approves the third-party-content answer and records the
   rights basis outside Git where contracts are confidential;
4. an authorized Account Holder, Admin, or App Manager opens the questionnaire;
5. enter the approved answers and review Apple's generated country/region
   ratings; and
6. save only after explicit action-time confirmation in the release task.

Nothing in this worksheet authorizes a portal selection, Save, metadata change,
agreement, build upload, App Review submission, or public release.

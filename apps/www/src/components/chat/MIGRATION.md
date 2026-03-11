# Chat/Inbox Migration Plan

## Goal
Move legacy inbox behavior to `components/chat`, keep compatibility for existing imports, then delete legacy activity wrappers.

## New Sources of Truth
- `components/chat/chat.tsx`: standalone chat + submit fallback + color/send controls
- `components/chat/activity-history.tsx`: standalone history timeline
- `components/chat/inbox.tsx`: composed `<Inbox>` wrapper (`ActivityHistory + Chat`)

## Migration Steps
1. Start using new imports in new features:
- `@/components/chat` for `Chat`, `ActivityHistory`, `Inbox`

2. Migrate old inbox usages:
- Replace `@/components/activity/inbox` imports with `@/components/chat/inbox`.
- Keep behavior parity by passing same `channel`, `payload`, `contacts`, `query` props.

3. Migrate history-only usages:
- Replace `@/components/activity/activity-history` imports with `@/components/chat/activity-history`.

4. Refactor custom inbox UIs:
- Use standalone pieces:
  - `<Chat>` + `<Chat.Content>` + `<Chat.ColorPicker>` + `<Chat.SendButton>`
  - `<ActivityHistory>` when history is needed

5. Delete legacy wrappers after zero references:
- `components/activity/inbox.tsx`
- `components/activity/activity-history.tsx`
- update `components/activity/index.ts`

## Deletion Gate
Run both checks before deletion:
- `rg -n "components/activity/inbox|components/activity/activity-history|from \"@/components/activity\"" apps/www/src`
- `bun run --filter @gnd/www typecheck` (or project-standard scoped gate)

# Chat Components

## Standalone Chat

```tsx
import { Chat } from "@/components/chat";

export function NotificationChat() {
  return (
    <Chat
      channel="job_assigned"
      payload={{ jobId: 12 }}
      contacts={{ employee: [1, 2] }}
      transformSubmitData={async (payload, meta) => ({
        ...payload,
        ...meta,
      })}
    >
      <Chat.Header>
        <Chat.ChannelsOption names={["job_assigned", "job_submitted"]} />
      </Chat.Header>

      <Chat.Options>
        <Chat.MetaOption name="source" label="Source" required />
        <Chat.PayloadOption
          name="priority"
          label="Priority"
          options={[
            { label: "Low", value: "low" },
            { label: "High", value: "high" },
          ]}
          show
        />
      </Chat.Options>

      <Chat.ColorPicker />
      <Chat.Content placeholder="Write a note..." />
      <div className="flex justify-end">
        <Chat.SendButton />
      </div>
    </Chat>
  );
}
```

## Standalone Activity History

```tsx
import { ActivityHistory } from "@/components/chat";

export function NotificationHistory() {
  return (
    <ActivityHistory
      channel="job_assigned"
      contactId={12}
      emptyText="Start this conversation"
    />
  );
}
```

## Composed Inbox

```tsx
import { Inbox, Chat } from "@/components/chat";

export function NotificationInbox() {
  return (
    <Inbox
      activityHistoryProps={{
        channel: "job_assigned",
      }}
      chatProps={{
        channel: "job_assigned",
        payload: { jobId: 12 },
        contacts: { employee: [1, 2] },
      }}
    >
      <Chat.ColorPicker />
      <Chat.Content />
      <div className="flex justify-end">
        <Chat.SendButton />
      </div>
    </Inbox>
  );
}
```

import { expect, it, mock } from "bun:test";
import { renderToString } from "react-dom/server";

// Model an action whose component callbacks are never delivered after unmount.
const responses: Array<{
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}> = [];
let callbacks: { onError?: (error: unknown) => void };
mock.module("next-safe-action/hooks", () => ({
  useAction: (_action: unknown, options: typeof callbacks) => {
    callbacks = options;
    return { executeAsync: () => new Promise((resolve, reject) => responses.push({ resolve, reject })) };
  },
}));
mock.module("@/actions/trigger-task", () => ({ triggerTask: async () => ({}) }));
mock.module("./use-auth", () => ({ useAuth: () => ({ id: "lifecycle-owner" }) }));
mock.module("@trigger.dev/react-hooks", () => ({ useRealtimeRun: () => ({}) }));
const { useTaskTrigger } = await import("./use-task-trigger");
const { useTaskMonitorStore } = await import("@/store/task-monitor");
const { tableRowActivity } = await import("@/store/table-row-activity");
const { settleTaskRowActivity } = await import("@/lib/table-row-activity/sales-task");
let action: ReturnType<typeof useTaskTrigger>;
let onStarted: (() => void) | undefined;
function Probe() {
  action = useTaskTrigger({ monitor: true, silent: true, onStarted });
  return null;
}
const intent = (id: number) => ({
  intent: { name: "sales.mark-as-fulfilled" as const, version: 1 as const,
    args: { requestId: crypto.randomUUID(), salesIds: [id] } },
});
const input = { taskName: "bulk-mark-sales-fulfilled" as const };

it("binds a delayed result and registers its monitor without mounted callbacks", async () => {
  renderToString(<Probe />);
  const promise = action.trigger(input, intent(901));
  const token = [...tableRowActivity.getSnapshot().values()].find(row => row.entityId === 901)!;
  const result = { data: { id: "unmounted-run", publicAccessToken: "synthetic" } };
  responses.shift()!.resolve(result);
  expect(await promise).toBe(result);
  expect(useTaskMonitorStore.getState().tasks.find(task => task.runId === "unmounted-run")?.ownerId).toBe("lifecycle-owner");
  settleTaskRowActivity({ runId: "unmounted-run" }, "success", { outcomes: [{ salesId: 901, status: "succeeded" }] });
  expect(tableRowActivity.get(token)?.phase).toBe("success");
  tableRowActivity.clearOwner("lifecycle-owner");
});

it("does not report a running job as failed when a post-start callback throws", async () => {
  onStarted = () => { throw new Error("Synthetic callback failure"); };
  renderToString(<Probe />);
  const promise = action.trigger(input, intent(903));
  responses.shift()!.resolve({ data: { id: "callback-run", publicAccessToken: "synthetic" } });
  expect(await promise.then(() => null, error => error.message)).toBe("Synthetic callback failure");
  expect([...tableRowActivity.getSnapshot().values()].find(row => row.entityId === 903)?.phase).toBe("processing");
  expect(useTaskMonitorStore.getState().tasks.some(task => task.runId === "callback-run")).toBe(true);
  onStarted = undefined;
  tableRowActivity.clearOwner("lifecycle-owner");
});

it("settles rejected starts by invocation without a late callback failing the retry", async () => {
  renderToString(<Probe />);
  const first = action.trigger(input, intent(902));
  responses.shift()!.resolve({ serverError: "Synthetic start failure" });
  await first;
  expect([...tableRowActivity.getSnapshot().values()].find(row => row.entityId === 902)?.phase).toBe("error");
  const retry = action.trigger(input, intent(902));
  callbacks.onError?.({ error: { serverError: "Old error" } });
  expect([...tableRowActivity.getSnapshot().values()].find(row => row.entityId === 902)?.phase).toBe("processing");
  responses.shift()!.reject(new Error("Synthetic transport failure"));
  expect(await retry.then(() => null, error => error.message)).toBe("Synthetic transport failure");
  expect([...tableRowActivity.getSnapshot().values()].find(row => row.entityId === 902)?.phase).toBe("error");
  tableRowActivity.clearOwner("lifecycle-owner");
});

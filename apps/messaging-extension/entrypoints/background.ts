const origin = new URL(import.meta.env.WXT_PUBLIC_GND_APP_ORIGIN || "http://localhost:3010").origin;
type Linked = { credential: string; connectionId: string; connectedExtensionId: string; running: boolean };
type Configuration = { sourceKind: string; externalAccountId: string; status: string; scanIntervalSeconds: number; pollIntervalSeconds: number; quietWindowSeconds: number; sendPolicy: string };

async function post(action: string, body: object, credential?: string) {
  const response = await fetch(`${origin}/api/messaging/connection/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json", ...(credential ? { Authorization: `Bearer ${credential}` } : {}) },
    body: JSON.stringify(body), cache: "no-store",
  });
  if (!response.ok) throw new Error(`Connection request rejected (${response.status}).`);
  return response.json();
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener(async (message: { kind?: string; code?: string }) => {
    const { linked } = await browser.storage.local.get("linked") as { linked?: Linked };
    if (message.kind === "connect") {
      if (!message.code || !/^\d{12}$/.test(message.code)) throw new Error("Enter the 12-digit code.");
      const connected = await post("exchange", { code: message.code, label: "Chrome extension", extensionVersion: browser.runtime.getManifest().version }) as Linked;
      await browser.storage.local.set({ linked: { ...connected, running: false } satisfies Linked });
      const status = await post("status", { connectionId: connected.connectionId }, connected.credential) as { configuration: Configuration };
      return { linked: true, running: false, configuration: status.configuration };
    }
    if (message.kind === "disconnect") {
      if (linked) {
        try {
          await post("disconnect", { connectionId: linked.connectionId }, linked.credential);
        } catch (error) {
          // An already-revoked credential is disconnected locally too. For a
          // network/server failure retain it so the user can retry revocation.
          if (!(error instanceof Error) || !/\(401\)/.test(error.message)) throw error;
        }
        await browser.storage.local.remove("linked");
      }
      return { linked: false, running: false };
    }
    if (!linked) return { linked: false, running: false };
    let configuration: Configuration;
    try {
      const result = await post("status", { connectionId: linked.connectionId }, linked.credential) as { configuration: Configuration };
      configuration = result.configuration;
    } catch (error) {
      if (error instanceof Error && /\(401\)/.test(error.message)) {
        await browser.storage.local.remove("linked");
        return { linked: false, running: false };
      }
      throw error;
    }
    if (configuration.status !== "enabled" && linked.running) {
      linked.running = false;
      await browser.storage.local.set({ linked });
    }
    if (message.kind === "setRunning") {
      if (configuration.status !== "enabled") throw new Error("Enable this source in Dashboard before starting automation.");
      // This ticket persists only the local automation intent. Inbox capture
      // and customer sending are introduced by later guarded job tickets.
      linked.running = !linked.running;
      await browser.storage.local.set({ linked });
    }
    return { linked: true, running: linked.running, connectionId: linked.connectionId, configuration };
  });
});

"use client";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useMemo, useState } from "react";

type Organization = { id: number; name: string };
type Connection = {
  id: string; organizationId: number; externalAccountId: string;
  sourceKind: "facebook_marketplace" | "facebook_page";
  canonicalInboxUrl: string; status: "enabled" | "disabled"; configRevision: number;
  scanIntervalSeconds: number; pollIntervalSeconds: number; quietWindowSeconds: number;
  overlapWindowSeconds: number; maxConversationsPerScan: number;
  maxMessagesPerScan: number; maxSendsPerHour: number;
  sendPolicy: "off" | "draft_only" | "whatsapp_approved";
  approverWaId: string; senderReference: string; rulesetId: string; retentionDays: number | null;
};
type Device = { grantedAt: string; revokedAt: string | null; device: { id: string; label: string; expiresAt: string | null; revokedAt: string | null } };
const fieldClass = "space-y-1";

function blank(organizationId: number): Connection {
  return { id: "", organizationId, externalAccountId: "", sourceKind: "facebook_marketplace", canonicalInboxUrl: "https://www.facebook.com/marketplace/inbox", status: "disabled", configRevision: 1, scanIntervalSeconds: 900, pollIntervalSeconds: 60, quietWindowSeconds: 30, overlapWindowSeconds: 300, maxConversationsPerScan: 50, maxMessagesPerScan: 500, maxSendsPerHour: 30, sendPolicy: "off", approverWaId: "", senderReference: "", rulesetId: "", retentionDays: 90 };
}

export function MarketplaceConnections({ initialConnections, organizations }: { initialConnections: Connection[]; organizations: Organization[] }) {
  const [connections, setConnections] = useState(initialConnections);
  const [draft, setDraft] = useState<Connection>(() => initialConnections[0] ?? blank(organizations[0]?.id ?? 0));
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const unresolved = useMemo(() => {
    const items: string[] = [];
    if (!draft.externalAccountId.trim()) items.push("External account or Page ID");
    if (!draft.canonicalInboxUrl.trim()) items.push("Canonical inbox URL");
    if (draft.sendPolicy === "whatsapp_approved") {
      if (!draft.approverWaId) items.push("Approver WhatsApp number");
      if (!draft.senderReference) items.push("WhatsApp sender reference");
      if (!draft.rulesetId) items.push("Published ruleset reference");
    }
    return items;
  }, [draft]);

  async function call(action: string, data: object) {
    const result = await fetch(`/api/messaging/connection/${action}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), cache: "no-store" });
    const payload = await result.json().catch(() => null);
    if (!result.ok) throw new Error(payload?.error === "INVALID_REQUEST" ? "Check the source URL, intervals and WhatsApp settings." : "Request denied. Check your access, password, or connection status.");
    return payload;
  }

  async function saveConfiguration() {
    setBusy(true); setMessage("");
    try {
      const action = draft.id ? "update" : "create";
      const saved = await call(action, {
        ...(draft.id ? { connectionId: draft.id } : { organizationId: draft.organizationId, sourceKind: draft.sourceKind, externalAccountId: draft.externalAccountId }),
        canonicalInboxUrl: draft.canonicalInboxUrl, status: draft.status, sendPolicy: draft.sendPolicy,
        approverWaId: draft.approverWaId, senderReference: draft.senderReference, rulesetId: draft.rulesetId,
        retentionDays: draft.retentionDays, scanIntervalSeconds: draft.scanIntervalSeconds,
        pollIntervalSeconds: draft.pollIntervalSeconds, quietWindowSeconds: draft.quietWindowSeconds,
        overlapWindowSeconds: draft.overlapWindowSeconds, maxConversationsPerScan: draft.maxConversationsPerScan,
        maxMessagesPerScan: draft.maxMessagesPerScan, maxSendsPerHour: draft.maxSendsPerHour,
      });
      const normalized = { ...saved, approverWaId: saved.approverIdentityId ?? "", senderReference: saved.senderReference ?? "", rulesetId: saved.rulesetId ?? "" } as Connection;
      setConnections((current) => current.some((item) => item.id === normalized.id) ? current.map((item) => item.id === normalized.id ? normalized : item) : [normalized, ...current]);
      setDraft(normalized);
      setMessage(action === "create" ? "Marketplace source created. It remains disabled until you enable it." : "Marketplace automation settings saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Configuration unavailable."); }
    finally { setBusy(false); }
  }

  async function run(action: "issue" | "list" | "revoke", extra: object = {}) {
    if (!draft.id) return;
    setBusy(true); setMessage("");
    try {
      const data = await call(action, { connectionId: draft.id, ...extra });
      if (action === "issue") { setCode(data.code); setPassword(""); setMessage("Code expires in five minutes. Enter it in Chrome once."); }
      else if (action === "list") setDevices(data);
      else { setDevices(await call("list", { connectionId: draft.id })); setMessage("Extension revoked. Its next request will be denied."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Connection unavailable."); }
    finally { setBusy(false); }
  }

  const numberField = (key: keyof Pick<Connection, "scanIntervalSeconds" | "pollIntervalSeconds" | "quietWindowSeconds" | "overlapWindowSeconds" | "maxConversationsPerScan" | "maxMessagesPerScan" | "maxSendsPerHour">, label: string, min: number) => <div className={fieldClass}><Label htmlFor={key}>{label}</Label><Input id={key} type="number" min={min} value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: Number(event.target.value) }))} /></div>;

  return <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section className="space-y-6 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-medium">Source and automation controls</h2><p className="text-sm text-muted-foreground">Dashboard settings are authoritative. Chrome only owns its local Start/Pause state.</p></div><Button variant="outline" onClick={() => { setDraft(blank(organizations[0]?.id ?? 0)); setCode(""); setDevices([]); }}>Add source</Button></div>
      {connections.length ? <div className={fieldClass}><Label htmlFor="saved-source">Configured source</Label><select id="saved-source" className="h-9 w-full border bg-background px-3 text-sm" value={draft.id} onChange={(event) => { const selected = connections.find((item) => item.id === event.target.value); if (selected) { setDraft(selected); setCode(""); setDevices([]); } }}><option value="">New source</option>{connections.map((item) => <option key={item.id} value={item.id}>{item.sourceKind} · {item.externalAccountId} ({item.status})</option>)}</select></div> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}><Label htmlFor="organization">Organization</Label><select id="organization" disabled={Boolean(draft.id)} className="h-9 w-full border bg-background px-3 text-sm" value={draft.organizationId} onChange={(event) => setDraft((current) => ({ ...current, organizationId: Number(event.target.value) }))}>{organizations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <div className={fieldClass}><Label htmlFor="source-kind">Source</Label><select id="source-kind" disabled={Boolean(draft.id)} className="h-9 w-full border bg-background px-3 text-sm" value={draft.sourceKind} onChange={(event) => setDraft((current) => ({ ...current, sourceKind: event.target.value as Connection["sourceKind"] }))}><option value="facebook_marketplace">Facebook Marketplace</option><option value="facebook_page">Facebook Page inbox</option></select></div>
        <div className={fieldClass}><Label htmlFor="account-id">External account or Page ID</Label><Input id="account-id" disabled={Boolean(draft.id)} value={draft.externalAccountId} onChange={(event) => setDraft((current) => ({ ...current, externalAccountId: event.target.value }))} /></div>
        <div className={fieldClass}><Label htmlFor="source-status">Server kill switch</Label><select id="source-status" className="h-9 w-full border bg-background px-3 text-sm" value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as Connection["status"] }))}><option value="disabled">Disabled</option><option value="enabled">Enabled</option></select></div>
        <div className={`${fieldClass} sm:col-span-2`}><Label htmlFor="inbox-url">Canonical inbox URL</Label><Input id="inbox-url" type="url" value={draft.canonicalInboxUrl} onChange={(event) => setDraft((current) => ({ ...current, canonicalInboxUrl: event.target.value }))} /></div>
      </div>
      <div><h3 className="mb-3 text-sm font-medium">Timing and bounded work</h3><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{numberField("scanIntervalSeconds", "Inbox scan (seconds)", 300)}{numberField("pollIntervalSeconds", "Approved-job poll (seconds)", 30)}{numberField("quietWindowSeconds", "Grouping quiet window (seconds)", 5)}{numberField("overlapWindowSeconds", "History overlap (seconds)", 60)}{numberField("maxConversationsPerScan", "Conversations per scan", 1)}{numberField("maxMessagesPerScan", "Messages per scan", 1)}{numberField("maxSendsPerHour", "Approved sends per hour", 1)}</div></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={fieldClass}><Label htmlFor="send-policy">Send policy</Label><select id="send-policy" className="h-9 w-full border bg-background px-3 text-sm" value={draft.sendPolicy} onChange={(event) => setDraft((current) => ({ ...current, sendPolicy: event.target.value as Connection["sendPolicy"] }))}><option value="off">Off</option><option value="draft_only">Draft only</option><option value="whatsapp_approved">Send WhatsApp-approved replies</option></select></div>
        <div className={fieldClass}><Label htmlFor="retention-days">Message retention (days)</Label><Input id="retention-days" type="number" min={1} max={3650} value={draft.retentionDays ?? ""} onChange={(event) => setDraft((current) => ({ ...current, retentionDays: event.target.value ? Number(event.target.value) : null }))} /></div>
        <div className={fieldClass}><Label htmlFor="approver-wa">Approver WhatsApp (E.164)</Label><Input id="approver-wa" placeholder="+15551234567" value={draft.approverWaId} onChange={(event) => setDraft((current) => ({ ...current, approverWaId: event.target.value }))} /></div>
        <div className={fieldClass}><Label htmlFor="sender-reference">WhatsApp sender reference</Label><Input id="sender-reference" value={draft.senderReference} onChange={(event) => setDraft((current) => ({ ...current, senderReference: event.target.value }))} /></div>
        <div className={`${fieldClass} sm:col-span-2`}><Label htmlFor="ruleset-id">Published response ruleset reference</Label><Input id="ruleset-id" value={draft.rulesetId} onChange={(event) => setDraft((current) => ({ ...current, rulesetId: event.target.value }))} /></div>
      </div>
      <div className="flex items-center gap-3"><Button disabled={busy || unresolved.length > 0} onClick={() => void saveConfiguration()}>{draft.id ? "Save settings" : "Create source"}</Button>{draft.id ? <span className="text-xs text-muted-foreground">Configuration revision {draft.configRevision}</span> : null}</div>
    </section>
    <aside className="space-y-5">
      <section className="space-y-3 rounded-lg border bg-card p-5"><h2 className="font-medium">Setup status</h2>{unresolved.length ? <><p className="text-sm text-muted-foreground">Complete these before saving:</p><ul className="list-disc space-y-1 pl-5 text-sm">{unresolved.map((item) => <li key={item}>{item}</li>)}</ul></> : <p className="text-sm text-muted-foreground">Required source settings are complete. Sending remains governed by the selected policy.</p>}</section>
      {draft.id ? <section className="space-y-4 rounded-lg border bg-card p-5"><h2 className="font-medium">Connected Chrome</h2><p className="text-sm text-muted-foreground">Only Super Admins can connect or revoke a browser. Your password never reaches the extension.</p><div className={fieldClass}><Label htmlFor="confirm-password">Confirm your login password</Label><Input id="confirm-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></div><Button disabled={busy || !password || draft.status !== "enabled"} onClick={() => void run("issue", { password })}>Generate one-time code</Button>{code ? <div className="rounded-md border p-3" role="status"><span className="text-sm">One-time code: </span><strong className="select-all font-mono tracking-widest">{code}</strong></div> : null}<Button variant="outline" disabled={busy} onClick={() => void run("list")}>Connected extensions</Button>{devices.map(({ device, revokedAt }) => <div key={device.id} className="space-y-2 rounded-md border p-3 text-sm"><span>{device.label} · {revokedAt || device.revokedAt ? "Revoked" : "Connected"}</span>{!revokedAt && !device.revokedAt ? <Button variant="outline" disabled={busy} onClick={() => void run("revoke", { connectedExtensionId: device.id })}>Revoke</Button> : null}</div>)}</section> : null}
      {message ? <p role="status" className="rounded-lg border bg-card p-4 text-sm">{message}</p> : null}
    </aside>
  </div>;
}

/** @jsxImportSource react */
import { Button } from "@gnd/ui/button";
import { useEffect, useState } from "react";

const origin = new URL(import.meta.env.WXT_PUBLIC_GND_APP_ORIGIN || "http://localhost:3010").origin;

export function ConnectionShell({ compact = false }: { compact?: boolean }) {
  const [code, setCode] = useState("");
  const [linked, setLinked] = useState(false);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [configuration, setConfiguration] = useState<{ sourceKind: string; externalAccountId: string; status: string; scanIntervalSeconds: number; pollIntervalSeconds: number; quietWindowSeconds: number; sendPolicy: string } | null>(null);
  useEffect(() => {
    void browser.runtime.sendMessage({ kind: "status" })
      .then((value: { linked?: boolean; running?: boolean; configuration?: typeof configuration }) => {
        setLinked(Boolean(value?.linked));
        setRunning(Boolean(value?.running));
        setConfiguration(value?.configuration ?? null);
      })
      .catch(() => setNotice("Unable to check the connection."));
  }, []);

  async function action(kind: "connect" | "disconnect") {
    setBusy(true);
    setNotice("");
    try {
      if (kind === "connect") {
        const granted = await browser.permissions.request({ origins: [`${origin}/*`] });
        if (!granted) throw new Error("Grant access to the GND dashboard to connect.");
      }
      const result = await browser.runtime.sendMessage({ kind, code });
      setLinked(Boolean(result?.linked));
      setConfiguration(result?.configuration ?? null);
      setCode("");
      setNotice(kind === "connect" ? "Connected. Capture and sending are not active yet." : "Disconnected.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Connection unavailable."); }
    finally { setBusy(false); }
  }
  async function toggleRunning() {
    setBusy(true);
    setNotice("");
    try {
      const result = await browser.runtime.sendMessage({ kind: "setRunning" });
      setRunning(Boolean(result?.running));
      setConfiguration(result?.configuration ?? null);
      setNotice(result?.running ? "Automation started. Inbox capture is added in the next ticket." : "Automation paused.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to change automation state."); }
    finally { setBusy(false); }
  }
  return (
    <main className={compact ? "connection-shell compact" : "connection-shell"}>
      <header className="shell-header">
        <span className="eyebrow">GND · Marketplace</span>
        <h1>Customer messages, in one place.</h1>
        <p>Connect your sales manager’s browser to GND to review customer inquiries.</p>
      </header>
      <section className="status-card" aria-label="Connection status">
        <span className="status-label">Connection</span>
        <strong>{linked ? `Connected · ${running ? "started" : "paused"}` : "Not connected"}</strong>
        <p>{configuration ? `${configuration.sourceKind} · ${configuration.externalAccountId}` : "Connect to load the configured source."}</p>
      </section>
      {linked && configuration ? <section className="status-card" aria-label="Automation configuration">
        <span className="status-label">Server controls</span>
        <strong>{configuration.status === "enabled" ? "Enabled" : "Disabled by dashboard"}</strong>
        <p>Scan {Math.round(configuration.scanIntervalSeconds / 60)}m · approvals {configuration.pollIntervalSeconds}s · group {configuration.quietWindowSeconds}s · {configuration.sendPolicy.replaceAll("_", " ")}</p>
      </section> : null}
      {linked ? <>
        <Button disabled={busy} onClick={() => void toggleRunning()}>{running ? "Pause automation" : "Start automation"}</Button>
        <p className="footnote">Uses the Facebook session already open in this Chrome profile. No profile verification is required.</p>
        <Button variant="outline" disabled={busy} onClick={() => void action("disconnect")}>Disconnect</Button>
      </> : <>
        <label htmlFor="connection-code">One-time dashboard code</label>
        <input id="connection-code" inputMode="numeric" autoComplete="one-time-code" maxLength={12} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
        <Button disabled={busy || code.length !== 12} onClick={() => void action("connect")}>Connect to GND</Button>
      </>}
      <p role="status" className="footnote">{notice || "Generate a code in Dashboard → Settings → Marketplace."}</p>
    </main>
  );
}

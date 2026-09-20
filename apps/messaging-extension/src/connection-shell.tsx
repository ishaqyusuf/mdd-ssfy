/** @jsxImportSource react */
import { Button } from "@gnd/ui/button";

export function ConnectionShell({ compact = false }: { compact?: boolean }) {
  return (
    <main className={compact ? "connection-shell compact" : "connection-shell"}>
      <header className="shell-header">
        <span className="eyebrow">GND · Marketplace</span>
        <h1>Customer messages, in one place.</h1>
        <p>Connect your sales manager’s browser to GND to review customer inquiries.</p>
      </header>
      <section className="status-card" aria-label="Connection status">
        <span className="status-label">Connection</span>
        <strong>Not paired yet</strong>
        <p>Device pairing arrives in the next ticket. No inbox reading or sending is active.</p>
      </section>
      <Button disabled aria-describedby="setup-note">Connect to GND</Button>
      <p id="setup-note" className="footnote">Setup becomes available after secure device pairing is implemented.</p>
    </main>
  );
}

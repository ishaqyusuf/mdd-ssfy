import { createFileRoute } from "@tanstack/react-router";

import { logoutFn } from "@/server/auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = Route.useRouteContext();

  return (
    <main className="dashboard-shell">
      <nav className="topbar" aria-label="Primary">
        <strong>GND Web</strong>
        <form
          action={async () => {
            await logoutFn();
          }}
        >
          <button className="button secondary" type="submit">
            Sign out
          </button>
        </form>
      </nav>

      <section className="workspace">
        <p className="eyebrow">Authenticated dashboard</p>
        <h1>Welcome, {user.email}</h1>
        <p className="lede">
          The first protected TanStack page is live. Future migration phases can
          add app shell navigation, settings, and production workflows behind
          this route guard.
        </p>
      </section>
    </main>
  );
}

import { Link, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">TanStack migration</p>
        <h1>GND Web starts with authentication.</h1>
        <p className="lede">
          This app is the new TanStack Start surface for progressively
          rebuilding authenticated workflows from the current web stack.
        </p>
        <div className="actions">
          <Link
            className="button primary"
            search={{ redirect: "/dashboard" }}
            to="/login"
          >
            Sign in
          </Link>
          <Link className="button secondary" to="/dashboard">
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { getCurrentUserFn, loginFn } from "@/server/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === "string" && search.redirect.startsWith("/")
        ? search.redirect
        : "/dashboard",
  }),
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUserFn();

    if (user) {
      throw redirect({ to: search.redirect });
    }
  },
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Secure access</p>
          <h1 id="login-title">Sign in to GND Web</h1>
          <p className="muted">
            Use the temporary migration credentials from the web app environment.
          </p>
        </div>

        <form
          className="form-stack"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            setIsSubmitting(true);

            const formData = new FormData(event.currentTarget);
            const result = await loginFn({
              data: {
                email: String(formData.get("email") ?? ""),
                password: String(formData.get("password") ?? ""),
              },
            });

            setIsSubmitting(false);

            if (!result.ok) {
              setError(result.message);
              return;
            }

            await navigate({ to: redirectTo });
          }}
        >
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              name="email"
              placeholder="admin@gnd.local"
              required
              type="email"
            />
          </label>

          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              name="password"
              placeholder="Migration password"
              required
              type="password"
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="button primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

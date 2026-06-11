"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Link2,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useState } from "react";

export function DealerLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [emailActionPending, setEmailActionPending] = useState<
    "magic-link" | "password-reset" | null
  >(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setPending(true);

    const normalizedEmail = email.trim();
    const callbackURL = "/";

    try {
      const masterResult = await fetch("/api/auth/dealer-master-sign-in", {
        body: JSON.stringify({
          callbackURL,
          email: normalizedEmail,
          password,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });

      if (masterResult.ok) {
        const data = (await masterResult.json()) as { url?: string };

        window.location.assign(data.url || callbackURL);
        return;
      }

      const result = await authClient.signIn.email({
        email: normalizedEmail,
        password,
        callbackURL,
      });

      if (result.error) {
        setError(result.error.message || "Unable to sign in.");
      }
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function sendMagicLink() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address first.");
      return;
    }

    setError(null);
    setNotice(null);
    setEmailActionPending("magic-link");

    try {
      const result = await authClient.signIn.magicLink({
        email: normalizedEmail,
        callbackURL: "/",
        errorCallbackURL: "/login?error=link",
      });

      if (result.error) {
        setError(result.error.message || "Unable to send login link.");
        return;
      }

      setNotice("If this dealer account is active, a login link is on its way.");
    } catch {
      setError("Unable to send login link. Please try again.");
    } finally {
      setEmailActionPending(null);
    }
  }

  async function requestPasswordReset() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setError("Enter your email address first.");
      return;
    }

    setError(null);
    setNotice(null);
    setEmailActionPending("password-reset");

    try {
      const result = await authClient.requestPasswordReset({
        email: normalizedEmail,
        redirectTo: "/reset-password",
      });

      if (result.error) {
        setError(result.error.message || "Unable to send password reset.");
        return;
      }

      setNotice(
        "If this dealer account is active, password reset instructions are on their way.",
      );
    } catch {
      setError("Unable to send password reset. Please try again.");
    } finally {
      setEmailActionPending(null);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setNotice(null);
    setGooglePending(true);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/login?error=google",
        requestSignUp: true,
        disableRedirect: true,
      });

      if (result.error) {
        setError(result.error.message || "Unable to start Google sign-in.");
        return;
      }

      window.location.assign(result.data?.url || "/");
    } catch {
      setError("Unable to start Google sign-in. Please try again.");
    } finally {
      setGooglePending(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label className="text-slate-700" htmlFor="email">
          Email
        </Label>
        <div className="relative">
          <Mail className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-slate-400" />
          <Input
            autoComplete="email"
            className="h-11 rounded-md border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="dealer@example.com"
            required
            type="email"
            value={email}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700" htmlFor="password">
          Password
        </Label>
        <div className="relative">
          <LockKeyhole className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-slate-400" />
          <Input
            autoComplete="current-password"
            className="h-11 rounded-md border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]"
            id="password"
            minLength={8}
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </div>
        <div className="flex justify-end">
          <button
            className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            disabled={emailActionPending !== null || pending}
            onClick={requestPasswordReset}
            type="button"
          >
            {emailActionPending === "password-reset"
              ? "Sending reset..."
              : "Forgot password?"}
          </button>
        </div>
      </div>
      {error ? (
        <div
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}
      {notice ? (
        <div
          className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <p>{notice}</p>
        </div>
      ) : null}
      <Button
        className="h-11 w-full"
        disabled={googlePending || pending}
        type="submit"
      >
        {pending ? "Signing in..." : "Continue to workspace"}
        <ArrowRight className="size-4" />
      </Button>
      <Button
        className="h-11 w-full"
        disabled={emailActionPending !== null || googlePending || pending}
        onClick={signInWithGoogle}
        type="button"
        variant="outline"
      >
        {googlePending ? "Opening Google..." : "Continue with Google"}
        <span
          aria-hidden="true"
          className="inline-flex size-4 items-center justify-center text-sm font-semibold"
        >
          G
        </span>
      </Button>
      <Button
        className="h-11 w-full"
        disabled={emailActionPending !== null || googlePending || pending}
        onClick={sendMagicLink}
        type="button"
        variant="outline"
      >
        {emailActionPending === "magic-link"
          ? "Sending login link..."
          : "Email me a login link"}
        <Link2 className="size-4" />
      </Button>
      <p className="text-center text-xs leading-5 text-slate-500">
        Access is limited to approved GND dealer accounts.
      </p>
    </form>
  );
}

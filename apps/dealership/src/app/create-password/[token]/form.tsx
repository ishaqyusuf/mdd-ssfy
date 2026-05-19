"use client";

import type { DealerPasswordState } from "./actions";
import { createDealerPassword } from "./actions";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { AlertCircle, ArrowRight, LockKeyhole } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  token: string;
};

const initialState: DealerPasswordState = {
  error: null,
};

export function DealerPasswordForm({ token }: Props) {
  const [state, action] = useActionState(createDealerPassword, initialState);

  return (
    <form action={action} className="space-y-5">
      <input name="token" type="hidden" value={token} />
      <div className="space-y-2">
        <Label className="text-slate-700" htmlFor="password">
          Password
        </Label>
        <div className="relative">
          <LockKeyhole className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-slate-400" />
          <Input
            autoComplete="new-password"
            className="h-11 rounded-md border-slate-200 bg-white pl-10 text-slate-950 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]"
            id="password"
            minLength={8}
            name="password"
            required
            type="password"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-slate-700" htmlFor="confirmPassword">
          Confirm password
        </Label>
        <div className="relative">
          <LockKeyhole className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-slate-400" />
          <Input
            autoComplete="new-password"
            className="h-11 rounded-md border-slate-200 bg-white pl-10 text-slate-950 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]"
            id="confirmPassword"
            minLength={8}
            name="confirmPassword"
            required
            type="password"
          />
        </div>
      </div>
      {state.error ? (
        <div
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{state.error}</p>
        </div>
      ) : null}
      <SubmitButton />
      <p className="text-center text-xs leading-5 text-slate-500">
        Use at least 8 characters. You can change this later from company
        settings.
      </p>
    </form>
  );
}

function SubmitButton() {
  const status = useFormStatus();

  return (
    <Button className="h-11 w-full" disabled={status.pending} type="submit">
      {status.pending ? "Saving..." : "Create password"}
      <ArrowRight className="size-4" />
    </Button>
  );
}

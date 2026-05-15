"use client";

import type { DealerPasswordState } from "./actions";
import { createDealerPassword } from "./actions";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
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
    <form action={action} className="space-y-4">
      <input name="token" type="hidden" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          autoComplete="new-password"
          id="password"
          minLength={8}
          name="password"
          required
          type="password"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          autoComplete="new-password"
          id="confirmPassword"
          minLength={8}
          name="confirmPassword"
          required
          type="password"
        />
      </div>
      {state.error ? (
        <p className="text-sm font-medium text-destructive">{state.error}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const status = useFormStatus();

  return (
    <Button className="w-full" disabled={status.pending} type="submit">
      {status.pending ? "Saving..." : "Create password"}
    </Button>
  );
}

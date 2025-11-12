"use client";

import { SubmitButton } from "@gnd/ui/submit-button";
import { testRun } from "./action";
import { useTransition } from "react";

export function Action({ deviceId }) {
  const [isRunning, startRunning] = useTransition();
  return (
    <SubmitButton
      isSubmitting={isRunning}
      type="button"
      onClick={(e) => {
        startRunning(async () => {
          testRun(deviceId).then((resp) => {
            console.log(resp);
          });
        });
      }}
    >
      TEST
    </SubmitButton>
  );
}

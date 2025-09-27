import { toast } from "@gnd/ui/use-toast";
import { useEffect, useState } from "react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useMutation } from "@tanstack/react-query";
import { TaskName } from "../../../jobs/src/schema";

interface Props {
  successToast?: string;
  errorToast?: string;
  executingToast?: string;
  onError?: any;
  onSucces?: any;
  debug?: boolean;
  silent?: boolean;
  triggerMutation?: any;
}

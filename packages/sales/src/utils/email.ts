import {
  buildSalesReminderTaskPayload,
  type BuildSalesReminderTaskPayloadInput,
  type SalesReminderDraft,
} from "./sales-reminder";

type SendSalesReminderInput = {
  tokenGeneratorFn: BuildSalesReminderTaskPayloadInput["tokenGeneratorFn"];
  trigger?;
  data: SalesReminderDraft[];
  auth: {
    id?: number | string | null;
    name: string;
    email: string;
  };
};

export async function sendSalesEmail(input: SendSalesReminderInput) {
  const payload = await buildSalesReminderTaskPayload({
    auth: input.auth,
    tokenGeneratorFn: input.tokenGeneratorFn,
    data: input.data,
  });

  input.trigger.trigger({
    taskName: "send-sales-reminder",
    payload,
  });
}

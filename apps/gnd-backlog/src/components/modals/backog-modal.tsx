import { useBacklogParams } from "@/hooks/use-backlog-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { backlogFormSchema, saveBacklogSchema } from "@api/db/queries/backlogs";
import { Dialog, Field } from "@gnd/ui/composite";
import { _trpc } from "../static-trpc";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
export function BacklogModal() {
  const { openBacklogId } = useBacklogParams();
  const opened = openBacklogId !== undefined;
  const form = useZodForm(saveBacklogSchema, {
    defaultValues: {},
  });
  const { data, isPending } = useQuery(
    _trpc.backlogs.backlogForm.queryOptions(
      {
        id: openBacklogId!,
      },
      {
        enabled: opened,
      }
    )
  );
  useEffect(() => {
    if (isPending) return;
    form.reset(data);
  }, [data, isPending]);
  const onSubmit = (data) => {
    console.log(data);
  };
  return (
    <Dialog.Root open={opened}>
      <Dialog.Content>
        <Dialog.Title>Task</Dialog.Title>
        <Dialog.Description></Dialog.Description>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          {/* <Field>
            <Field.Label>Task Title</Field.Label>
            <Field.Input {...form.register("title")} />
          </Field> */}
          <Field>
            <Field.Label>Description</Field.Label>
            <Field.Textarea {...form.register("description")} />
          </Field>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

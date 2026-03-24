"use client";

import FormDate from "@/components/common/controls/form-date";
import FormInput from "@/components/common/controls/form-input";
import { FormDebugBtn } from "@/components/form-debug-btn";
import { SubmitButton } from "@/components/submit-button";
import Money from "@/components/_v1/money";
import { useUnitInvoiceParams } from "@/hooks/use-unit-invoice-params";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { saveUnitInvoiceFormSchema } from "@api/db/queries/unit-invoices";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gnd/ui/table";
import { useMutation, useQueryClient } from "@gnd/ui/tanstack";
import { toast } from "@gnd/ui/use-toast";
import { useEffect } from "react";
import { useFieldArray } from "react-hook-form";
import { z } from "zod";
import { CustomModal } from "../modals/custom-modal";

interface Props {
  unitInvoice: RouterOutputs["community"]["getUnitInvoiceForm"];
}

type UnitInvoiceFormValues = z.infer<typeof saveUnitInvoiceFormSchema>;

export function UnitInvoiceForm({ unitInvoice }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { setParams } = useUnitInvoiceParams();
  const form = useZodForm(saveUnitInvoiceFormSchema, {
    defaultValues: {
      homeId: unitInvoice.id,
      duplicateTaskIds: unitInvoice.duplicateTaskIds || [],
      tasks: [],
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "tasks",
  });
  const control = form.control as any;

  useEffect(() => {
    form.reset({
      homeId: unitInvoice.id,
      duplicateTaskIds: unitInvoice.duplicateTaskIds || [],
      tasks: unitInvoice.tasks.map((task) => ({
        id: task.id,
        taskUid: task.taskUid,
        taskName: task.taskName || "",
        amountDue: task.amountDue || 0,
        amountPaid: task.amountPaid || 0,
        checkNo: task.checkNo || "",
        checkDate: task.checkDate ? new Date(task.checkDate) : null,
        createdAt: task.createdAt ? new Date(task.createdAt) : null,
      })),
    });
  }, [form, unitInvoice]);

  const saveInvoice = useMutation(
    trpc.community.saveUnitInvoiceForm.mutationOptions({
      onSuccess() {
        toast({
          title: "Invoice saved",
          variant: "success",
        });
        queryClient.invalidateQueries({
          queryKey: trpc.community.getUnitInvoices.infiniteQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.community.getUnitInvoiceForm.queryKey({
            homeId: unitInvoice.id,
          }),
        });
        setParams(null);
      },
      onError() {
        toast({
          title: "Unable to save invoice",
          variant: "destructive",
        });
      },
    }),
  );

  const deleteTask = useMutation(
    trpc.community.deleteUnitInvoiceTasks.mutationOptions({
      onSuccess() {
        queryClient.invalidateQueries({
          queryKey: trpc.community.getUnitInvoices.infiniteQueryKey(),
        });
      },
    }),
  );

  const tasks = form.watch("tasks");
  const totals = tasks.reduce(
    (acc, task) => {
      acc.due += Number(task.amountDue || 0);
      acc.paid += Number(task.amountPaid || 0);
      return acc;
    },
    {
      due: 0,
      paid: 0,
    },
  );

  const onSubmit = form.handleSubmit((data) => {
    saveInvoice.mutate(data as unknown as UnitInvoiceFormValues);
  });

  return (
    <Form {...form}>
      <form className="space-y-4" id="unit-invoice-form" onSubmit={onSubmit}>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Unit
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {unitInvoice.lotBlock}
            </p>
            <p className="text-xs text-muted-foreground">{unitInvoice.modelName}</p>
          </div>
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700/80">
              Total Due
            </p>
            <Money className="mt-1 text-lg font-semibold text-orange-700" value={totals.due} />
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700/80">
              Total Paid
            </p>
            <Money className="mt-1 text-lg font-semibold text-emerald-700" value={totals.paid} />
          </div>
        </div>

        {/* Mobile card layout */}
        <div className="space-y-3 md:hidden">
          {fields.map((field, index) => {
            const taskUid = form.watch(`tasks.${index}.taskUid`);
            return (
              <div
                key={field.id}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <FormInput
                      className="mx-0"
                      control={control}
                      disabled={!!taskUid}
                      name={`tasks.${index}.taskName` as const}
                      placeholder="Task name"
                      label="Task"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 self-end"
                    disabled={!!taskUid || deleteTask.isPending}
                    onClick={async () => {
                      const taskId = form.getValues(`tasks.${index}.id`);
                      if (taskId) {
                        await deleteTask.mutateAsync({
                          taskIds: [taskId],
                        });
                      }
                      remove(index);
                    }}
                  >
                    <Icons.trash className="size-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    className="mx-0"
                    control={control}
                    disabled={!!taskUid}
                    name={`tasks.${index}.amountDue` as const}
                    label="Due"
                    numericProps={{
                      className: "h-9",
                      prefix: "$",
                      placeholder: "$0.00",
                      type: "tel",
                    }}
                  />
                  <FormInput
                    className="mx-0"
                    control={control}
                    name={`tasks.${index}.amountPaid` as const}
                    label="Paid"
                    numericProps={{
                      className: "h-9",
                      prefix: "$",
                      placeholder: "$0.00",
                      type: "tel",
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FormInput
                    className="mx-0"
                    control={control}
                    name={`tasks.${index}.checkNo` as const}
                    label="Check"
                    placeholder="Check no."
                  />
                  <FormDate
                    className="mx-0"
                    control={control}
                    name={`tasks.${index}.checkDate` as const}
                    label="Check Date"
                    placeholder="Set date"
                    size="sm"
                  />
                </div>
                <FormDate
                  className="mx-0"
                  control={control}
                  name={`tasks.${index}.createdAt` as const}
                  label="Created"
                  placeholder="Created"
                  size="sm"
                />
              </div>
            );
          })}
        </div>

        {/* Desktop table layout */}
        <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Task</TableHead>
                <TableHead className="min-w-[140px]">Due</TableHead>
                <TableHead className="min-w-[140px]">Paid</TableHead>
                <TableHead className="min-w-[140px]">Check</TableHead>
                <TableHead className="min-w-[150px]">Check Date</TableHead>
                <TableHead className="min-w-[150px]">Created</TableHead>
                <TableHead className="w-[72px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const taskUid = form.watch(`tasks.${index}.taskUid`);
                return (
                  <TableRow key={field.id}>
                    <TableCell>
                        <FormInput
                          className="mx-0"
                        control={control}
                        disabled={!!taskUid}
                        name={`tasks.${index}.taskName` as const}
                        placeholder="Task name"
                      />
                    </TableCell>
                    <TableCell>
                        <FormInput
                          className="mx-0"
                        control={control}
                        disabled={!!taskUid}
                        name={`tasks.${index}.amountDue` as const}
                        numericProps={{
                          className: "h-9",
                          prefix: "$",
                          placeholder: "$0.00",
                          type: "tel",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                        <FormInput
                          className="mx-0"
                        control={control}
                        name={`tasks.${index}.amountPaid` as const}
                        numericProps={{
                          className: "h-9",
                          prefix: "$",
                          placeholder: "$0.00",
                          type: "tel",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                        <FormInput
                          className="mx-0"
                        control={control}
                        name={`tasks.${index}.checkNo` as const}
                        placeholder="Check no."
                      />
                    </TableCell>
                    <TableCell>
                      <FormDate
                        className="mx-0"
                        control={control}
                        name={`tasks.${index}.checkDate` as const}
                        placeholder="Set date"
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <FormDate
                        className="mx-0"
                        control={control}
                        name={`tasks.${index}.createdAt` as const}
                        placeholder="Created"
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={!!taskUid || deleteTask.isPending}
                        onClick={async () => {
                          const taskId = form.getValues(`tasks.${index}.id`);
                          if (taskId) {
                            await deleteTask.mutateAsync({
                              taskIds: [taskId],
                            });
                          }
                          remove(index);
                        }}
                      >
                        <Icons.trash className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => {
            append({
              taskName: "",
              amountDue: 0,
              amountPaid: 0,
              checkNo: "",
              checkDate: null,
              createdAt: new Date(),
            });
          }}
        >
          <Icons.add className="mr-2 size-4" />
          Add Task
        </Button>
      </form>

      <CustomModal.Footer className="flex items-center justify-between gap-4 border-t pt-4">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Balance
            </p>
            <Money className="text-lg font-semibold text-slate-900" value={totals.due - totals.paid} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FormDebugBtn />
          <SubmitButton
            form="unit-invoice-form"
            isSubmitting={saveInvoice.isPending}
            type="submit"
          >
            Save
          </SubmitButton>
        </div>
      </CustomModal.Footer>
    </Form>
  );
}

"use client";

import React, { useTransition } from "react";
import {
    _assignJob,
    AssignJobActions,
    AssignJobProps,
} from "@/app/(v1)/_actions/community-job/_assign-jobs";
import { _changeWorker } from "@/app/(v1)/_actions/hrm-jobs/job-actions";
import Btn from "@/components/_v1/btn";
import {
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
} from "@/components/_v1/columns/base-columns";
import Money from "@/components/_v1/money";
import StatusBadge from "@/components/_v1/status-badge";
import { closeModal } from "@/lib/modal";
import { _useAsync } from "@/lib/use-async";
import { ExtendedHomeTasks } from "@/types/community";
import { IJobs } from "@/types/hrm";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@gnd/ui/form";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { ScrollArea } from "@gnd/ui/scroll-area";
import BaseModal from "../base-modal";

interface Props {
    payload: AssignJobProps;
    task: ExtendedHomeTasks;
    jobs: IJobs[];
}
export default function VerifyTaskJobsBeforeAssign() {
    const [isSaving, startTransition] = useTransition();

    async function submit(data: Props) {
        startTransition(async () => {
            const action = form.getValues("action");
            const resp = await _assignJob({
                ...data.payload,
                action,
            });
            closeModal();
            toast.success("Job Assigned!");
        });
    }
    const form = useForm<{ action: AssignJobActions }>({
        defaultValues: {
            action: undefined,
        },
    });

    return (
        <BaseModal<Props>
            className="sm:max-w-[650px]"
            onOpen={(data) => {
                form.reset({
                    action: "ignoreJobs",
                });
            }}
            onClose={() => {}}
            modalName="verifyTaskJobs"
            Title={({ data }) => <>{"Unit has jobs"}</>}
            Subtitle={({ data }) => (
                <>
                    {data?.payload?.__taskSubtitle} has {data?.jobs?.length}{" "}
                    jobs submitted.
                </>
            )}
            Footer={({ data }) => (
                <Btn
                    isLoading={isSaving}
                    onClick={() => submit(data as any)}
                    size="sm"
                    type="submit"
                >
                    Proceed
                </Btn>
            )}
            Content={({ data }) => (
                <Form {...form}>
                    <ScrollArea className="h-[350px] pr-4">
                        <div className="flex flex-col divide-y">
                            {
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Job</TableHead>
                                            <TableHead>Contractor</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data?.jobs?.map((job) => (
                                            <TableRow key={job.id}>
                                                <TableCell>
                                                    <DateCellContent>
                                                        {job.createdAt}
                                                    </DateCellContent>
                                                </TableCell>
                                                <TableCell>
                                                    <PrimaryCellContent>
                                                        {job.title}
                                                    </PrimaryCellContent>
                                                    <SecondaryCellContent>
                                                        {job.subtitle ||
                                                            job.description}
                                                    </SecondaryCellContent>
                                                </TableCell>
                                                <TableCell>
                                                    <PrimaryCellContent>
                                                        {job?.user?.name}
                                                    </PrimaryCellContent>
                                                    <Money value={job.amount} />
                                                </TableCell>
                                                <TableCell>
                                                    <StatusBadge>
                                                        {job.status}
                                                    </StatusBadge>
                                                </TableCell>
                                                <TableCell>
                                                    {/* <Button
                                                        variant={"link"}
                                                        size="sm"
                                                        className="h-7"
                                                    >
                                                        link to job
                                                    </Button> */}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            }
                        </div>
                        <FormField
                            control={form.control}
                            name="action"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        How would you like to proceed?
                                    </FormLabel>
                                    <FormControl>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <SelectTrigger className="h-8">
                                                <SelectValue placeholder="Action" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="ignoreJobs">
                                                        Assign task anyway
                                                    </SelectItem>
                                                    <SelectItem value="ignoreAssign">
                                                        Ignore Assignment
                                                    </SelectItem>
                                                    <SelectItem value="ignoreAssignAndComplete">
                                                        Ignore Assignment, Mark
                                                        Task as Completed
                                                    </SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </ScrollArea>
                </Form>
            )}
        />
    );
}

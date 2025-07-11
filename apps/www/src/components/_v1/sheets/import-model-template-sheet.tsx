"use client";

import React, { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { searchImport } from "@/app/(v1)/_actions/community/_template-import";
import { useDebounce } from "@/hooks/use-debounce";
import { transformCommunityTemplate } from "@/lib/community/community-template";
import { closeModal, openModal } from "@/lib/modal";
import { cn, labelValue } from "@/lib/utils";
import { IJobPayment } from "@/types/hrm";
import { Import, WindArrowDownIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Input } from "@gnd/ui/input";

import { ModelFormProps } from "../../../app/(v1)/(loggedIn)/settings/community/_components/model-form/model-form";
import { Checkbox } from "@gnd/ui/checkbox";
import { Command, CommandInput, CommandList } from "@gnd/ui/command";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import {
    DateCellContent,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../columns/base-columns";
import BaseSheet from "./base-sheet";

export default function ImportModelTemplateSheet({
    form,
    data,
}: ModelFormProps) {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    useEffect(() => {
        setQuery(data?.modelName || "");
    }, []);
    const [result, setResult] = useState<any>([]);
    const [query, setQuery] = React.useState("");

    const debouncedQuery = useDebounce(query, 300);
    async function search() {
        // console.log(data);
        // console.log("searching", query);
        const _res = await searchImport(
            query,
            data?.id,
            // (data as any)?.projectId
            searchType != "Master",
        );
        console.log(_res);
        // console.log(data?.modelName);
        setResult(_res);
    }
    const [searchType, setSearchType] = useState<string>("Community");
    React.useEffect(() => {
        search();
    }, [debouncedQuery, searchType]);
    function importSections(sd) {
        // console.log(sd);
        Object.entries(transformCommunityTemplate(sd)).map(([k, v]) => {
            form.setValue(k as any, v);
        });
        closeModal();
    }
    async function init(data) {}
    return (
        <>
            <Button
                size="sm"
                variant="outline"
                onClick={() => openModal("importModelTemplate")}
            >
                Import
            </Button>
            <BaseSheet<IJobPayment>
                className="w-full sm:max-w-[350px]"
                onOpen={(data) => {
                    init(data);
                }}
                onClose={() => {}}
                modalName="importModelTemplate"
                Title={({ data }) => <div>Import Model</div>}
                Description={({ data }) => (
                    <div className="flex justify-between"></div>
                )}
                Content={({ data }) => (
                    <div>
                        <Command
                            shouldFilter={false}
                            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
                        >
                            <div className="flex">
                                <CommandInput
                                    placeholder="Search catalog..."
                                    value={query}
                                    onValueChange={(e) => {
                                        setQuery(e);
                                    }}
                                />
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <div className="inline-flex items-center space-x-2">
                                            <span>in:</span>
                                            <Button
                                                variant="outline"
                                                className="flex h-8 px-1"
                                            >
                                                {searchType}
                                            </Button>
                                        </div>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="end"
                                        className=""
                                    >
                                        <DropdownMenuItem
                                            onClick={() =>
                                                setSearchType("Community")
                                            }
                                        >
                                            Community
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() =>
                                                setSearchType("Master")
                                            }
                                        >
                                            Master
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <CommandList className=" ">
                                <ScrollArea className="h-[80vh] max-h-none">
                                    <Table>
                                        <TableBody>
                                            {result?.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell>
                                                        <Link
                                                            target="_blank"
                                                            href={``}
                                                            className="group cursor-pointer hover:underline"
                                                        >
                                                            <span className="inline-flex items-center space-x-2 group-hover:underline">
                                                                <PrimaryCellContent>
                                                                    {
                                                                        t.modelName
                                                                    }
                                                                </PrimaryCellContent>
                                                                <WindArrowDownIcon />
                                                            </span>

                                                            <SecondaryCellContent>
                                                                {
                                                                    t.project
                                                                        ?.title
                                                                }
                                                            </SecondaryCellContent>
                                                        </Link>
                                                    </TableCell>
                                                    <TableCell>
                                                        <ImportButton
                                                            data={t}
                                                            _import={(md) => {
                                                                importSections(
                                                                    md,
                                                                );
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </CommandList>
                        </Command>
                        {/* <ScrollArea className="h-screen ">
                            <div className="grid   items-start   text-sm mt-6 mb-28">
                                <Accordion type="single" collapsible>
                                    {result?.map(template => (
                                        <AccordionItem
                                            key={template.id}
                                            value={template.id}
                                        >
                                            <AccordionTrigger>
                                                {template.modelName}
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                Yes. It adheres to the WAI-ARIA
                                                design pattern.
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        </ScrollArea> */}
                    </div>
                )}
                //   Footer={({ data }) => (
                //     <Btn
                //       isLoading={isSaving}
                //       onClick={() => submit()}
                //       size="sm"
                //       type="submit"
                //     >
                //       Save
                //     </Btn>
                //   )}
            />
        </>
    );
}
function ImportButton({ data, _import }) {
    const ls = [
        labelValue("Entry", "entry"),
        labelValue("Garage Door", "garageDoor"),
        labelValue("Interior Door", "interiorDoor"),
        labelValue("Double Door", "doubleDoor"),
        labelValue("Lock & Hardware", "lockHardware"),
        labelValue("Deco & Shutters", "decoShutters"),
    ];
    const [importForm, setImportForm] = useState({});
    useEffect(() => {
        let _ = {};
        ls.map((l) => {
            _[l.value] = true;
        });
        setImportForm(_);
    }, []);
    const [show, setShow] = useState(false);
    function importAction() {
        const designMeta = data.meta?.design;
        if (designMeta) {
            let imp = {};
            Object.entries(designMeta).map(([k, v]) => {
                if (importForm[k]) imp[k] = v;
            });

            _import(imp);
        } else {
            toast.error("Model has no template");
        }
    }
    return (
        <DropdownMenu open={show} onOpenChange={setShow}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className="flex h-8  data-[state=open]:bg-muted"
                >
                    <Import className="mr-2 h-4 w-4" />
                    <span className="">Import</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[185px] space-y-2">
                {ls.map((l) => (
                    <div className="flex items-center space-x-2" key={l.label}>
                        <Checkbox
                            id={l.value}
                            checked={importForm[l.value]}
                            onCheckedChange={(e) => {
                                setImportForm((frm) => {
                                    return {
                                        ...frm,
                                        [l.value]: e,
                                    };
                                });
                            }}
                        />
                        <Label htmlFor={l.value}>{l.label}</Label>
                    </div>
                ))}
                <div className="flex justify-end">
                    <Button className="h-8" size="sm" onClick={importAction}>
                        Import
                    </Button>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

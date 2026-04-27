import { triggerEvent } from "@/actions/events";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { updateSalesExtraCosts } from "@/actions/update-sales-extra-costs";
import {
    getSalesBookFormUseCase,
    saveFormUseCase,
} from "@/app-deps/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { zhInitializeState } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { Icons } from "@gnd/ui/icons";
import { Menu } from "@gnd/ui/custom/menu";
import Button from "@/components/common/button";

import type { CreateSalesHistorySchemaTask } from "@jobs/schema";
import { toast } from "@gnd/ui/use-toast";
import { parseAsBoolean, useQueryStates } from "nuqs";
import { useRouter } from "next/navigation";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { useRef, useState } from "react";

interface Props {
    type?: "button" | "menu";
    and?: "default" | "close" | "new";
}
export function SalesFormSave({ type = "button", and }: Props) {
    const [params] = useQueryStates({
        restoreMode: parseAsBoolean,
    });
    const zus = useFormDataStore();
    const router = useRouter();
    const sq = useSalesQueryClient();
    const tsk = useTaskTrigger({
        silent: true,
    });
    const [isSaving, setIsSaving] = useState(false);
    const saveLockRef = useRef(false);
    async function save(action: "new" | "close" | "default" = "default") {
        if (saveLockRef.current || isSaving) return;
        saveLockRef.current = true;
        setIsSaving(true);
        const { kvFormItem, kvStepForm, metaData, sequence } = zus;
        const restoreMode = params.restoreMode;
        try {
            if (!metaData?.customer?.id) {
                toast({
                    title: "Customer required.",
                    variant: "destructive",
                });
                return;
            }
            const resp = await saveFormUseCase(
                {
                    kvFormItem,
                    kvStepForm,
                    metaData,
                    sequence,
                    saveAction: action,
                    newFeature: true,
                },
                zus.oldFormState,
                {
                    restoreMode,
                    allowRedirect: true,
                },
            );

            const s = resp?.data?.sales;
            tsk.triggerWithAuth("create-sales-history", {
                salesNo: resp.salesNo,
                salesType: resp.salesType,
            } as CreateSalesHistorySchemaTask);
            if (resp?.salesType === "order")
                await resetSalesStatAction(resp.salesId, resp?.salesNo);
            if (s?.updateId) triggerEvent("salesUpdated", s?.id);
            else triggerEvent("salesCreated", s?.id);
            await updateSalesExtraCosts(resp.salesId, zus.metaData?.extraCosts);
            metaData?.type === "order"
                ? sq?.invalidate.salesList()
                : sq?.invalidate?.quoteList();
            switch (action) {
                case "close":
                    router.push(`/sales-book/${metaData.type}s`);
                    break;
                case "default":
                    if (resp.redirectTo) {
                        router.push(resp.redirectTo);
                    } else router.refresh();
                    break;
                case "new":
                    router.push(`/sales-book/create-${metaData.type}`);
            }
            if (!metaData.debugMode) {
                await refetchData();
                if (resp.data?.error)
                    toast({
                        variant: "destructive",
                        title: resp?.data?.error,
                    });
                else {
                    toast({
                        variant: "success",
                        title: "Saved",
                    });
                }
            }
        } finally {
            saveLockRef.current = false;
            setIsSaving(false);
        }
    }
    async function refetchData() {
        if (!zus.metaData.salesId) return;
        const data = await getSalesBookFormUseCase({
            type: zus.metaData.type,
            slug: zus.metaData.salesId,
        });
        zus.init(zhInitializeState(data));
    }
    return type === "button" ? (
        <Button
            icon="save"
            size="sm"
            type="button"
            action={save}
            variant="default"
            disabled={isSaving}
        >
            <span className="">Save</span>
        </Button>
    ) : and ? (
        <Menu.Item Icon={Icons.save} onClick={(e) => save(and)} disabled={isSaving}>
            Save & {and}
        </Menu.Item>
    ) : (
        <>
            <Menu.Item Icon={Icons.save} onClick={(e) => save()} disabled={isSaving}>
                Save
            </Menu.Item>
            <Menu.Item
                Icon={Icons.save}
                disabled={isSaving}
                SubMenu={
                    <>
                        <Menu.Item
                            Icon={Icons.close}
                            disabled={isSaving}
                            onClick={() => save("close")}
                        >
                            Close
                        </Menu.Item>
                        <Menu.Item
                            Icon={Icons.add}
                            disabled={isSaving}
                            onClick={() => save("new")}
                        >
                            New
                        </Menu.Item>
                    </>
                }
            >
                Save &
            </Menu.Item>
        </>
    );
}

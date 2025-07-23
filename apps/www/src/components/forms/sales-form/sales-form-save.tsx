import { useRouter, useSearchParams } from "next/navigation";
import { triggerEvent } from "@/actions/events";
import { resetSalesStatAction } from "@/actions/reset-sales-stat";
import { updateSalesExtraCosts } from "@/actions/update-sales-extra-costs";
import {
    getSalesBookFormUseCase,
    saveFormUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { zhInitializeState } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/zus-form-helper";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import Button from "@/components/common/button";

import { toast } from "sonner";
import { parseAsBoolean, useQueryStates } from "nuqs";
import { useSalesQueryClient } from "@/hooks/use-sales-query-client";

interface Props {
    type: "button" | "menu";
    and?: "default" | "close" | "new";
}
export function SalesFormSave({ type = "button", and }: Props) {
    const [params, setParams] = useQueryStates({
        restoreMode: parseAsBoolean,
    });
    const zus = useFormDataStore();
    const router = useRouter();
    const sq = useSalesQueryClient();
    async function save(action: "new" | "close" | "default" = "default") {
        const { kvFormItem, kvStepForm, metaData, sequence } = zus;
        const restoreMode = params.restoreMode;
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
        if (resp?.salesType == "order")
            await resetSalesStatAction(resp.salesId, resp?.salesNo);
        if (s?.updateId) triggerEvent("salesUpdated", s?.id);
        else triggerEvent("salesCreated", s?.id);
        await updateSalesExtraCosts(resp.salesId, zus.metaData?.extraCosts);
        metaData?.type == "order"
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
            if (resp.data?.error) toast.error(resp.data?.error);
            else {
                toast.success("Saved", {
                    closeButton: true,
                });
            }
        } else {
            toast.info("Debug mode");
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
    return type == "button" ? (
        <Button icon="save" size="xs" action={save} variant="default">
            <span className="">Save</span>
        </Button>
    ) : and ? (
        <Menu.Item Icon={Icons.save} onClick={(e) => save(and)}>
            Save & {and}
        </Menu.Item>
    ) : (
        <>
            <Menu.Item Icon={Icons.save} onClick={(e) => save()}>
                Save
            </Menu.Item>
            <Menu.Item
                Icon={Icons.save}
                SubMenu={
                    <>
                        <Menu.Item
                            Icon={Icons.close}
                            onClick={() => save("close")}
                        >
                            Close
                        </Menu.Item>
                        <Menu.Item Icon={Icons.add} onClick={() => save("new")}>
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

"use client";

import { useEffect, useState } from "react";
import { staticCustomerProfilesAction } from "@/app/(v1)/(loggedIn)/sales/(customers)/_actions/sales-customer-profiles";
import { Info } from "@/components/_v1/info";
import StatusBadge from "@/components/_v1/status-badge";
import FormSelect from "@/components/common/controls/form-select";
import { TableCol } from "@/components/common/data-table/table-cells";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import useEffectLoader from "@/lib/use-effect-loader";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";

import {
    dealershipApprovalAction,
    DealerStatus,
    GetDealersAction,
    resendApprovalTokenAction,
    sendDealerApprovalEmail,
    updateDealerProfileAction,
} from "./action";

export function useDealerSheet() {
    const modal = useModal();

    return {
        open(dealer) {
            modal.openSheet(<DealerOverviewSheet dealer={dealer} />);
        },
    };
}
interface Props {
    dealer: GetDealersAction["data"][number];
}
export default function DealerOverviewSheet({ dealer }: Props) {
    const [reject, setReject] = useState(false);
    const [reason, setReason] = useState("");
    const modal = useModal();

    const profiles = useEffectLoader(staticCustomerProfilesAction);
    async function _action(status: DealerStatus) {
        await dealershipApprovalAction(dealer.id, status);
        modal.close();
        toast.success(`Dealership ${status}!`);
        if (status == "Approved") {
            await updateDealerProfileAction(
                dealer.id,
                +form.getValues("profileId"),
            );
            await sendDealerApprovalEmail(dealer.id);
        }
    }
    async function _resendToken() {
        await resendApprovalTokenAction(dealer.id);
        modal.close();
        toast.success("New Token Sent.");
    }
    function cancelReason() {
        setReason("");
        setReject(false);
    }
    const form = useForm({
        defaultValues: {
            profileId: dealer.dealer.customerTypeId,
        },
    });
    useEffect(() => {
        const profileId = profiles.data?.find((p) => p.defaultProfile)?.id;
        if (!dealer.dealer.customerTypeId && profileId)
            form.reset({
                profileId,
            });
    }, [profiles.data]);
    return (
        <Modal.Content>
            <Modal.Header title={"Dealer Overview"} />
            <div className="mt-4 grid grid-cols-1 gap-4">
                <Info label="Name" value={dealer.dealer.name} />
                <Info label="Company Name" value={dealer.dealer.businessName} />
                <Info label="Email" value={dealer.dealer.email} />
                <Info label="Phone" value={dealer.dealer.phoneNo} />
                <Info
                    label="Address"
                    value={`${dealer.dealer.address}, ${dealer.primaryBillingAddress.city}, ${dealer.primaryBillingAddress.state}`}
                />
                <div className="grid grid-cols-2 gap-4">
                    <Info
                        label="Status"
                        value={<StatusBadge status={dealer.status} />}
                    />
                    <Info
                        label="Application Date"
                        value={
                            <TableCol.Date>{dealer.createdAt}</TableCol.Date>
                        }
                    />
                </div>
            </div>

            <div className={cn(dealer.pendingVerification ? "" : "hidden")}>
                <Modal.Footer
                    submitText="Resend Verification Token"
                    onSubmit={_resendToken}
                    submitVariant="default"
                />
            </div>
            <div className={cn(dealer.tokenExpired ? "" : "hidden")}>
                <Modal.Footer
                    submitText="Reject"
                    onSubmit={() => _action("Rejected")}
                    cancelText="Cancel"
                    cancelBtn
                    submitVariant="destructive"
                    onCancel={cancelReason}
                />
            </div>
            <div className={cn(dealer.tokenExpired ? "" : "hidden")}>
                <Modal.Footer
                    submitText="Reject"
                    onSubmit={() => _action("Rejected")}
                    cancelText="Cancel"
                    cancelBtn
                    submitVariant="destructive"
                    onCancel={cancelReason}
                />
            </div>
            <div
                className={cn(
                    "mt-4 grid gap-4",
                    dealer.status == "Approved" && "hidden",
                )}
            >
                {reject ? (
                    <>
                        <div className="grid gap-2">
                            <Label>Reason</Label>
                            <Textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                        <Modal.Footer
                            submitText="Reject"
                            onSubmit={() => _action("Rejected")}
                            cancelText="Cancel"
                            cancelBtn
                            submitVariant="destructive"
                            onCancel={cancelReason}
                        />
                    </>
                ) : (
                    <>
                        <div className={cn("mt-3")}>
                            <Form {...form}>
                                <FormSelect
                                    label="Dealer Profile"
                                    control={form.control}
                                    name="profileId"
                                    options={profiles.data || []}
                                    titleKey="title"
                                    valueKey="id"
                                />
                            </Form>
                        </div>
                        <Modal.Footer
                            submitText="Approve"
                            onSubmit={() => _action("Approved")}
                            cancelText="Reject"
                            cancelBtn
                            cancelVariant="destructive"
                            onCancel={() => {
                                setReject(true);
                            }}
                        />
                    </>
                )}
                {/* <div className="flex justify-end space-x-4">
                    <Button variant="destructive">Reject</Button>
                    <Button>Approve</Button>
                </div> */}
            </div>
        </Modal.Content>
    );
}

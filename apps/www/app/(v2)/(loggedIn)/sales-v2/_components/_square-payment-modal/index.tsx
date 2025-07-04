import {
    createContext,
    Dispatch,
    SetStateAction,
    useContext,
    useEffect,
    useState,
} from "react";
import {
    cancelTerminalPayment,
    createSalesPayment,
    CreateSalesPaymentProps,
    getSquareDevices,
    getSquareTerminalPaymentStatus,
    squarePaymentSuccessful,
} from "@/_v2/lib/square";
import { Info } from "@/components/_v1/info";
import Money from "@/components/_v1/money";
import Button from "@/components/common/button";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import {
    ModalContextProps,
    useModal,
} from "@/components/common/modal/provider";
import { env } from "@/env.mjs";
import { openLink } from "@/lib/open-link";
import { cn } from "@/lib/utils";
import { TabsContent } from "@radix-ui/react-tabs";
import { CheckCircle2Icon, Dot, Loader2Icon, XCircleIcon } from "lucide-react";
import { useForm, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";
import { SelectItem } from "@gnd/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

import { notify } from "../../../mail-grid/lib/use-mail-event";
import { getSalesPaymentData, GetSalesPaymentData } from "./action";

type FormProps = CreateSalesPaymentProps & {
    modalTitle;
    modalSubtitle;
};
type TabType =
    | "main"
    | "paymentLinkForm"
    | "processingPayment"
    | "paymentProcessFailed"
    | "paymentProcessSuccessful";
const Ctx = createContext<{
    order: GetSalesPaymentData;
    setOrder;
    modal: ModalContextProps;
    tab: TabType;
    setTab: Dispatch<SetStateAction<TabType>>;
    modalTitle;
    modalSubtitle;
    form: UseFormReturn<FormProps>;
}>({} as any);
export default function SquarePaymentModal({ id }: { id: number }) {
    const [order, setOrder] = useState<GetSalesPaymentData>(null as any);

    const modal = useModal();
    useEffect(() => {
        getSalesPaymentData(id)
            .then((data) => {
                setOrder(data);
                console.log(data);
            })
            .catch((e) => {
                if (e instanceof Error) toast.error(e.message);
                modal.close();
            });
    }, []);

    const [tab, setTab] = useState<TabType>("main");

    const form = useForm<FormProps>({
        defaultValues: {},
    });
    const [paymentType, modalTitle, modalSubtitle] = form.watch([
        "type",
        "modalTitle",
        "modalSubtitle",
    ]);
    function defaultFormData() {
        return {
            address: {
                addressLine1: order?.billingAddress?.address1,
            },
            dueAmount: order.amountDue,
            grandTotal: order.grandTotal,
            email: order?.customer?.email,
            phone: order?.customer?.phoneNo,
            orderId: order.id,
            orderIdStr: order.orderId,
            amount: order.amountDue,
            type: "terminal",
            items: order.lineItems,
            modalTitle: order.orderId,
            modalSubtitle: `Payment Information`,
        } as FormProps;
    }
    function resetForm() {
        form.reset(defaultFormData() as any);
    }
    async function _initPaymentForm() {
        resetForm();
        if (order.dealerMode) await createPayment();
        else setTab("paymentLinkForm");
    }

    async function createPayment() {
        // setTab("processingPayment");
        // return;
        try {
            const data = order.dealerMode
                ? defaultFormData()
                : form.getValues();
            if (data.type == "terminal") {
                if (!data.deviceId) throw new Error("Select a terminal");

                if (env.NEXT_PUBLIC_NODE_ENV == "production") {
                    const devices = await getSquareDevices();
                    const selectedDevice = devices.find(
                        (d) => d.value == data.deviceId,
                    );
                    if (!selectedDevice || selectedDevice?.status != "PAIRED") {
                        console.log({ selectedDevice, devices });
                        throw new Error("Selected terminal is not online");
                    }
                }
            }
            let resp = await createSalesPayment(data as any);
            const paymentLink = resp.paymentUrl;
            // console.log({
            //     squareError: resp?.squareError,
            // });
            console.log({ resp, data });
            if (resp?.errors?.length) {
                resp.errors.map((e) => {
                    toast.error(e.detail, {
                        description: e.field,
                    });
                });
                return;
            }
            if (resp?.error) {
                toast?.error(resp?.error);
                return;
            }
            if (data.type == "terminal") {
                if (resp.salesCheckoutId) {
                    form.setValue("salesCheckoutId", resp.salesCheckoutId);
                    form.setValue("paymentId", resp.paymentId);
                    form.setValue("terminalStatus", "processing");
                    form.setValue("modalTitle", "Processing Payment");
                    form.setValue(
                        "modalSubtitle",
                        "Swipe your card to finalize payment",
                    );
                    setTab("processingPayment");
                } else {
                }
            } else {
                await notify("PAYMENT_LINK_CREATED", {
                    customerName:
                        order.customer.businessName || order.customer.name,
                    paymentLink,
                    orderId: order.orderId,
                    email: data.email,
                });
                toast.success("Created");

                if (order.dealerMode) {
                    if (resp.paymentUrl) openLink(resp.paymentUrl, {}, true);
                    else {
                        toast.message(
                            "Check email for payment link or try again",
                        );
                    }
                }
            }
        } catch (error) {
            // console.log(error);
            if (error instanceof Error) toast.error(error.message);
        }
    }
    if (!order) return null;

    return (
        <Ctx.Provider
            value={{
                order,
                setOrder,
                modal,
                tab,
                setTab,
                modalSubtitle,
                modalTitle,
                form,
            }}
        >
            <Modal.Content>
                <Modal.Header title={modalTitle} subtitle={modalSubtitle} />
                <Tabs value={tab} onValueChange={setTab as any}>
                    <TabsList className="hidden">
                        <TabsTrigger value="main"></TabsTrigger>
                        <TabsTrigger value="paymentLinkForm"></TabsTrigger>
                        <TabsTrigger value="processingPayment"></TabsTrigger>
                        <TabsTrigger value="paymentProcessFailed"></TabsTrigger>
                        <TabsTrigger value="paymentProcessSuccessful"></TabsTrigger>
                    </TabsList>
                    <TabsContent value="main">
                        <div className="grid grid-cols-2 gap-4">
                            <Info
                                label="Total Payment"
                                value={<Money value={order.grandTotal}></Money>}
                            />
                            <Info
                                label="Pending Payment"
                                value={<Money value={order.amountDue}></Money>}
                            />
                        </div>
                        <div className="">
                            <Button
                                action={_initPaymentForm}
                                disabled={!order.canCreatePaymentLink}
                                className="w-full"
                            >
                                {order.dealerMode ? "Pay" : " Create Payment"}
                            </Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="paymentLinkForm">
                        <Form {...form}>
                            <div className="grid grid-cols-2 gap-2">
                                <FormInput
                                    control={form.control}
                                    name="email"
                                    size="sm"
                                    label="Email"
                                />
                                <FormInput
                                    control={form.control}
                                    size="sm"
                                    name="phone"
                                    label="Phone"
                                />
                                <FormInput
                                    control={form.control}
                                    size="sm"
                                    className="col-span-2"
                                    name="address.addressLine1"
                                    label="Address"
                                />
                                <FormInput
                                    control={form.control}
                                    size="sm"
                                    name="amount"
                                    label="Amount"
                                />
                                <div className="mb-2 flex items-end">
                                    <FormCheckbox
                                        control={form.control}
                                        name="allowTip"
                                        switchInput
                                        label={"Enable Tip"}
                                    />
                                </div>
                                <FormSelect
                                    options={["terminal", "link"]}
                                    control={form.control}
                                    size="sm"
                                    name="type"
                                    label="Payment Method"
                                />
                                <FormSelect
                                    options={order.terminals || []}
                                    control={form.control}
                                    size="sm"
                                    disabled={paymentType != "terminal"}
                                    name="deviceId"
                                    SelectItem={({ option }) => (
                                        <SelectItem
                                            value={option.value}
                                            disabled={
                                                env.NEXT_PUBLIC_NODE_ENV ==
                                                "production"
                                                    ? option.status != "PAIRED"
                                                    : false
                                            }
                                            className=""
                                        >
                                            <div className="flex items-center gap-2">
                                                <Dot
                                                    className={cn(
                                                        option.status ==
                                                            "PAIRED"
                                                            ? "text-green-500"
                                                            : "text-red-600",
                                                    )}
                                                />
                                                <span>{option.label}</span>
                                            </div>
                                        </SelectItem>
                                    )}
                                    label="Terminal"
                                />
                            </div>
                        </Form>
                        <div className="mt-4">
                            <Modal.Footer
                                submitText="Proceed"
                                onSubmit={createPayment}
                            />
                        </div>
                        {/* <div className="col-span-2 flex justify-end">
                            <Btn onClick={createPayment}>Proceed</Btn>
                        </div> */}
                    </TabsContent>
                    <TerminalComponents />
                </Tabs>
            </Modal.Content>
        </Ctx.Provider>
    );
}

function TerminalComponents({}) {
    const ctx = useContext(Ctx);
    const form = ctx.form;
    const [terminalStatus, paymentId, salesCheckoutId] = ctx.form.watch([
        "terminalStatus",
        "paymentId",
        "salesCheckoutId",
    ]);
    const modal = useModal();
    async function cancelPayment() {
        //  form.setValue("modalTitle", "Payment Failed");
        //  form.setValue(
        //      "modalSubtitle",
        //      "There was an error processing your payment."
        //  ); form.setValue("modalTitle", "Payment Failed");
        await cancelTerminalPayment(salesCheckoutId);
        modal.close();
        toast.error("Payment Cancelled");
        // form.setValue("modalSubtitle", "Payment has been cancelled.");
        // ctx.setTab("paymentProcessFailed");
    }
    useEffect(() => {
        let interval;

        if (terminalStatus == "processing") {
            interval = setInterval(async () => {
                //
                const status = await getSquareTerminalPaymentStatus(
                    paymentId,
                    salesCheckoutId,
                );

                switch (status) {
                    case "COMPLETED":
                        ctx.setTab("paymentProcessSuccessful");
                        form.setValue("modalTitle", "Payment Successful");
                        form.setValue(
                            "modalSubtitle",
                            "Swipe your card to finalize payment",
                        );
                        form.setValue("terminalStatus", "processed");
                        await squarePaymentSuccessful(salesCheckoutId);
                        setTimeout(() => {
                            modal.close();
                        }, 500);
                        break;
                    case "IN_PROGRESS":
                    case "PENDING":
                        form.setValue("modalTitle", "Processing Payment");

                        break;
                    default:
                        form.setValue("modalTitle", "Payment Failed");
                        form.setValue(
                            "modalSubtitle",
                            "There was an error processing your payment.",
                        );
                        ctx.setTab("paymentProcessFailed");
                }
            }, 3000);
        }

        // Cleanup interval on component unmount or when polling stops
        return () => clearInterval(interval);
    }, [terminalStatus]);

    return (
        <>
            <TabsContent value="processingPayment">
                <div className="flex items-center justify-center py-10">
                    <Loader2Icon className="h-16 w-16 animate-spin text-blue-500" />
                </div>
                <div className="flex gap-4">
                    <Button
                        action={cancelPayment}
                        variant="destructive"
                        className="flex-1"
                    >
                        Cancel Payment
                    </Button>
                </div>
            </TabsContent>
            <TabsContent value="processingFailed">
                <div className="flex items-center justify-center py-10">
                    <XCircleIcon className="h-16 w-16 text-red-500" />
                </div>
                <div className="flex gap-4">
                    <Button className="flex-1">Retry Payment</Button>
                    <Button className="flex-1">Cancel</Button>
                </div>
            </TabsContent>
            <TabsContent value="processingSuccessful">
                <div className="flex items-center justify-center py-10">
                    <CheckCircle2Icon className="h-16 w-16 text-green-500" />
                </div>
                <div className="flex gap-4">
                    <Button className="flex-1">Close</Button>
                </div>
            </TabsContent>
        </>
    );
}

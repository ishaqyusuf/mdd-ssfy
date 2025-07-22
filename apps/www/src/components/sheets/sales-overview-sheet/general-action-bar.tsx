import { Menu } from "@/components/(clean-code)/menu";
import { useSalesMailer } from "@/hooks/use-sales-email-sender";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@gnd/ui/alert-dialog";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { useSaleOverview } from "./context";
import { cn } from "@gnd/ui/cn";
import { openLink } from "@/lib/open-link";
import { salesFormUrl } from "@/utils/sales-utils";

export function GeneralActionBar({ type, salesId }) {
    const mailer = useSalesMailer();
    const { data } = useSaleOverview();
    const isQuote = data?.type == "quote";
    return (
        <div className="flex gap-2">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button
                        disabled
                        size="sm"
                        variant="secondary"
                        className="flex items-center space-x-2 hover:bg-secondary flex-1"
                    >
                        <Icons.Notifications className="size-3.5" />
                        <span>Remind</span>
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send Reminder</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to send a reminder for this
                            invoice?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                // sendReminderMutation.mutate({
                                //     id,
                                //     date: new Date().toISOString(),
                                // });
                            }}
                            // disabled={sendReminderMutation.isPending}
                        >
                            Send Reminder
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <Button
                size="sm"
                variant="secondary"
                className="flex-1 items-center space-x-2 hover:bg-secondary"
                onClick={() => {
                    openLink(salesFormUrl(type, salesId, true));
                    // setParams({ invoiceId: id, type: "edit" });
                }}
            >
                <Icons.Edit className="size-3.5" />
                <span>Edit</span>
            </Button>
            <Menu variant="secondary">
                {isQuote ? (
                    <>
                        <Menu.Item
                            // className={cn(!isQuote || "hidden")}
                            onClick={(e) => {
                                mailer.send({
                                    emailType: "without payment",
                                    salesIds: [salesId],
                                    printType: type,
                                });
                            }}
                        >
                            Quote Email
                        </Menu.Item>
                    </>
                ) : (
                    <>
                        <Menu.Item
                            icon="Email"
                            SubMenu={
                                <>
                                    <Menu.Item
                                        // className={cn(!isQuote || "hidden")}
                                        onClick={(e) => {
                                            mailer.send({
                                                emailType: "with payment",
                                                salesIds: [salesId],
                                                printType: type,
                                            });
                                        }}
                                    >
                                        Default
                                    </Menu.Item>
                                    <Menu.Item
                                        disabled
                                        onClick={(e) => {
                                            mailer.send({
                                                emailType: "with part payment",
                                                salesIds: [salesId],
                                                printType: type,
                                            });
                                        }}
                                    >
                                        Part Payment
                                    </Menu.Item>
                                </>
                            }
                        >
                            Payment Link
                        </Menu.Item>
                    </>
                )}
            </Menu>
        </div>
    );
}


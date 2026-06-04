"use client";

import { Icons } from "@gnd/ui/icons";

import Link from "@/components/link";
import { Avatar } from "@/components/avatar";
import { SendSalesReminder } from "@/components/send-sales-reminder";
import { useCustomerOverviewQuery } from "@/hooks/use-customer-overview-query";
import { useNotificationTrigger } from "@/hooks/use-notification-trigger";
import { useSalesOverviewOpen } from "@/hooks/use-sales-overview-open";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { useTRPC } from "@/trpc/client";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@gnd/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@gnd/ui/dialog";
import { Skeleton } from "@gnd/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@gnd/ui/table";

import { Footer } from "./footer";

type Props = {
  setCustomerName: (name: string | null) => void;
};

type OverviewData = RouterOutputs["customers"]["getCustomerOverviewV2"];
type PendingPaymentOrder = OverviewData["general"]["pendingPaymentOrders"][number];
type StatementLine = {
  salesId: number;
  orderNo: string;
  date: string;
  invoice: number;
  paid: number;
  pending: number;
  customer: string;
  phone: string | null;
  address: string | null;
};

export function GeneralTab({ setCustomerName }: Props) {
  const query = useCustomerOverviewQuery();
  const trpc = useTRPC();
  const overviewOpen = useSalesOverviewOpen();
  const [statementOpen, setStatementOpen] = useState(false);
  const statementTrigger = useNotificationTrigger({
    executingToast: "Sending customer statement...",
    taskTitle: "Sending customer statement",
    taskDescription: "We will keep watching this statement email until it finishes.",
    successToast: "Customer statement sent.",
    errorToast: "Unable to send customer statement.",
    onStarted() {
      setStatementOpen(false);
    },
  });

  const overviewQuery = useQuery(
    trpc.customers.getCustomerOverviewV2.queryOptions(
      {
        accountNo: query.accountNo || "",
      },
      {
        enabled: !!query.accountNo,
        staleTime: 60_000,
      },
    ),
  );

  const data = overviewQuery.data;
  const statementLines = useMemo(
    () => buildStatementLines(data?.general.pendingPaymentOrders || []),
    [data?.general.pendingPaymentOrders],
  );
  const statementTotal = statementLines.reduce(
    (total, line) => total + line.pending,
    0,
  );
  const customerName = data?.customer.displayName || "Customer";
  const customerEmail = data?.customer.email || "";
  const statementMessage = `Good Morning ${customerName.split(" ")[0] || customerName}, please see below Statement for the account.`;
  const canGenerateStatement = !overviewQuery.isPending && statementTotal > 0;
  const canSendStatement =
    canGenerateStatement && !!customerEmail && !statementTrigger.isActionPending;

  const sendStatement = () => {
    if (!data || !canSendStatement) return;

    statementTrigger.customerStatement({
      accountNo: data.accountNo,
      customerEmail,
      customerName,
      statementTotal,
      message: statementMessage,
      lines: statementLines,
    });
  };

  useEffect(() => {
    if (!data?.customer.displayName) return;
    setCustomerName(data.customer.displayName);
  }, [data?.customer.displayName, setCustomerName]);

  return (
    <div className="space-y-4">
      <CustomerIdentityCard data={data} isPending={overviewQuery.isPending} />

      <Card>
        <div className="flex">
          <div className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Wallet Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icons.Wallet className="h-4 w-4 text-muted-foreground" />
                {overviewQuery.isPending ? (
                  <Skeleton className="h-8 w-28 rounded-md" />
                ) : (
                  <span className="text-2xl font-bold">
                    {formatCurrency.format(data?.walletBalance || 0)}
                  </span>
                )}
              </div>
            </CardContent>
          </div>
          <div className="border-r" />
          <div className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pending Payment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Icons.Wallet className="h-4 w-4 text-muted-foreground" />
                {overviewQuery.isPending ? (
                  <Skeleton className="h-8 w-28 rounded-md" />
                ) : (
                  <span className="text-2xl font-bold">
                    {formatCurrency.format(data?.general.pendingPayment || 0)}
                  </span>
                )}
              </div>
            </CardContent>
          </div>
        </div>
      </Card>

      <Button
        className="w-full justify-center"
        disabled={!canGenerateStatement}
        onClick={() => setStatementOpen(true)}
        variant="outline"
      >
        <Icons.Send className="mr-2 size-4" />
        Generate statement ({formatCurrency.format(statementTotal)} due)
      </Button>

      <CustomerStatementDialog
        customerEmail={customerEmail}
        customerName={customerName}
        isSending={statementTrigger.isActionPending}
        lines={statementLines}
        message={statementMessage}
        onOpenChange={setStatementOpen}
        onSend={sendStatement}
        open={statementOpen}
        statementTotal={statementTotal}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Analytics</CardTitle>
          <CardDescription>
            Sales and delivery status for this customer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <AnalyticsCard
              title="Pending payment orders"
              value={data?.general.pendingPaymentOrders?.length || 0}
              isPending={overviewQuery.isPending}
              icon={<Icons.Wallet className="size-4 text-amber-600" />}
              description={formatCurrency.format(data?.general.pendingPayment || 0)}
            />
            <AnalyticsCard
              title="Pending delivery orders"
              value={data?.general.pendingDeliveryOrders?.length || 0}
              isPending={overviewQuery.isPending}
              icon={<Icons.Truck className="size-4 text-sky-600" />}
              description="Open delivery work"
            />
            <AnalyticsCard
              title="Sales orders"
              value={data?.general.totalSalesCount || 0}
              isPending={overviewQuery.isPending}
              icon={<Icons.Clock3 className="size-4 text-emerald-600" />}
              description={formatCurrency.format(data?.general.totalSalesValue || 0)}
            />
            <AnalyticsCard
              title="Quotes"
              value={data?.general.totalQuotesCount || 0}
              isPending={overviewQuery.isPending}
              icon={<Icons.Clock3 className="size-4 text-violet-600" />}
              description={formatCurrency.format(data?.general.totalQuotesValue || 0)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <AnalyticsListCard
              title="Pending payment"
              description="Orders that still have a balance due"
              emptyText="No pending payment orders."
              isPending={overviewQuery.isPending}
              items={data?.general.pendingPaymentOrders || []}
              renderAction={(item) => (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => overviewOpen.openSalesAdminSheet(item.uuid || item.orderId)}
                >
                  Open
                </Button>
              )}
              renderMeta={(item) => (
                <Badge variant="outline">
                  {formatCurrency.format(item.amountDue || 0)}
                </Badge>
              )}
            />
            <AnalyticsListCard
              title="Pending delivery"
              description="Orders not yet marked as completed for delivery"
              emptyText="No pending delivery orders."
              isPending={overviewQuery.isPending}
              items={data?.general.pendingDeliveryOrders || []}
              renderAction={(item) => (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => overviewOpen.openSalesAdminSheet(item.uuid || item.orderId)}
                >
                  Open
                </Button>
              )}
              renderMeta={(item) => (
                <Badge variant="outline">
                  {item.status?.delivery?.status || "Pending"}
                </Badge>
              )}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Quick actions</CardTitle>
          <CardDescription>
            Common customer actions from one place
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-4">
          <SendSalesReminder
            salesIds={(data?.general.pendingPaymentOrders || []).map((sale) => sale.id)}
          >
            <Button
              className="w-full justify-start"
              disabled={!data?.general.pendingPaymentOrders?.length}
              variant="outline"
            >
              <Icons.Wallet className="mr-2 size-4" />
              Send payment reminder
            </Button>
          </SendSalesReminder>
          <Button
            className="w-full justify-start"
            variant="outline"
            onClick={() => query.setParams({ tab: "transactions" })}
          >
            <Icons.Clock3 className="mr-2 size-4" />
            View transactions
          </Button>
          <Button asChild className="w-full justify-start" variant="outline">
            <Link href="/sales-book/create-quote">
              <Icons.Plus className="mr-2 size-4" />
              Create new quote
            </Link>
          </Button>
          <Button asChild className="w-full justify-start">
            <Link href="/sales-book/create-order">
              <Icons.Plus className="mr-2 size-4" />
              Create new sales
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Sales</CardTitle>
          <CardDescription>Last 6 orders</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentSalesList
            isPending={overviewQuery.isPending}
            items={data?.salesWorkspace.orders || []}
          />
        </CardContent>
      </Card>

      <Footer />
    </div>
  );
}

function buildStatementLines(items: PendingPaymentOrder[]): StatementLine[] {
  return items
    .filter((item) => Number(item.amountDue || 0) > 0)
    .map((item) => {
      const invoice = Number(item.grandTotal || 0);
      const pending = Number(item.amountDue || 0);
      const paid = Math.max(Number(item.paidAmount ?? invoice - pending), 0);

      return {
        salesId: item.id,
        orderNo: item.orderId,
        date: formatStatementDate(item.createdAt),
        invoice,
        paid,
        pending,
        customer: item.customerName || "Customer",
        phone: item.customerPhone || null,
        address: item.customerAddress || null,
      };
    });
}

function formatStatementDate(value: PendingPaymentOrder["createdAt"]) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return format(date, "MM/dd/yy");
}

function CustomerStatementDialog({
  customerEmail,
  customerName,
  isSending,
  lines,
  message,
  onOpenChange,
  onSend,
  open,
  statementTotal,
}: {
  customerEmail: string;
  customerName: string;
  isSending: boolean;
  lines: StatementLine[];
  message: string;
  onOpenChange: (open: boolean) => void;
  onSend: () => void;
  open: boolean;
  statementTotal: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(96vw,1120px)] p-0">
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>Customer statement</DialogTitle>
          <DialogDescription>
            {customerName} {customerEmail ? `| ${customerEmail}` : "| No email on file"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="rounded-md border bg-muted/20 p-3 text-sm">
            {message}
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
            <div>
              <div className="text-xs text-muted-foreground">Statement</div>
              <div className="font-medium">{lines.length} open invoices</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total due</div>
              <div className="text-lg font-semibold">
                {formatCurrency.format(statementTotal)}
              </div>
            </div>
          </div>

          <div className="max-h-[52vh] overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Sn</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="min-w-48">Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, index) => (
                  <TableRow key={`${line.salesId}-${line.orderNo}`}>
                    <TableCell>{index + 1}.</TableCell>
                    <TableCell>{line.date}</TableCell>
                    <TableCell className="font-medium">{line.orderNo}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency.format(line.invoice)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency.format(line.paid)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency.format(line.pending)}
                    </TableCell>
                    <TableCell>{line.customer}</TableCell>
                    <TableCell>{line.phone || "-"}</TableCell>
                    <TableCell>{line.address || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={5}>TOTAL:</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency.format(statementTotal)}
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </div>

        <DialogFooter className="border-t px-5 py-4">
          <Button
            disabled={!customerEmail || statementTotal <= 0 || isSending}
            onClick={onSend}
          >
            <Icons.Send className="mr-2 size-4" />
            {isSending ? "Sending..." : "Send statement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomerIdentityCard({
  data,
  isPending,
}: {
  data: OverviewData | undefined;
  isPending: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      {isPending ? (
        <Skeleton className="h-16 w-16 rounded-full" />
      ) : (
        <Avatar
          url={null}
          name={data?.customer.displayName}
          className="h-16 w-16"
          fallbackClassName="text-lg"
        />
      )}
      <div>
        <h3 className="text-lg font-semibold">
          {isPending ? (
            <Skeleton className="h-6 w-48 rounded-md" />
          ) : (
            data?.customer.displayName
          )}
        </h3>
        <p className="text-sm text-muted-foreground">
          Customer ID:{" "}
          {isPending ? (
            <Skeleton className="inline-flex h-4 w-28 rounded-md align-middle" />
          ) : (
            data?.accountNo
          )}
        </p>
      </div>
    </div>
  );
}

function AnalyticsCard({
  description,
  icon,
  title,
  value,
  isPending,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
  isPending: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{title}</div>
        {icon}
      </div>
      {isPending ? (
        <Skeleton className="h-8 w-16 rounded-md" />
      ) : (
        <div className="text-2xl font-semibold">{value}</div>
      )}
      <div className="text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

function AnalyticsListCard({
  description,
  emptyText,
  items,
  renderAction,
  renderMeta,
  title,
  isPending,
}: {
  title: string;
  description: string;
  emptyText: string;
  items: any[];
  renderMeta: (item: any) => ReactNode;
  renderAction: (item: any) => ReactNode;
  isPending: boolean;
}) {
  return (
    <div className="rounded-lg border">
      <div className="border-b p-3">
        <div className="font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="divide-y">
        {isPending ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between gap-3 p-3">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-32 rounded-md" />
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          ))
        ) : items.length ? (
          items.slice(0, 5).map((item) => (
            <div
              key={`${item.orderId}-${item.id || item.uuid}`}
              className="flex items-center justify-between gap-3 p-3"
            >
              <div>
                <div className="font-medium">{item.orderId}</div>
                <div className="text-xs text-muted-foreground">
                  {item.customerName || item.displayName || "-"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {renderMeta(item)}
                {renderAction(item)}
              </div>
            </div>
          ))
        ) : (
          <div className="p-6 text-sm text-muted-foreground">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function RecentSalesList({
  items,
  isPending,
}: {
  items: Array<{
    orderId: string;
    salesDate?: string | null;
    poNo?: string | null;
    invoice: { total: number };
    status?: { delivery?: { status?: string | null } } | null;
  }>;
  isPending: boolean;
}) {
  if (isPending) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-3">
            <Skeleton className="h-4 rounded-md" />
            <Skeleton className="h-4 rounded-md" />
            <Skeleton className="h-4 rounded-md" />
            <Skeleton className="h-4 rounded-md" />
            <Skeleton className="h-4 rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-muted-foreground">No customer sales data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Date</span>
        <span>P.O</span>
        <span>Order #</span>
        <span className="text-right">Amount</span>
        <span>Status</span>
      </div>
      {items.slice(0, 6).map((item) => (
        <div
          key={item.orderId}
          className="grid grid-cols-5 gap-3 border-t py-3 text-sm"
        >
          <span>{item.salesDate || "-"}</span>
          <span>{item.poNo || "-"}</span>
          <span>{item.orderId}</span>
          <span className="text-right">{formatCurrency.format(item.invoice.total || 0)}</span>
          <span>{item.status?.delivery?.status || "Pending"}</span>
        </div>
      ))}
    </div>
  );
}

import { BackBtn } from "@/components/back-btn";
import { _qc, _trpc } from "@/components/static-trpc";
import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { formatMoney } from "@gnd/utils";
import { formatDate } from "@gnd/utils/dayjs";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";

export interface JobOverviewV2Props {
  jobId?: string | string[];
  adminMode?: boolean;
}

function parseJobId(value: JobOverviewV2Props["jobId"]) {
  const id = Array.isArray(value) ? value[0] : value;
  const parsed = Number(id);
  return Number.isFinite(parsed) ? parsed : 0;
}

function Header({ overview }: { overview: any }) {
  const normalizedStatus = String(overview?.status || "")
    .toLowerCase()
    .replace(/[_\s]+/g, "-");
  const isPaymentCancelled =
    normalizedStatus === "payment-cancelled" ||
    normalizedStatus === "payment-canceled";

  return (
    <View className="px-4 pb-2 pt-1">
      <View className="rounded-[28px] border border-border bg-card p-4">
        <View className="mb-3 flex-row items-center gap-3">
          <BackBtn />
          <View className="flex-1">
            <Text className="text-[11px] uppercase tracking-[1.2px] text-muted-foreground">
              Job Overview V2
            </Text>
            <Text className="text-xl font-black text-foreground">{overview?.title || "Job"}</Text>
            <Text className="text-xs text-muted-foreground">Created {formatDate(overview?.createdAt)}</Text>
          </View>
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          {isPaymentCancelled ? (
            <>
              <View className="rounded-full bg-primary px-3 py-1">
                <Text className="text-[10px] uppercase text-primary-foreground">Approved</Text>
              </View>
              <View className="rounded-full bg-destructive px-3 py-1">
                <Text className="text-[10px] uppercase text-destructive-foreground">Payment Cancelled</Text>
              </View>
            </>
          ) : (
            <View className="rounded-full bg-primary px-3 py-1">
              <Text className="text-[10px] uppercase text-primary-foreground">{overview?.status}</Text>
            </View>
          )}
          <Text className="text-xs font-mono text-muted-foreground">{overview?.jobId || `#${overview?.id}`}</Text>
        </View>
      </View>
    </View>
  );
}

function CoreInfo({ overview }: { overview: any }) {
  return (
    <View className="gap-3">
      <View className="rounded-3xl border border-border bg-card p-4">
        <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Project & Builder</Text>
        <Text className="text-base font-black text-foreground">{overview?.project?.title || overview?.title}</Text>
        <Text className="text-sm text-muted-foreground">{overview?.project?.builder?.name || "Unknown builder"}</Text>
      </View>

      <View className="rounded-3xl border border-border bg-card p-4">
        <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Location</Text>
        <Text className="text-base font-black text-foreground">{overview?.home?.modelName || "Custom"}</Text>
        <Text className="text-sm text-muted-foreground">{overview?.home?.lotBlock || overview?.subtitle || "-"}</Text>
      </View>

      <View className="rounded-3xl border border-border bg-card p-4">
        <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Assigned Contractor</Text>
        <Text className="text-base font-black text-foreground">{overview?.user?.name || "Unassigned"}</Text>
      </View>
    </View>
  );
}

function ScopeCard({ overview }: { overview: any }) {
  const tasks = overview?.tasks || [];

  return (
    <View className="rounded-3xl border border-border bg-card p-4">
      <Text className="mb-1 text-[11px] uppercase tracking-[1px] text-muted-foreground">Scope of Work</Text>
      <Text className="mb-3 text-sm italic text-muted-foreground">"{overview?.description || "No description"}"</Text>

      {overview?.isCustom ? (
        <View className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
          <Text className="text-sm font-bold text-foreground">Ad-hoc Custom Job</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            This job is custom and does not include standard itemized quantities.
          </Text>
        </View>
      ) : (
        <View className="gap-2">
          <View className="flex-row rounded-2xl bg-muted/40 px-3 py-2">
            <Text className="flex-1 text-[11px] uppercase text-muted-foreground">Task</Text>
            <Text className="w-20 text-right text-[11px] uppercase text-muted-foreground">Rate</Text>
            <Text className="w-20 text-right text-[11px] uppercase text-muted-foreground">Qty</Text>
            <Text className="w-24 text-right text-[11px] uppercase text-muted-foreground">Total</Text>
          </View>
          {tasks.map((task, index) => (
            <View key={index} className="flex-row rounded-2xl border border-border bg-background px-3 py-3">
              <Text className="flex-1 text-sm font-semibold text-foreground">{task.title}</Text>
              <Text className="w-20 text-right text-sm text-muted-foreground">${task.rate}</Text>
              <Text className="w-20 text-right text-sm text-foreground">
                {task.qty}
                {task.maxQty ? `/${task.maxQty}` : ""}
              </Text>
              <Text className="w-24 text-right text-sm font-bold text-foreground">${task.total}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function FinancialCard({ overview }: { overview: any }) {
  const f = overview?.financials;
  return (
    <View className="rounded-3xl border border-border bg-card p-4">
      <Text className="mb-3 text-[11px] uppercase tracking-[1px] text-muted-foreground">Financial Summary</Text>
      <View className="gap-2">
        <View className="flex-row justify-between">
          <Text className="text-sm text-muted-foreground">Subtotal</Text>
          <Text className="text-sm font-bold text-foreground">${Number(f?.subtotal || 0).toFixed(2)}</Text>
        </View>
        {!!f?.addonValue ? (
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted-foreground">Add-on ({f?.addonPercent || 0}%)</Text>
            <Text className="text-sm font-bold text-foreground">+${Number(f?.addonValue || 0).toFixed(2)}</Text>
          </View>
        ) : null}
        {!!f?.extraCharge ? (
          <View className="flex-row justify-between">
            <Text className="text-sm text-muted-foreground">Extra Charge</Text>
            <Text className="text-sm font-bold text-foreground">+${Number(f?.extraCharge || 0).toFixed(2)}</Text>
          </View>
        ) : null}
      </View>
      <View className="my-3 h-px bg-border" />
      <View className="flex-row items-end justify-between">
        <Text className="text-sm font-bold uppercase text-foreground">Grand Total</Text>
        <Text className="text-2xl font-black text-primary">${Number(f?.total || 0).toFixed(2)}</Text>
      </View>
    </View>
  );
}

function PaymentOverview({ paymentId }: { paymentId?: number | null }) {
  const [open, setOpen] = useState(false);
  const { data, isPending, error } = useQuery(
    _trpc.jobs.paymentOverview.queryOptions(
      { paymentId: paymentId || 0 },
      { enabled: open && !!paymentId },
    ),
  );

  if (!paymentId) {
    return (
      <View className="rounded-3xl border border-border bg-card p-4">
        <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Payment Information</Text>
        <Text className="mt-1 text-sm text-muted-foreground">Not in a payment batch.</Text>
      </View>
    );
  }

  return (
    <View className="rounded-3xl border border-border bg-card p-4">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[11px] uppercase tracking-[1px] text-muted-foreground">Payment Information</Text>
        <Button variant="outline" size="sm" onPress={() => setOpen((v) => !v)}>
          <Text className="text-foreground">{open ? "Hide" : "View"}</Text>
        </Button>
      </View>
      <Text className="text-sm text-foreground">Batch Payment ID: #{paymentId}</Text>

      {!open ? null : isPending ? (
        <Text className="mt-2 text-sm text-muted-foreground">Loading payment details...</Text>
      ) : error ? (
        <Text className="mt-2 text-sm text-destructive">Unable to load payment details.</Text>
      ) : data ? (
        <View className="mt-3 gap-2">
          <View className="rounded-2xl bg-muted/30 p-3">
            <Text className="text-sm text-foreground">Amount: ${formatMoney(data.amount || 0)}</Text>
            <Text className="text-sm text-foreground">Subtotal: ${formatMoney(data.subTotal || 0)}</Text>
            <Text className="text-sm text-foreground">Charges: ${formatMoney(data.charges || 0)}</Text>
            <Text className="text-sm text-foreground">Method: {data.paymentMethod || "N/A"}</Text>
            <Text className="text-sm text-foreground">Check No: {data.checkNo || "N/A"}</Text>
            <Text className="text-sm text-foreground">Assigned To: {data.user?.name || "N/A"}</Text>
            <Text className="text-sm text-foreground">Paid By: {data.payer?.name || "N/A"}</Text>
            <Text className="text-sm text-foreground">Created: {data.createdAt ? formatDate(data.createdAt) : "N/A"}</Text>
          </View>

          <View className="gap-2">
            {data.jobs.map((job) => (
              <View key={job.id} className="rounded-2xl border border-border bg-background p-3">
                <View className="flex-row justify-between gap-3">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">
                      {job.title}
                      {job.subtitle ? ` - ${job.subtitle}` : ""}
                    </Text>
                    <Text className="text-xs text-muted-foreground">Job #{job.id} - {job.user?.name || "Unassigned"}</Text>
                  </View>
                  <Text className="text-sm font-bold text-foreground">${formatMoney(job.amount || 0)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function ActivityCard({ jobId }: { jobId: number }) {
  const { data } = useQuery(
    _trpc.jobs.getJobActivityHistory.queryOptions({ jobId }),
  );
  const list = data || [];

  return (
    <View className="rounded-3xl border border-border bg-card p-4">
      <Text className="mb-3 text-[11px] uppercase tracking-[1px] text-muted-foreground">Activity Timeline</Text>
      {!list.length ? (
        <Text className="text-sm text-muted-foreground">No activity history yet.</Text>
      ) : (
        <View className="gap-2">
          {list.map((item: any) => (
            <View key={item.id} className="rounded-2xl bg-muted/30 p-3">
              <Text className="text-sm font-semibold text-foreground">{item.title || item.headline}</Text>
              <Text className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function ReviewActions({ overview, isAdmin }: { overview: any; isAdmin?: boolean }) {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);

  const { mutate: review } = useMutation(
    _trpc.jobs.jobReview.mutationOptions({
      onSuccess(_, variables) {
        _qc.invalidateQueries({
          queryKey: _trpc.jobs.overview.queryKey({ jobId: overview.id }),
        });
        _qc.invalidateQueries({
          queryKey: _trpc.jobs.getJobs.queryKey(),
        });
        Toast.show(
          variables.action === "approve" ? "Job approved" : "Job rejected",
          { type: "success" },
        );
        if (variables.action === "reject") setNote("");
      },
      onError() {
        Toast.show("Unable to update review", { type: "error" });
      },
      onSettled() {
        setPending(null);
      },
    }),
  );

  const handleReview = (action: "approve" | "reject", nextNote?: string) => {
    const payloadNote = nextNote ?? (note || undefined);
    if (action === "reject" && !String(payloadNote || "").trim()) {
      Toast.show("Rejection note is required", { type: "warning" });
      return;
    }
    setPending(action);
    review({
      action,
      jobId: overview.id,
      note: payloadNote,
    });
  };

  if (!isAdmin) return null;

  if (overview.status === "Submitted") {
    return (
      <View className="rounded-3xl border border-border bg-card p-4">
        <Text className="mb-2 text-sm font-bold text-foreground">Approval Required</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          className="mb-3 min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
          placeholder="Add note (required for rejection)"
          placeholderTextColor="hsl(var(--muted-foreground))"
        />
        <View className="flex-row gap-2">
          <Button className="flex-1" onPress={() => handleReview("approve")} disabled={pending !== null}>
            <Text className="text-primary-foreground">Approve Payment</Text>
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onPress={() => handleReview("reject")}
            disabled={!note.trim() || pending !== null}
          >
            <Text className="text-destructive-foreground">Reject & Return</Text>
          </Button>
        </View>
      </View>
    );
  }

  if (overview.status === "Approved") {
    return (
      <View className="rounded-3xl border border-border bg-card p-4">
        <Text className="mb-3 text-sm font-bold text-foreground">Job Approved</Text>
        <View className="flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onPress={() => handleReview("reject", "Approval cancelled by reviewer.")}
            disabled={pending !== null}
          >
            <Text className="text-foreground">Cancel Approval</Text>
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onPress={() => handleReview("reject", "Job rejected after approval review.")}
            disabled={pending !== null}
          >
            <Text className="text-destructive-foreground">Reject Job</Text>
          </Button>
        </View>
      </View>
    );
  }

  if (overview.status === "Rejected") {
    return (
      <View className="rounded-3xl border border-border bg-card p-4">
        <Text className="mb-2 text-sm font-bold text-foreground">Job Rejected</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          className="mb-3 min-h-24 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
          placeholder="Add/update rejection note"
          placeholderTextColor="hsl(var(--muted-foreground))"
        />
        <View className="flex-row gap-2">
          <Button className="flex-1" onPress={() => handleReview("approve")} disabled={pending !== null}>
            <Text className="text-primary-foreground">Approve Job</Text>
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onPress={() => handleReview("reject")}
            disabled={!note.trim() || pending !== null}
          >
            <Text className="text-destructive-foreground">Keep Rejected</Text>
          </Button>
        </View>
      </View>
    );
  }

  return null;
}

export default function JobOverviewV2Screen(props: JobOverviewV2Props) {
  const jobId = parseJobId(props.jobId);
  const isAdmin = !!props.adminMode;

  const { data: overview, isPending, error } = useQuery(
    _trpc.jobs.overview.queryOptions(
      { jobId },
      { enabled: jobId > 0 },
    ),
  );

  if (isPending) {
    return (
      <SafeArea>
        <View className="flex-1 bg-background px-4 pt-4">
          <Skeleton className="h-28 rounded-3xl" />
          <View className="h-3" />
          <Skeleton className="h-44 rounded-3xl" />
          <View className="h-3" />
          <Skeleton className="h-56 rounded-3xl" />
        </View>
      </SafeArea>
    );
  }

  if (error || !overview) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center bg-background px-6">
          <Text className="text-base font-semibold text-foreground">Unable to load job overview.</Text>
          <Text className="mt-1 text-sm text-muted-foreground">Check the job id and try again.</Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <View className="flex-1 bg-background">
        <Header overview={overview} />
        <ScrollView style={{ flex: 1 }} contentContainerClassName="gap-3 px-4 pb-20">
          <ReviewActions overview={overview} isAdmin={isAdmin} />
          <CoreInfo overview={overview} />
          <ScopeCard overview={overview} />
          <FinancialCard overview={overview} />
          <PaymentOverview paymentId={overview?.payment?.id} />
          <ActivityCard jobId={overview.id} />
        </ScrollView>
      </View>
    </SafeArea>
  );
}

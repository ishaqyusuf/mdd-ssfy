"use client";

import Money from "@/components/_v1/money";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Skeleton } from "@gnd/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gnd/ui/table";
import { formatDate } from "@gnd/utils/dayjs";
import {
  CalendarClock,
  CircleDollarSign,
  FolderClock,
  ReceiptText,
} from "lucide-react";

const cards = [
  {
    key: "totalUnits",
    title: "Units",
    icon: ReceiptText,
  },
  {
    key: "totalDue",
    title: "Total Due",
    icon: CircleDollarSign,
    money: true,
  },
  {
    key: "totalPaid",
    title: "Total Paid",
    icon: CircleDollarSign,
    money: true,
  },
  {
    key: "totalOpenBalance",
    title: "Open Balance",
    icon: FolderClock,
    money: true,
  },
  {
    key: "current",
    title: "Current Bucket",
    icon: CalendarClock,
    money: true,
    bucketKey: "current",
  },
] as const;

interface Props {
  data?: {
    data: Array<{
      id: number;
      createdAt: Date;
      projectTitle: string;
      builderName: string;
      lotBlock: string;
      modelName: string;
      taskCount: number;
      jobCount: number;
      totalDue: number;
      totalPaid: number;
      chargeBack: number;
      openBalance: number;
      ageDays: number;
      agingBucket: string;
    }>;
    summary: {
      totalUnits: number;
      totalDue: number;
      totalPaid: number;
      totalOpenBalance: number;
      totalChargeBack: number;
      buckets: {
        current: number;
        days31To60: number;
        days61To90: number;
        days90Plus: number;
      };
    };
  };
  isPending?: boolean;
}

export function InvoiceAgingReport({ data, isPending }: Props) {
  if (isPending || !data) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Card key={index} className="rounded-3xl">
              <CardHeader className="px-4 pb-2 pt-4">
                <Skeleton className="h-4 w-24 rounded-full" />
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4 pt-0">
                <Skeleton className="h-8 w-20 rounded-md" />
                <Skeleton className="h-4 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[420px] rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          const value =
            card.bucketKey
              ? data.summary.buckets[card.bucketKey]
              : data.summary[card.key];

          return (
            <Card
              key={card.key}
              className="rounded-3xl border-slate-200 bg-white/90 shadow-sm"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pb-2 pt-4">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    {card.title}
                  </CardTitle>
                </div>
                <div className="rounded-2xl bg-slate-100 p-2 text-slate-700">
                  <Icon className="size-4" />
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 px-4 pb-4 pt-0">
                {card.money ? (
                  <Money
                    className="text-3xl font-semibold tracking-tight text-slate-950"
                    value={Number(value || 0)}
                  />
                ) : (
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">
                    {value}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <BucketCard
          title="31-60 Days"
          value={data.summary.buckets.days31To60}
        />
        <BucketCard
          title="61-90 Days"
          value={data.summary.buckets.days61To90}
        />
        <BucketCard
          title="90+ Days"
          value={data.summary.buckets.days90Plus}
        />
      </div>

      <div className="rounded-3xl border border-slate-200">
        <Table className="table-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Project / Builder</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Age</TableHead>
              <TableHead>Bucket</TableHead>
              <TableHead className="text-right">Due</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Open</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="min-w-[220px]">
                    <p className="font-semibold text-slate-900">
                      {item.projectTitle}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.builderName}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-semibold text-slate-900">
                      {item.lotBlock}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.modelName}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{formatDate(item.createdAt)}</TableCell>
                <TableCell>{item.ageDays}d</TableCell>
                <TableCell>{item.agingBucket}</TableCell>
                <TableCell className="text-right">
                  <Money value={item.totalDue} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={item.totalPaid} />
                </TableCell>
                <TableCell className="text-right">
                  <Money value={item.openBalance} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function BucketCard({ title, value }: { title: string; value: number }) {
  return (
    <Card className="rounded-3xl border-slate-200 bg-white/90 shadow-sm">
      <CardHeader className="px-4 pb-2 pt-4">
        <CardTitle className="text-sm font-semibold text-slate-700">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <Money
          className="text-2xl font-semibold tracking-tight text-slate-950"
          value={value}
        />
      </CardContent>
    </Card>
  );
}

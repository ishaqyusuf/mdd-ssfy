"use client";

import { Card, CardContent, CardHeader, CardTitle } from "../card";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface SummaryCardItemProps {
  path: string;
  summaryProps: {
    Icon: LucideIcon;
    title: string;
    value: React.ReactNode;
    subtitle?: string;
  };
}

export function SummaryCardItem({ path, summaryProps }: SummaryCardItemProps) {
  const { Icon, title, value, subtitle } = summaryProps;
  return (
    <Link href={path}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
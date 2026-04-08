"use client";

import { motion } from "framer-motion";
import { useMediaQuery } from "react-responsive";

import { useTable } from ".";
import { cn } from "../../../utils";

function formatRange(start: number, end: number) {
  return `${Math.max(1, start)}-${Math.max(start, end)}`;
}

export function PaginationOverlay() {
  const ctx = useTable();
  const isDesktop = useMediaQuery({ query: "(min-width: 769px)" });
  const loadedCount = ctx.totalRowsFetched ?? 0;
  const pagination = ctx.pagination;

  if (!isDesktop || !pagination || pagination.hidden || !loadedCount)
    return null;

  const visibleStart = Math.min(
    pagination.visibleRowStart + 1,
    pagination.totalResults || loadedCount,
  );
  const visibleEnd = Math.min(
    Math.max(pagination.visibleRowEnd + 1, visibleStart),
    loadedCount,
    pagination.totalResults || loadedCount,
  );
  const pageStart = (pagination.activePage - 1) * pagination.pageSize + 1;
  const pageEnd = Math.min(
    pagination.activePage * pagination.pageSize,
    pagination.totalResults || loadedCount,
  );

  return (
    <div className="pointer-events-none fixed bottom-10 left-1/2 z-[9] hidden -translate-x-1/2 md:block">
      <motion.div
        initial={false}
        animate={{
          opacity: 1,
          y: ctx.hasBatchAction ? -72 : 0,
        }}
        transition={{
          duration: 0.22,
          ease: "easeOut",
        }}
        className={cn(
          "pointer-events-auto flex min-w-[260px] items-center justify-between gap-4 overflow-hidden rounded-xl border border-border/70 bg-background/95 px-4 py-2 text-foreground shadow-xl backdrop-blur",
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <p className="whitespace-nowrap text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Page {formatRange(pageStart, pageEnd)}
          </p>
          <p className="whitespace-nowrap text-sm font-medium text-foreground">
            Showing {formatRange(visibleStart, visibleEnd)} of{" "}
            {pagination.totalResults || loadedCount} results
          </p>
        </div>
      </motion.div>
    </div>
  );
}

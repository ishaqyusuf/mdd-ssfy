import type { DispatchCalendarTone } from "@gnd/sales";

// Tone is decided by the Sales domain; this map only owns visual styling.
export const dispatchCalendarToneClasses: Record<DispatchCalendarTone, string> = {
	completed: "border-green-300 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200",
	conflict: "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
	unknown: "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200",
	cancelled: "border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
	queued: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-200",
	in_progress: "border-indigo-200 bg-indigo-50 text-indigo-950 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-200",
	ready: "border-teal-200 bg-teal-50 text-teal-950 dark:border-teal-800 dark:bg-teal-950/30 dark:text-teal-200",
};

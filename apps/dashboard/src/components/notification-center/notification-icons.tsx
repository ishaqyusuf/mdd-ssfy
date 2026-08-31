import { Icons } from "@gnd/ui/icons";

const toneClassNames = {
	emerald:
		"border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
	green:
		"border-green-500/20 bg-green-500/10 text-green-700 dark:text-green-300",
	lime: "border-lime-500/20 bg-lime-500/10 text-lime-700 dark:text-lime-300",
	yellow:
		"border-yellow-500/20 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
	amber:
		"border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
	orange:
		"border-orange-500/20 bg-orange-500/10 text-orange-700 dark:text-orange-300",
	red: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300",
	rose: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
	pink: "border-pink-500/20 bg-pink-500/10 text-pink-700 dark:text-pink-300",
	fuchsia:
		"border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300",
	purple:
		"border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300",
	violet:
		"border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
	indigo:
		"border-indigo-500/20 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
	blue: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300",
	sky: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
	cyan: "border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
	teal: "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
} as const;

type NotificationTone = keyof typeof toneClassNames;

const notificationToneByType: Record<string, NotificationTone> = {
	sales_checkout_success: "emerald",
	sales_payment_recorded: "green",
	quote_accepted: "violet",
	dealer_sales_request: "indigo",
	sales_dispatch_assigned: "sky",
	sales_dispatch_created: "cyan",
	sales_dispatch_queued: "cyan",
	sales_dispatch_packed: "teal",
	sales_dispatch_completed: "teal",
	sales_dispatch_approval_pending_released: "teal",
	sales_dispatch_in_progress: "blue",
	sales_dispatch_date_updated: "blue",
	dispatch_packing_delay: "amber",
	sales_dispatch_packing_reset: "amber",
	sales_dispatch_duplicate_alert: "rose",
	sales_dispatch_trip_canceled: "rose",
	sales_dispatch_unassigned: "rose",
	sales_marked_as_production_completed: "orange",
	sales_production_all_completed: "amber",
	sales_production_submission_material_review: "yellow",
	job_submitted: "blue",
	job_task_configure_request: "cyan",
	employee_document_review: "fuchsia",
	employee_access_revoked: "rose",
	community_documents: "purple",
	community_unit_production_started: "sky",
	community_unit_production_stopped: "rose",
	community_unit_production_completed: "emerald",
	community_unit_production_batch_updated: "indigo",
	inventory_inbound_activity: "lime",
	sales_handoff_action_escalation: "red",
};

const fallbackTones: NotificationTone[] = [
	"pink",
	"violet",
	"blue",
	"teal",
	"orange",
];

function getNotificationTone(type: string) {
	const configuredTone = notificationToneByType[type];
	if (configuredTone) return configuredTone;

	const hash = [...type].reduce(
		(total, character) => total + character.charCodeAt(0),
		0,
	);
	return fallbackTones[hash % fallbackTones.length] ?? "pink";
}

function getNotificationIcon(type: string) {
	switch (type) {
		case "sales_checkout_success":
		case "sales_payment_recorded":
			return <Icons.payment className="size-4" />;
		case "quote_accepted":
		case "dealer_sales_request":
			return <Icons.quotes className="size-4" />;
		case "sales_dispatch_assigned":
		case "sales_dispatch_created":
		case "sales_dispatch_queued":
		case "sales_dispatch_packed":
		case "sales_dispatch_completed":
		case "sales_dispatch_approval_pending_released":
		case "sales_dispatch_in_progress":
		case "sales_dispatch_date_updated":
		case "dispatch_packing_delay":
		case "sales_dispatch_packing_reset":
		case "sales_dispatch_duplicate_alert":
		case "sales_dispatch_trip_canceled":
		case "sales_dispatch_unassigned":
			return <Icons.dispatch className="size-4" />;
		case "sales_marked_as_production_completed":
		case "sales_production_all_completed":
		case "sales_production_submission_material_review":
			return <Icons.production className="size-4" />;
		case "job_submitted":
		case "job_task_configure_request":
			return <Icons.jobs className="size-4" />;
		case "employee_document_review":
		case "employee_access_revoked":
			return <Icons.documentApproval className="size-4" />;
		case "community_documents":
		case "community_unit_production_started":
		case "community_unit_production_stopped":
		case "community_unit_production_completed":
		case "community_unit_production_batch_updated":
			return <Icons.project className="size-4" />;
		case "inventory_inbound_activity":
			return <Icons.Inventory2 className="size-4" />;
		default:
			return <Icons.Notifications className="size-4" />;
	}
}

export function NotificationIcon({ type }: { type: string }) {
	const tone = getNotificationTone(type);

	return (
		<span
			aria-hidden="true"
			className={`flex size-9 shrink-0 items-center justify-center rounded-full border ${toneClassNames[tone]}`}
		>
			{getNotificationIcon(type)}
		</span>
	);
}

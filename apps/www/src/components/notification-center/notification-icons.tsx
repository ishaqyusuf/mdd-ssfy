import { Icons } from "@gnd/ui/icons";

export function getNotificationIcon(type: string) {
	switch (type) {
		case "sales_checkout_success":
		case "sales_payment_recorded":
			return <Icons.payment className="size-4" />;
		case "quote_accepted":
		case "dealer_sales_request":
			return <Icons.quotes className="size-4" />;
		case "sales_dispatch_assigned":
		case "sales_dispatch_duplicate_alert":
		case "dispatch_packing_delay":
			return <Icons.dispatch className="size-4" />;
		case "sales_marked_as_production_completed":
		case "sales_production_all_completed":
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
		default:
			return <Icons.Notifications className="size-4" />;
	}
}

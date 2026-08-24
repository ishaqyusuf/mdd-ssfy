import type { UpdateSalesControl } from "../schema";
import type { Db } from "../types";

export const salesControlTaskPermissionKeys = [
	"editOrders",
	"editPickup",
	"viewPacking",
	"viewDelivery",
	"viewPickup",
	"viewProduction",
	"editProduction",
	"viewMarkSalesOrderFulfilled",
] as const;

export type SalesControlTaskPermission =
	(typeof salesControlTaskPermissionKeys)[number];

export type SalesControlTaskActor = {
	userId: number;
	can: Partial<Record<SalesControlTaskPermission, boolean>>;
};

export class SalesControlTaskAuthorizationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SalesControlTaskAuthorizationError";
	}
}

export function normalizeSalesControlTaskActor(
	input: UpdateSalesControl,
	actor: {
		userId: number;
		name: string | null | undefined;
		canEditProduction: boolean;
	},
) {
	return {
		...input,
		meta: {
			...input.meta,
			authorId: actor.userId,
			authorName: actor.name?.trim() || "Employee",
			allowProductionSubmissionForOthers: actor.canEditProduction,
		},
	};
}

const actionKeys = [
	"submitAll",
	"packItems",
	"clearPackings",
	"cancelDispatch",
	"startDispatch",
	"submitDispatch",
	"createAssignments",
	"updateSubmissions",
	"deleteSubmissions",
	"deleteAssignments",
	"markAsCompleted",
] as const satisfies readonly (keyof UpdateSalesControl)[];

type SalesControlTaskAction = (typeof actionKeys)[number];

function resolveAction(input: UpdateSalesControl): SalesControlTaskAction {
	const selected = actionKeys.filter((action) => Boolean(input[action]));
	if (selected.length !== 1) {
		throw new SalesControlTaskAuthorizationError(
			"Exactly one sales-control action is required.",
		);
	}
	const [action] = selected;
	if (!action) {
		throw new SalesControlTaskAuthorizationError(
			"Exactly one sales-control action is required.",
		);
	}
	return action;
}

function hasAnyPermission(
	actor: SalesControlTaskActor,
	permissions: readonly SalesControlTaskPermission[],
) {
	return permissions.some((permission) => actor.can[permission] === true);
}

function requirePermission(
	actor: SalesControlTaskActor,
	permissions: readonly SalesControlTaskPermission[],
	message: string,
) {
	if (!hasAnyPermission(actor, permissions)) {
		throw new SalesControlTaskAuthorizationError(message);
	}
}

async function requireDispatchScope(
	db: Db,
	input: UpdateSalesControl,
	actor: SalesControlTaskActor,
	dispatchIds: number[],
	options: {
		rolePermissions: readonly SalesControlTaskPermission[];
		assignmentPermissions: readonly SalesControlTaskPermission[];
		allowEmptyRoleScope?: boolean;
		message: string;
	},
) {
	const ids = [
		...new Set(dispatchIds.filter((id) => Number.isInteger(id) && id > 0)),
	];
	const roleScoped = hasAnyPermission(actor, options.rolePermissions);
	if (!ids.length) {
		if (options.allowEmptyRoleScope && roleScoped) return;
		throw new SalesControlTaskAuthorizationError(options.message);
	}

	const dispatches = await db.orderDelivery.findMany({
		where: {
			id: { in: ids },
			salesOrderId: input.meta.salesId,
			deletedAt: null,
		},
		select: { id: true, driverId: true },
	});
	if (dispatches.length !== ids.length) {
		throw new SalesControlTaskAuthorizationError(
			"One or more dispatches do not belong to this sales order.",
		);
	}
	if (roleScoped) return;
	if (
		hasAnyPermission(actor, options.assignmentPermissions) &&
		dispatches.every((dispatch) => dispatch.driverId === actor.userId)
	) {
		return;
	}
	throw new SalesControlTaskAuthorizationError(options.message);
}

async function requireOwnedSubmissionScope(
	db: Db,
	input: UpdateSalesControl,
	actor: SalesControlTaskActor,
	submissionIds: number[],
) {
	const ids = [...new Set(submissionIds)];
	if (!ids.length) {
		throw new SalesControlTaskAuthorizationError(
			"Production workers may update only their own submissions.",
		);
	}
	const submissions = await db.orderProductionSubmissions.findMany({
		where: {
			id: { in: ids },
			salesOrderId: input.meta.salesId,
			submittedById: actor.userId,
			deletedAt: null,
		},
		select: { id: true },
	});
	if (submissions.length !== ids.length) {
		throw new SalesControlTaskAuthorizationError(
			"Production workers may update only their own submissions.",
		);
	}
}

function oneDispatchId(value: number | null | undefined) {
	return value ? [value] : [];
}

export async function authorizeSalesControlTaskInput(
	db: Db,
	input: UpdateSalesControl,
	actor: SalesControlTaskActor,
) {
	if (!Number.isInteger(actor.userId) || actor.userId <= 0) {
		throw new SalesControlTaskAuthorizationError(
			"Authentication is required for sales-control tasks.",
		);
	}
	const activeActor = await db.users.findFirst({
		where: {
			id: actor.userId,
			deletedAt: null,
			accessRevokedAt: null,
		},
		select: { id: true, name: true },
	});
	if (!activeActor) {
		throw new SalesControlTaskAuthorizationError(
			"The sales-control actor is no longer active.",
		);
	}
	const action = resolveAction(input);

	if (action === "submitAll") {
		requirePermission(
			actor,
			["viewProduction", "editProduction"],
			"You do not have permission to submit production work.",
		);
	}
	if (action === "createAssignments" || action === "deleteAssignments") {
		requirePermission(
			actor,
			["editProduction"],
			"You do not have permission to manage production work.",
		);
	}
	if (action === "updateSubmissions" || action === "deleteSubmissions") {
		if (actor.can.editProduction !== true) {
			requirePermission(
				actor,
				["viewProduction"],
				"You do not have permission to update production submissions.",
			);
			if (
				action === "deleteSubmissions" &&
				(input.deleteSubmissions?.itemIds?.length ||
					input.deleteSubmissions?.itemControlUids?.length ||
					input.deleteSubmissions?.allBySalesId ||
					input.deleteSubmissions?.automaticCompletionSalesId)
			) {
				throw new SalesControlTaskAuthorizationError(
					"Production workers may update only their own submissions.",
				);
			}
			await requireOwnedSubmissionScope(
				db,
				input,
				actor,
				action === "updateSubmissions"
					? (input.updateSubmissions?.submissions || []).map(
							(submission) => submission.submissionId,
						)
					: input.deleteSubmissions?.submissionIds || [],
			);
		}
	}
	if (action === "packItems" || action === "clearPackings") {
		await requireDispatchScope(
			db,
			input,
			actor,
			action === "packItems"
				? oneDispatchId(input.packItems?.dispatchId)
				: oneDispatchId(input.clearPackings?.dispatchId),
			{
				rolePermissions: ["viewPacking", "editPickup", "editOrders"],
				assignmentPermissions: ["viewDelivery", "viewPickup"],
				allowEmptyRoleScope: action === "clearPackings",
				message:
					"Only the assigned dispatch actor or a packing manager may update packing.",
			},
		);
	}
	if (
		action === "startDispatch" ||
		action === "submitDispatch" ||
		action === "cancelDispatch"
	) {
		const dispatchIds =
			action === "startDispatch"
				? oneDispatchId(input.startDispatch?.dispatchId)
				: action === "submitDispatch"
					? oneDispatchId(input.submitDispatch?.dispatchId)
					: [
							...(input.cancelDispatch?.dispatchIds || []),
							...oneDispatchId(input.cancelDispatch?.dispatchId),
						];
		await requireDispatchScope(db, input, actor, dispatchIds, {
			rolePermissions: ["viewPacking", "editPickup", "editOrders"],
			assignmentPermissions: ["viewDelivery", "viewPickup"],
			allowEmptyRoleScope: action === "cancelDispatch",
			message:
				"Only the assigned driver or a dispatch manager may update this dispatch.",
		});
	}
	if (action === "markAsCompleted") {
		requirePermission(
			actor,
			["viewMarkSalesOrderFulfilled"],
			"You do not have permission to mark sales orders fulfilled.",
		);
		await requireDispatchScope(
			db,
			input,
			actor,
			oneDispatchId(input.markAsCompleted?.dispatchId),
			{
				rolePermissions: ["viewMarkSalesOrderFulfilled"],
				assignmentPermissions: [],
				message:
					"The fulfillment dispatch does not belong to this sales order.",
			},
		);
	}

	return normalizeSalesControlTaskActor(input, {
		userId: actor.userId,
		name: activeActor.name,
		canEditProduction: actor.can.editProduction === true,
	});
}

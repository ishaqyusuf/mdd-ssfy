import { expect, it } from "bun:test";
import { MutationCache, QueryClient } from "@tanstack/react-query";
import { tableRowActivity } from "@/store/table-row-activity";
import {
	beginMutationRowActivity,
	settleMutationRowActivity,
} from "./mutation";
import { salesPaymentReviewActivity } from "./sales-outcomes";

it("captures before a real mutation and settles before its one refetch", async () => {
	const ownerId = "mutation-lifecycle";
	const events: string[] = [];
	const queryKey = ["lifecycle-orders"];
	const descriptor = salesPaymentReviewActivity(ownerId, true);
	const stop = tableRowActivity.onBegin((activity) => {
		if (activity.ownerId === ownerId)
			events.push(`capture:${activity.entityId}`);
	});
	const client = new QueryClient({
		mutationCache: new MutationCache({
			onMutate: (variables, mutation) =>
				beginMutationRowActivity(mutation, descriptor, variables),
			onSuccess: async (data, _variables, _context, mutation) => {
				settleMutationRowActivity(mutation, data);
				events.push(
					...[...tableRowActivity.getSnapshot().values()]
						.filter((row) => row.ownerId === ownerId)
						.map((row) => `${row.entityId}:${row.phase}`),
				);
				await client.fetchQuery({
					queryKey,
					queryFn: async () => {
						events.push("refetch");
						return [{ id: 2 }];
					},
				});
			},
			onError: (_error, _variables, _context, mutation) =>
				settleMutationRowActivity(mutation, undefined, true),
		}),
	});
	client.setQueryData(queryKey, [{ id: 1 }, { id: 2 }]);
	try {
		const mutation = client.getMutationCache().build(client, {
			mutationFn: async (_input: { salesIds: number[] }) => {
				events.push("request");
				return { reviewed: [{ salesId: 1 }], skipped: [{ salesId: 2 }] };
			},
		});
		await mutation.execute({ salesIds: [1, 2] });
		expect(events).toEqual([
			"capture:1",
			"capture:2",
			"request",
			"1:success",
			"2:unknown",
			"refetch",
		]);
		expect(client.getQueryData(queryKey)).toEqual([{ id: 2 }]);
	} finally {
		stop();
		tableRowActivity.clearOwner(ownerId);
		client.clear();
	}
});

it("settles failure even when a mutation owns its local error handler", async () => {
	const ownerId = "mutation-failure";
	const events: string[] = [];
	const client = new QueryClient({
		mutationCache: new MutationCache({
			onMutate: (variables, mutation) =>
				beginMutationRowActivity(
					mutation,
					salesPaymentReviewActivity(ownerId),
					variables,
				),
			onError: (_error, _variables, _context, mutation) => {
				settleMutationRowActivity(mutation, undefined, true);
				events.push("settled");
			},
		}),
	});
	try {
		const mutation = client.getMutationCache().build(client, {
			mutationFn: async (_input: { salesId: number }) => {
				throw new Error("Rejected");
			},
			onError: () => {
				events.push("local error");
			},
		});
		await mutation.execute({ salesId: 1 }).catch(() => {});
		expect(events).toEqual(["settled", "local error"]);
		expect(
			[...tableRowActivity.getSnapshot().values()].find(
				(row) => row.ownerId === ownerId,
			)?.phase,
		).toBe("error");
	} finally {
		tableRowActivity.clearOwner(ownerId);
		client.clear();
	}
});

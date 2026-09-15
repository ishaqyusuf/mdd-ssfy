"use client";

import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { Field, FieldLabel } from "@gnd/ui/field";
import { Switch } from "@gnd/ui/switch";
import { useMutation, useQuery, useQueryClient } from "@gnd/ui/tanstack";
import { Textarea } from "@gnd/ui/textarea";
import { toast } from "@gnd/ui/use-toast";
import { useState } from "react";

export function SalesRequestGuidanceSection() {
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const query = useQuery(
		trpc.salesRequest.listClarificationGuidance.queryOptions(),
	);
	const [editing, setEditing] = useState<{
		key: string;
		answer: string;
		active: boolean;
	} | null>(null);
	const save = useMutation(
		trpc.salesRequest.setClarificationGuidance.mutationOptions({
			async onSuccess() {
				setEditing(null);
				await queryClient.invalidateQueries({
					queryKey: trpc.salesRequest.listClarificationGuidance.queryKey(),
				});
				toast({ variant: "success", title: "Saved guidance updated" });
			},
			onError(error) {
				toast({
					variant: "destructive",
					title: "Unable to update guidance",
					description: error.message,
				});
			},
		}),
	);
	return (
		<section
			aria-label="Saved request guidance"
			className="flex flex-col gap-4"
		>
			<p className="text-sm text-muted-foreground">
				Your saved clarifications are reused when relevant. Edit or disable an
				answer here. New customer instructions take precedence.
			</p>
			{query.isPending ? (
				<output>Loading saved guidance…</output>
			) : query.isError ? (
				<div role="alert">
					<p>{query.error.message}</p>
					<Button
						type="button"
						variant="outline"
						onClick={() => void query.refetch()}
					>
						Retry
					</Button>
				</div>
			) : !query.data.length ? (
				<p className="text-sm text-muted-foreground">
					No reusable clarifications yet.
				</p>
			) : (
				query.data.map((item) => {
					const key = `${item.sessionId}:${item.questionId}`;
					const draft = editing?.key === key ? editing : null;
					return (
						<div
							key={key}
							className="flex flex-col gap-3 rounded-md border p-4"
						>
							<p className="text-sm font-medium">{item.question.question}</p>
							{item.question.sourceText && (
								<p className="whitespace-pre-wrap text-xs text-muted-foreground">
									{item.question.sourceText}
								</p>
							)}
							{draft ? (
								<>
									<Field>
										<FieldLabel htmlFor={`guidance-${key}`}>
											Saved answer
										</FieldLabel>
										<Textarea
											id={`guidance-${key}`}
											value={draft.answer}
											maxLength={2000}
											disabled={save.isPending}
											onChange={(event) =>
												setEditing({ ...draft, answer: event.target.value })
											}
										/>
									</Field>
									<Field orientation="horizontal">
										<Switch
											id={`guidance-active-${key}`}
											checked={draft.active}
											disabled={save.isPending}
											onCheckedChange={(active) =>
												setEditing({ ...draft, active })
											}
										/>
										<FieldLabel htmlFor={`guidance-active-${key}`}>
											Use in future requests
										</FieldLabel>
									</Field>
									<div className="flex gap-2">
										<Button
											type="button"
											disabled={save.isPending || !draft.answer.trim()}
											onClick={() =>
												save.mutate({
													sessionId: item.sessionId,
													questionId: item.questionId,
													active: draft.active,
													answer: draft.answer,
												})
											}
										>
											Save answer
										</Button>
										<Button
											type="button"
											variant="outline"
											disabled={save.isPending}
											onClick={() => setEditing(null)}
										>
											Cancel
										</Button>
									</div>
								</>
							) : (
								<>
									<p className="whitespace-pre-wrap text-sm">{item.answer}</p>
									<div className="flex items-center justify-between gap-3">
										<span className="text-xs text-muted-foreground">
											{item.active ? "Enabled" : "Disabled"}
										</span>
										<Button
											type="button"
											variant="outline"
											disabled={save.isPending}
											onClick={() =>
												setEditing({
													key,
													answer: item.answer,
													active: item.active,
												})
											}
										>
											Edit saved answer
										</Button>
									</div>
								</>
							)}
						</div>
					);
				})
			)}
		</section>
	);
}

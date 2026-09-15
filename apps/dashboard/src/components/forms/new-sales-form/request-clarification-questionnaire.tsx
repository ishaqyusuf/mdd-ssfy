"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@gnd/ui/field";
import { Textarea } from "@gnd/ui/textarea";
import { useId, useState } from "react";
import type {
	SalesRequestClarification,
	SalesRequestClarificationAnswer,
	SalesRequestGenerationSnapshot,
} from "./request-generation-controller";

export function RequestClarificationQuestionnaire({
	clarification,
	history,
	pending,
	stale,
	onSubmit,
}: {
	clarification: SalesRequestClarification;
	history: SalesRequestGenerationSnapshot["clarificationHistory"];
	pending: boolean;
	stale: boolean;
	onSubmit: (answers: SalesRequestClarificationAnswer[]) => void;
}) {
	const prefix = useId();
	const [answers, setAnswers] = useState(() =>
		clarification.questions.map((question) => ({
			questionId: question.id,
			answer: "",
			reuse: true,
		})),
	);
	const canSubmit =
		!pending && !stale && answers.every((answer) => answer.answer.trim());
	function update(id: string, patch: Partial<SalesRequestClarificationAnswer>) {
		setAnswers((current) =>
			current.map((answer) =>
				answer.questionId === id ? { ...answer, ...patch } : answer,
			),
		);
	}
	return (
		<section
			aria-label="Request clarification"
			className="rounded-md border p-4"
		>
			<h3 className="font-medium">
				A few details to confirm · Round {clarification.round}
			</h3>
			<p className="mt-1 mb-4 text-sm text-muted-foreground">
				Answer these questions, then continue. We may ask follow-up questions
				before preparing your draft.
			</p>
			{history.length ? (
				<details className="mb-4 text-sm">
					<summary className="cursor-pointer">
						Previous answers ({history.length}{" "}
						{history.length === 1 ? "round" : "rounds"})
					</summary>
					{history.map((round) => (
						<div key={round.round} className="mt-3">
							<p className="font-medium">Round {round.round}</p>
							{round.answers.map((answer, index) => (
								<div key={index} className="mt-2">
									<p>{answer.question}</p>
									<p className="whitespace-pre-wrap text-muted-foreground">
										{answer.answer}
									</p>
								</div>
							))}
						</div>
					))}
				</details>
			) : null}
			<FieldGroup>
				{clarification.questions.map((question) => {
					const answer = answers.find(
						(item) => item.questionId === question.id,
					)!;
					const id = `${prefix}-${question.id}`;
					return (
						<Field key={question.id}>
							<FieldLabel htmlFor={id}>{question.question}</FieldLabel>
							{question.sourceText ? (
								<blockquote className="border-l-2 pl-3 text-sm text-muted-foreground whitespace-pre-wrap">
									{question.sourceText}
								</blockquote>
							) : null}
							<FieldDescription>{question.reason}</FieldDescription>
							<Textarea
								id={id}
								value={answer.answer}
								maxLength={2000}
								disabled={pending || stale}
								onChange={(event) =>
									update(question.id, { answer: event.target.value })
								}
								placeholder="Enter the confirmed details"
							/>
							<Field orientation="horizontal">
								<Checkbox
									id={`${id}-reuse`}
									checked={answer.reuse}
									disabled={pending || stale}
									onCheckedChange={(checked) =>
										update(question.id, { reuse: checked === true })
									}
								/>
								<FieldLabel
									htmlFor={`${id}-reuse`}
									className="text-xs font-normal"
								>
									Use this answer to improve future request interpretation
								</FieldLabel>
							</Field>
						</Field>
					);
				})}
			</FieldGroup>
			<p className="mt-4 text-xs text-muted-foreground">
				Every answer applies to this request. Checked answers can guide matching
				products and terminology in future requests. Quantities and dimensions
				stay with this request.
			</p>
			{stale ? (
				<p role="alert" className="mt-3 text-sm text-destructive">
					The request or configuration changed. Generate again before answering.
				</p>
			) : null}
			<Button
				type="button"
				className="mt-4"
				disabled={!canSubmit}
				onClick={() => onSubmit(answers)}
			>
				{pending ? "Reviewing answers…" : "Continue with answers"}
			</Button>
		</section>
	);
}

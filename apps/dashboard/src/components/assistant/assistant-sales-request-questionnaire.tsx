"use client";

import { useTRPC, useTRPCClient } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Field, FieldGroup } from "@gnd/ui/field";
import { Input } from "@gnd/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupTextarea,
} from "@gnd/ui/input-group";
import { useQuery } from "@gnd/ui/tanstack";
import {
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	LoaderCircle,
} from "lucide-react";
import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import { shouldSubmitAssistantComposerKey } from "./assistant-chat-state";

function canSaveAnswerAsRule(
	question: { canSaveRule?: boolean; options?: { value: string }[] },
	answer: string,
) {
	return (
		question.canSaveRule === true &&
		(!/[0-9]/.test(answer) ||
			Boolean(
				question.options?.some(
					(option) =>
						option.value.toLowerCase() === answer.trim().toLowerCase(),
				),
			))
	);
}

export function AssistantSalesRequestQuestionnaire({
	conversationId,
	refreshKey,
	onChanged,
	placement = "transcript",
	children,
	disabled = false,
}: {
	conversationId: string;
	refreshKey: number;
	onChanged: () => void;
	placement?: "transcript" | "composer";
	children?: ReactNode;
	disabled?: boolean;
}) {
	const trpc = useTRPC();
	const client = useTRPCClient();
	const session = useQuery({
		...trpc.assistant.salesRequestSession.queryOptions({ conversationId }),
		staleTime: 0,
		refetchOnMount: "always",
		refetchInterval: (query) =>
			query.state.data?.status === "processing" ? 3000 : false,
	});
	const [answers, setAnswers] = useState<Record<string, string>>({});
	const [customAnswers, setCustomAnswers] = useState<Record<string, string>>(
		{},
	);
	const [otherSelected, setOtherSelected] = useState<Record<string, boolean>>(
		{},
	);
	const [reuse, setReuse] = useState<Record<string, boolean>>({});
	const [questionIndex, setQuestionIndex] = useState(0);
	const [hydratedKey, setHydratedKey] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [moreOpen, setMoreOpen] = useState(false);
	const [optionSearch, setOptionSearch] = useState("");
	const optionsRef = useRef<HTMLDivElement>(null);
	const round = session.data?.revision;
	const draftKey = round
		? `assistant-sales-answers:${conversationId}:${round}`
		: null;
	useEffect(() => {
		void session.refetch();
	}, [session.refetch]);
	useEffect(() => {
		if (refreshKey > 0) void session.refetch();
	}, [refreshKey, session.refetch]);
	useEffect(() => {
		if (placement !== "composer" || !draftKey) return;
		try {
			const raw = sessionStorage.getItem(draftKey);
			const draft = raw ? JSON.parse(raw) : null;
			setAnswers(
				draft?.answers && typeof draft.answers === "object"
					? draft.answers
					: {},
			);
			setCustomAnswers(
				draft?.customAnswers && typeof draft.customAnswers === "object"
					? draft.customAnswers
					: {},
			);
			setOtherSelected(
				draft?.otherSelected && typeof draft.otherSelected === "object"
					? draft.otherSelected
					: {},
			);
			setReuse(
				draft?.reuse && typeof draft.reuse === "object" ? draft.reuse : {},
			);
			setQuestionIndex(
				Number.isInteger(draft?.questionIndex) && draft.questionIndex >= 0
					? draft.questionIndex
					: 0,
			);
		} catch {
			setAnswers({});
			setCustomAnswers({});
			setOtherSelected({});
			setReuse({});
			setQuestionIndex(0);
		}
		setHydratedKey(draftKey);
	}, [draftKey, placement]);
	useEffect(() => {
		if (placement !== "composer" || !draftKey || hydratedKey !== draftKey)
			return;
		try {
			sessionStorage.setItem(
				draftKey,
				JSON.stringify({
					answers,
					customAnswers,
					otherSelected,
					reuse,
					questionIndex,
				}),
			);
		} catch {
			// The server still owns submitted answers when browser storage is disabled.
		}
	}, [
		placement,
		draftKey,
		hydratedKey,
		answers,
		customAnswers,
		otherSelected,
		reuse,
		questionIndex,
	]);

	const submit = async (submittedAnswers = answers) => {
		const questions = session.data?.questions ?? [];
		if (!round || !questions.length || busy) return;
		setBusy(true);
		setError(null);
		try {
			await client.assistant.answerSalesRequest.mutate({
				conversationId,
				revision: round,
				answers: questions.map((question) => ({
					questionId: question.id,
					answer: submittedAnswers[question.id]?.trim() ?? "",
					reuse:
						Boolean(reuse[question.id]) &&
						canSaveAnswerAsRule(question, submittedAnswers[question.id] ?? ""),
				})),
			});
			if (draftKey) {
				try {
					sessionStorage.removeItem(draftKey);
				} catch {
					/* Browser storage is optional. */
				}
			}
			await session.refetch();
			setAnswers({});
			setCustomAnswers({});
			setOtherSelected({});
			setReuse({});
			setQuestionIndex(0);
			onChanged();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "The answers could not be submitted. Reload and try again.",
			);
			await session.refetch();
		} finally {
			setBusy(false);
		}
	};
	if (session.isError && placement === "composer") return children;
	if (session.isError)
		return (
			<div className="rounded-lg border bg-card p-4 text-sm" role="alert">
				Sales Request questions could not be loaded: {session.error.message}
				<Button
					type="button"
					size="sm"
					variant="outline"
					className="ml-2"
					onClick={() => void session.refetch()}
				>
					Retry
				</Button>
			</div>
		);
	if (!session.data) return placement === "composer" ? children : null;
	const request = session.data;
	if (placement === "composer" && request.status !== "awaiting")
		return children;
	if (placement === "transcript" && request.status === "awaiting") return null;
	if (request.status === "processing")
		return (
			<output className="block rounded-lg border bg-card p-4 text-sm">
				<LoaderCircle size={16} className="mr-2 inline animate-spin" />{" "}
				Preparing your Sales Request…
			</output>
		);
	if (request.status === "failed")
		return (
			<div className="rounded-lg border bg-card p-4 text-sm" role="alert">
				{request.errorMessage ??
					"The Sales Request could not be completed. Start a new chat to retry safely."}
			</div>
		);
	if (request.status === "ready" && request.preview) {
		if (request.savedSale)
			return (
				<section
					className="rounded-lg border bg-card p-4 text-sm"
					aria-label="Sales Request result"
				>
					<p className="font-medium">{`${request.type === "order" ? "Order" : "Quote"} ${request.savedSale.orderId} saved.`}</p>
					<a
						href={`/sales-form/edit-${request.type}/${encodeURIComponent(request.savedSale.slug)}`}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-3 inline-flex items-center gap-2 underline underline-offset-4"
					>
						Open saved {request.type}{" "}
						<ExternalLink size={14} aria-hidden="true" />
					</a>
				</section>
			);
		if (!request.preview.seed.lineItems.length)
			return (
				<section
					className="rounded-lg border bg-card p-4 text-sm"
					aria-label="Sales Request result"
				>
					<p className="font-medium">This request needs manual review.</p>
					<p className="mt-1 text-muted-foreground">
						No catalog-compatible Sales line was found. Nothing has been saved
						or charged.
					</p>
				</section>
			);
		const href = `/sales-form/create-${request.type}?${new URLSearchParams({
			salesRequestGeneration: request.preview.generationId,
			assistantChat: conversationId,
		})}`;
		return (
			<section
				className="rounded-lg border bg-card p-4 text-sm"
				aria-label="Sales Request result"
			>
				<p className="font-medium">
					{request.preview.unresolvedCount > 0
						? "Draft needs review."
						: `Your ${request.type} draft is ready for review.`}
				</p>
				{request.preview.unresolvedCount > 0 ? (
					<p className="mt-1 text-muted-foreground">
						{request.preview.unresolvedCount} unresolved request detail
						{request.preview.unresolvedCount === 1 ? "" : "s"}.
					</p>
				) : null}
				<p className="mt-1 text-muted-foreground">
					Nothing has been saved or charged.
				</p>
				<a
					href={href}
					target="_blank"
					rel="noopener noreferrer"
					className="mt-3 inline-flex items-center gap-2 underline underline-offset-4"
				>
					Open the Sales form in a new tab{" "}
					<ExternalLink size={14} aria-hidden="true" />
				</a>
			</section>
		);
	}
	if (request.status !== "awaiting" || !request.questions.length) return null;
	const currentIndex = Math.min(questionIndex, request.questions.length - 1);
	const question = request.questions[currentIndex];
	const hasOptions = Boolean(question.options?.length);
	const options = question.options ?? [];
	const compactOptions =
		options.length > 0 && options.every((option) => option.label.length <= 15);
	const shownOptions = compactOptions ? options : options.slice(0, 3);
	const filteredOptions = options.filter((option) =>
		option.label.toLowerCase().includes(optionSearch.trim().toLowerCase()),
	);
	const showTextAnswer = !hasOptions || otherSelected[question.id];
	const showRule =
		(hasOptions && question.canSaveRule === true) ||
		canSaveAnswerAsRule(question, answers[question.id] ?? "");
	const questionPrompt = question.question.startsWith("Please clarify ")
		? question.reason
		: question.question;
	const finalQuestion = currentIndex === request.questions.length - 1;
	const advance = () => {
		if (disabled || busy || !answers[question.id]?.trim()) return;
		if (finalQuestion) {
			if (request.questions.some((item) => !answers[item.id]?.trim())) return;
			void submit();
		} else setQuestionIndex(currentIndex + 1);
	};
	const selectOption = (value: string) => {
		if (disabled || busy) return;
		const nextAnswers = { ...answers, [question.id]: value };
		setOtherSelected((current) => ({ ...current, [question.id]: false }));
		setAnswers(nextAnswers);
		if (!finalQuestion) {
			setQuestionIndex(currentIndex + 1);
			return;
		}
		const missingIndex = request.questions.findIndex(
			(item) => !nextAnswers[item.id]?.trim(),
		);
		if (missingIndex >= 0) setQuestionIndex(missingIndex);
		else void submit(nextAnswers);
	};
	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (
			shouldSubmitAssistantComposerKey({
				key: event.key,
				shiftKey: event.shiftKey,
				isComposing: event.nativeEvent.isComposing,
			})
		) {
			event.preventDefault();
			advance();
		}
	};
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				advance();
			}}
			aria-label="Sales Request questions"
		>
			<FieldGroup>
				<Field>
					<InputGroup>
						<InputGroupAddon align="block-start" className="w-full">
							<div className="w-full space-y-1 text-sm">
								<div className="flex items-start justify-between gap-3">
									<p
										id={`sales-question-${question.id}`}
										className="min-w-0 flex-1 pt-1 font-medium"
									>
										{questionPrompt}
									</p>
									{request.questions.length > 1 ? (
										<div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
											<span>
												{currentIndex + 1} of {request.questions.length}
											</span>
											<InputGroupButton
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label="Previous question"
												disabled={currentIndex === 0}
												onClick={() => setQuestionIndex(currentIndex - 1)}
											>
												<ChevronLeft size={16} />
											</InputGroupButton>
											<InputGroupButton
												type="button"
												variant="ghost"
												size="icon-sm"
												aria-label="Next question"
												disabled={finalQuestion}
												onClick={() => setQuestionIndex(currentIndex + 1)}
											>
												<ChevronRight size={16} />
											</InputGroupButton>
										</div>
									) : null}
								</div>
							</div>
						</InputGroupAddon>
						{hasOptions ? (
							<InputGroupAddon
								align="block-start"
								className="flex w-full flex-col gap-1.5"
							>
								{compactOptions ? (
									<div className="flex w-full items-center gap-1">
										<InputGroupButton
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-label="Scroll choices left"
											onClick={() =>
												optionsRef.current?.scrollBy({
													left: -180,
													behavior: "smooth",
												})
											}
										>
											<ChevronLeft size={16} />
										</InputGroupButton>
										<section
											ref={optionsRef}
											aria-label="Answer choices"
											className="flex min-w-0 flex-1 gap-1 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
											onKeyDown={(event) => {
												if (
													event.key === "ArrowRight" ||
													event.key === "ArrowLeft"
												) {
													event.preventDefault();
													event.currentTarget.scrollBy({
														left: event.key === "ArrowRight" ? 120 : -120,
														behavior: "smooth",
													});
												}
											}}
										>
											{shownOptions.map((option) => (
												<Button
													key={option.value}
													type="button"
													size="sm"
													variant={
														!otherSelected[question.id] &&
														answers[question.id] === option.value
															? "secondary"
															: "ghost"
													}
													className="shrink-0"
													aria-pressed={
														!otherSelected[question.id] &&
														answers[question.id] === option.value
													}
													onClick={() => selectOption(option.value)}
												>
													{option.label}
												</Button>
											))}
											<Button
												type="button"
												size="sm"
												variant={
													otherSelected[question.id] ? "secondary" : "ghost"
												}
												className="shrink-0"
												aria-pressed={Boolean(otherSelected[question.id])}
												onClick={() => {
													setOtherSelected((current) => ({
														...current,
														[question.id]: true,
													}));
													setAnswers((current) => ({
														...current,
														[question.id]: customAnswers[question.id] ?? "",
													}));
												}}
											>
												Other
											</Button>
										</section>
										<InputGroupButton
											type="button"
											variant="ghost"
											size="icon-sm"
											aria-label="Scroll choices right"
											onClick={() =>
												optionsRef.current?.scrollBy({
													left: 180,
													behavior: "smooth",
												})
											}
										>
											<ChevronRight size={16} />
										</InputGroupButton>
									</div>
								) : (
									shownOptions.map((option) => (
										<Button
											key={option.value}
											type="button"
											size="sm"
											className="w-full justify-start"
											variant={
												!otherSelected[question.id] &&
												answers[question.id] === option.value
													? "secondary"
													: "outline"
											}
											aria-pressed={
												!otherSelected[question.id] &&
												answers[question.id] === option.value
											}
											onClick={() => selectOption(option.value)}
										>
											{option.label}
										</Button>
									))
								)}
								{!compactOptions && options.length > 3 ? (
									<Button
										type="button"
										size="sm"
										variant="ghost"
										className="w-full justify-start"
										onClick={() => {
											setOptionSearch("");
											setMoreOpen(true);
										}}
									>
										More ({options.length - 3})
									</Button>
								) : null}
								{!compactOptions ? (
									<Button
										type="button"
										size="sm"
										className="w-full justify-start"
										variant={
											otherSelected[question.id] ? "secondary" : "outline"
										}
										aria-pressed={Boolean(otherSelected[question.id])}
										onClick={() => {
											setOtherSelected((current) => ({
												...current,
												[question.id]: true,
											}));
											setAnswers((current) => ({
												...current,
												[question.id]: customAnswers[question.id] ?? "",
											}));
										}}
									>
										Other
									</Button>
								) : null}
							</InputGroupAddon>
						) : null}
						{showTextAnswer ? (
							<InputGroupTextarea
								id={`sales-answer-${question.id}`}
								aria-labelledby={`sales-question-${question.id}`}
								value={answers[question.id] ?? ""}
								maxLength={2000}
								rows={2}
								className="max-h-48 min-h-20"
								autoFocus
								onChange={(event) => {
									setAnswers((current) => ({
										...current,
										[question.id]: event.target.value,
									}));
									setCustomAnswers((current) => ({
										...current,
										[question.id]: event.target.value,
									}));
								}}
								onKeyDown={onKeyDown}
								placeholder="Enter the confirmed detail"
							/>
						) : null}
						<InputGroupAddon align="block-end">
							{showRule ? (
								<label className="flex items-center gap-2 text-xs text-muted-foreground">
									<input
										type="checkbox"
										checked={reuse[question.id] ?? false}
										onChange={(event) =>
											setReuse((current) => ({
												...current,
												[question.id]: event.target.checked,
											}))
										}
									/>
									Make this a rule
								</label>
							) : null}
							{showTextAnswer ? (
								<InputGroupButton
									type="submit"
									variant="default"
									size="sm"
									className="ml-auto"
									disabled={
										disabled ||
										busy ||
										!answers[question.id]?.trim() ||
										(finalQuestion &&
											request.questions.some(
												(item) => !answers[item.id]?.trim(),
											))
									}
								>
									{busy ? "Checking…" : "Continue"}
								</InputGroupButton>
							) : null}
						</InputGroupAddon>
					</InputGroup>
				</Field>
			</FieldGroup>
			<Dialog open={moreOpen} onOpenChange={setMoreOpen}>
				<DialogContent className="max-h-[min(36rem,calc(100vh-2rem))] gap-4 overflow-hidden sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="pr-8 leading-snug">
							{questionPrompt}
						</DialogTitle>
					</DialogHeader>
					<Input
						autoFocus
						aria-label="Search choices"
						placeholder="Search choices…"
						value={optionSearch}
						onChange={(event) => setOptionSearch(event.target.value)}
					/>
					<section
						className="min-h-0 max-h-[min(24rem,50vh)] space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						aria-label="All answer choices"
					>
						{filteredOptions.map((option) => (
							<Button
								key={option.value}
								type="button"
								size="sm"
								variant="ghost"
								className="h-auto w-full justify-start whitespace-normal py-2 text-left"
								onClick={() => {
									setMoreOpen(false);
									selectOption(option.value);
								}}
							>
								{option.label}
							</Button>
						))}
						{filteredOptions.length === 0 ? (
							<p className="py-8 text-center text-sm text-muted-foreground">
								No matching choices.
							</p>
						) : null}
					</section>
				</DialogContent>
			</Dialog>
			{error ? (
				<p className="mt-2 text-sm text-destructive" role="alert">
					{error}
				</p>
			) : null}
		</form>
	);
}

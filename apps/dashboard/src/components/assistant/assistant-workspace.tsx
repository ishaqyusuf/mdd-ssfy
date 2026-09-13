"use client";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Textarea } from "@gnd/ui/textarea";
import {
	ArrowUp,
	ArrowUpRight,
	ChartNoAxesCombined,
	Check,
	ChevronDown,
	Command,
	FileText,
	History,
	Layers,
	MessageSquare,
	Plus,
	Search,
	Settings2,
	Sparkles,
	Star,
	X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	type PreviewKind,
	previewKind,
	suggestions,
} from "./assistant-preview-data";
import { AssistantResult } from "./assistant-result";
import styles from "./assistant.module.css";

type Turn = { id: number; prompt: string; kind: PreviewKind };
type Panel =
	| "tools"
	| "favorites"
	| "history"
	| "settings"
	| "requests"
	| "save"
	| "request"
	| "approval"
	| "document"
	| null;
const icons = [ChartNoAxesCombined, Search, FileText, Sparkles];
const categories = ["All", "Sales", "Community", "Inventory", "Documents"];
const tools = [
	{
		title: "Weekly sales overview",
		section: "Sales",
		description: "A visual summary of sales over time.",
		prompt: "Show my weekly sales performance",
	},
	{
		title: "Find an order",
		section: "Sales",
		description: "See progress, blockers and next steps.",
		prompt: "Where is order DEMO-1042?",
	},
	{
		title: "Invoice PDF",
		section: "Documents",
		description: "Review an invoice document in chat.",
		prompt: "Prepare an invoice PDF for DEMO-1042",
	},
	{
		title: "Project progress",
		section: "Community",
		description: "Summarize units and production activity.",
		prompt: "Show Community project progress",
		planned: true,
	},
	{
		title: "Material demand forecast",
		section: "Inventory",
		description: "Plan ahead for upcoming material needs.",
		prompt: "Forecast material demand",
		planned: true,
	},
];

export function AssistantWorkspace() {
	const [turns, setTurns] = useState<Turn[]>([]);
	const [history, setHistory] = useState<Turn[]>([]);
	const [input, setInput] = useState("");
	const [panel, setPanel] = useState<Panel>(null);
	const [category, setCategory] = useState("All");
	const [search, setSearch] = useState("");
	const [favoriteName, setFavoriteName] = useState("");
	const [savedPrompt, setSavedPrompt] = useState("");
	const [favorites, setFavorites] = useState([
		{
			title: "Weekly sales overview",
			prompt: "Show my weekly sales performance",
		},
	]);
	const [request, setRequest] = useState("");
	const [notify, setNotify] = useState(false);
	const [requests, setRequests] = useState<
		{ title: string; notify: boolean }[]
	>([]);
	const [notice, setNotice] = useState("");
	const [detail, setDetail] = useState("Balanced");
	const bottom = useRef<HTMLDivElement>(null);
	useEffect(() => {
		if (turns.length)
			bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
	}, [turns.length]);
	function send(prompt: string) {
		if (!prompt.trim()) return;
		const turn = {
			id: Date.now(),
			prompt: prompt.trim(),
			kind: previewKind(prompt),
		};
		setTurns((previous) => [...previous, turn]);
		setHistory((previous) => [turn, ...previous]);
		setInput("");
		setPanel(null);
		setNotice("");
	}
	function openRequest(prompt: string) {
		setRequest(prompt);
		setNotify(false);
		setPanel("request");
	}
	const titles: Record<Exclude<Panel, null>, string> = {
		tools: "Explore what’s possible",
		favorites: "Your favorite actions",
		history: "Recent conversations",
		settings: "Make it yours",
		requests: "Your feature requests",
		save: "Keep a useful action close",
		request: "Help shape what comes next",
		approval: "Review document action",
		document: "Invoice preview",
	};
	return (
		<main className={styles.workspace}>
			<div className={styles.previewBar}>
				<span className={styles.dot} /> A first look at your GND assistant{" "}
				<span className={styles.previewBarDetail}>
					· Sample data, no live actions
				</span>
			</div>
			<div
				className={`${styles.body} ${turns.length ? styles.withMessages : ""}`}
			>
				{!turns.length ? (
					<section className={styles.welcome}>
						<div className={styles.welcomeLabel}>
							<Sparkles className={styles.tinyMark} size={19} /> A LITTLE LESS
							BUSYWORK
						</div>
						<h1>
							Your work.
							<br />
							<span>A conversation away.</span>
						</h1>
						<p>
							Find an answer, prepare a document, or see the bigger picture.
							<br className={styles.desktopBreak} /> Start with what you need.
							We’ll take it from there.
						</p>
						<div className={styles.suggestions}>
							{suggestions.map((item, index) => {
								const Icon = icons[index] ?? Sparkles;
								return (
									<button
										type="button"
										key={item.title}
										onClick={() => send(item.prompt)}
									>
										<Icon size={19} strokeWidth={1.5} />
										<strong>{item.title}</strong>
										<span>{item.description}</span>
										<ArrowUpRight
											className={styles.suggestionArrow}
											size={15}
										/>
									</button>
								);
							})}
						</div>
						<button
							type="button"
							className={styles.explore}
							onClick={() => setPanel("tools")}
						>
							<Layers size={14} /> Explore available actions{" "}
							<ArrowUpRight size={14} />
						</button>
					</section>
				) : (
					<div
						className={styles.messages}
						role="log"
						aria-label="Preview conversation"
					>
						{turns.map((turn) => (
							<section key={turn.id}>
								<div className={styles.userMessage}>{turn.prompt}</div>
								<AssistantResult
									kind={turn.kind}
									onSave={() => {
										setSavedPrompt(turn.prompt);
										setFavoriteName(turn.prompt);
										setPanel("save");
									}}
									onRequest={() => openRequest(turn.prompt)}
									onDocument={() => setPanel("approval")}
								/>
							</section>
						))}
						<div ref={bottom} />
					</div>
				)}
			</div>
			<footer className={styles.composerArea}>
				<nav className={styles.toolbar} aria-label="Chat actions">
					<Button
						variant="ghost"
						size="sm"
						aria-label="Favorites"
						onClick={() => setPanel("favorites")}
					>
						<Star size={15} />
						<span className={styles.toolbarLabel}>Favorites</span>
						<ChevronDown size={12} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Chat history"
						onClick={() => setPanel("history")}
					>
						<History size={17} />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						aria-label="Chat preferences"
						onClick={() => setPanel("settings")}
					>
						<Settings2 size={17} />
					</Button>
					<span className={styles.toolbarDivider} />
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setTurns([]);
							setNotice("");
						}}
					>
						<Plus size={16} /> New chat
					</Button>
				</nav>
				{notice ? (
					<output className={styles.feedback}>
						<Check size={14} />
						{notice}
						<button
							type="button"
							aria-label="Dismiss message"
							onClick={() => setNotice("")}
						>
							<X size={14} />
						</button>
					</output>
				) : null}
				<form
					className={styles.composer}
					onSubmit={(event) => {
						event.preventDefault();
						send(input);
					}}
				>
					<Textarea
						value={input}
						onChange={(event) => setInput(event.target.value)}
						placeholder="Ask anything about your work…"
						aria-label="Message the assistant"
						rows={2}
						onKeyDown={(event) => {
							if (
								event.key === "Enter" &&
								!event.shiftKey &&
								!event.nativeEvent.isComposing
							) {
								event.preventDefault();
								send(input);
							}
						}}
					/>
					<div className={styles.composerBottom}>
						<button
							type="button"
							className={styles.contextButton}
							onClick={() => setPanel("tools")}
						>
							<Layers size={15} /> GND workspace <ChevronDown size={12} />
						</button>
						<span className={styles.composerHint}>
							Shift + Enter for a new line
						</span>
						<Button
							type="submit"
							size="icon"
							disabled={!input.trim()}
							aria-label="Send message"
						>
							<ArrowUp size={18} />
						</Button>
					</div>
				</form>
				<div className={styles.footerNote}>
					<span>
						<Command size={11} /> Built around your work
					</span>
					<span>Illustrative responses · Nothing is saved to your account</span>
				</div>
			</footer>
			<Dialog
				open={panel !== null}
				onOpenChange={(open) => {
					if (!open) setPanel(null);
				}}
			>
				<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl">
					<DialogHeader>
						<DialogTitle>{panel ? titles[panel] : "Assistant"}</DialogTitle>
						<DialogDescription>
							{panel === "request"
								? "Review your request and choose how you’d like to stay in the loop."
								: "Interactive UI preview. Changes last only while this page is open."}
						</DialogDescription>
					</DialogHeader>
					{panel === "tools" ? (
						<>
							<Input
								aria-label="Search actions"
								placeholder="Find an action…"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
							<div className={styles.categories}>
								{categories.map((item) => (
									<button
										type="button"
										key={item}
										aria-pressed={category === item}
										onClick={() => setCategory(item)}
									>
										{item}
									</button>
								))}
							</div>
							<div className={styles.list}>
								{tools
									.filter(
										(tool) =>
											(category === "All" || category === tool.section) &&
											`${tool.title} ${tool.description}`
												.toLowerCase()
												.includes(search.toLowerCase()),
									)
									.map((tool) => (
										<button
											type="button"
											key={tool.title}
											onClick={() =>
												tool.planned
													? openRequest(tool.prompt)
													: send(tool.prompt)
											}
										>
											<span>
												<strong>{tool.title}</strong>
												<small>{tool.description}</small>
											</span>
											<span className={styles.preview}>
												{tool.planned ? "Planned" : "Try preview"}
											</span>
										</button>
									))}
								{!tools.some(
									(tool) =>
										(category === "All" || category === tool.section) &&
										`${tool.title} ${tool.description}`
											.toLowerCase()
											.includes(search.toLowerCase()),
								) ? (
									<p className={styles.muted}>
										No matching actions. Try another search.
									</p>
								) : null}
							</div>
							<Button variant="outline" onClick={() => openRequest(search)}>
								Suggest a new action
							</Button>
						</>
					) : null}
					{panel === "favorites" ? (
						<div className={styles.list}>
							{favorites.map((favorite, index) => (
								<div
									className={styles.favoriteRow}
									key={`${favorite.title}-${index}`}
								>
									<button type="button" onClick={() => send(favorite.prompt)}>
										<Star size={16} />
										<span>
											<strong>{favorite.title}</strong>
											<small>Run with fresh sample data</small>
										</span>
										<ArrowUpRight size={15} />
									</button>
									<Button
										variant="ghost"
										size="icon"
										aria-label={`Remove ${favorite.title}`}
										onClick={() =>
											setFavorites((items) =>
												items.filter((_, itemIndex) => itemIndex !== index),
											)
										}
									>
										<X size={15} />
									</Button>
								</div>
							))}
							{!favorites.length ? (
								<p>Save an action from a response to find it here.</p>
							) : null}
						</div>
					) : null}
					{panel === "save" ? (
						<form
							className="grid gap-4"
							onSubmit={(event) => {
								event.preventDefault();
								if (!favoriteName.trim()) return;
								setFavorites((items) => [
									...items,
									{ title: favoriteName.trim(), prompt: savedPrompt },
								]);
								setPanel(null);
								setNotice("Action added to preview favorites.");
							}}
						>
							<label
								htmlFor="assistant-action-name"
								className="grid gap-2 text-sm"
							>
								Action name
								<Input
									id="assistant-action-name"
									required
									maxLength={100}
									value={favoriteName}
									onChange={(event) => setFavoriteName(event.target.value)}
								/>
							</label>
							<div className={styles.notice}>
								<Star size={17} />
								<p>
									This action will append your request to chat and show a fresh
									preview response.
								</p>
							</div>
							<Button type="submit">Save action</Button>
						</form>
					) : null}
					{panel === "history" ? (
						<div className={styles.list}>
							{history.map((turn) => (
								<button
									type="button"
									key={turn.id}
									onClick={() => {
										setTurns([turn]);
										setPanel(null);
									}}
								>
									<MessageSquare size={16} />
									<span>
										<strong>{turn.prompt}</strong>
										<small>This session</small>
									</span>
									<ArrowUpRight size={14} />
								</button>
							))}
							{!history.length ? (
								<p>
									Your conversations will appear here after you try a prompt.
								</p>
							) : null}
						</div>
					) : null}
					{panel === "settings" ? (
						<div className="grid gap-5">
							<label
								htmlFor="assistant-response-style"
								className="grid gap-2 text-sm"
							>
								Response style
								<select
									id="assistant-response-style"
									className="h-10 rounded-md border bg-background px-3"
									value={detail}
									onChange={(event) => {
										setDetail(event.target.value);
										setNotice(
											"Preference selected for preview; response styling is not connected yet.",
										);
									}}
								>
									<option>Concise</option>
									<option>Balanced</option>
									<option>Detailed</option>
								</select>
							</label>
							<Button variant="outline" onClick={() => setPanel("requests")}>
								My feature requests
							</Button>
							<p className={styles.muted}>
								Language, permissions and account preferences will connect in
								the next phase.
							</p>
						</div>
					) : null}
					{panel === "request" ? (
						<form
							className="grid gap-5"
							onSubmit={(event) => {
								event.preventDefault();
								if (!request.trim()) return;
								setRequests((items) => [
									...items,
									{ title: request.trim(), notify },
								]);
								setPanel(null);
								setNotice(
									"Request preview recorded for this session. No developers were notified.",
								);
							}}
						>
							<label
								htmlFor="assistant-feature-request"
								className="grid gap-2 text-sm"
							>
								What would you like GND to do?
								<Textarea
									id="assistant-feature-request"
									required
									maxLength={1000}
									value={request}
									onChange={(event) => setRequest(event.target.value)}
								/>
							</label>
							<label
								htmlFor="assistant-feature-notify"
								className="flex items-center gap-3 text-sm"
							>
								<Checkbox
									id="assistant-feature-notify"
									checked={notify}
									onCheckedChange={(value) => setNotify(value === true)}
								/>
								Notify me when this feature is ready to use
							</label>
							<p className={styles.muted}>
								This preview won’t send your request or subscribe you to
								notifications.
							</p>
							<div className="flex justify-end gap-2">
								<Button
									type="button"
									variant="outline"
									onClick={() => setPanel(null)}
								>
									Not now
								</Button>
								<Button type="submit">Notify developers</Button>
							</div>
						</form>
					) : null}
					{panel === "requests" ? (
						<div className={styles.list}>
							{requests.length ? (
								requests.map((item) => (
									<div
										key={`${item.title}-${item.notify}`}
										className="border-b py-3"
									>
										<strong>{item.title}</strong>
										<p className={styles.muted}>
											Preview only · Release notification:{" "}
											{item.notify ? "Selected" : "Not selected"}
										</p>
									</div>
								))
							) : (
								<p>No feature requests in this preview session.</p>
							)}
						</div>
					) : null}
					{panel === "document" ? (
						<div className={styles.invoice}>
							<div className={styles.invoiceHeader}>
								<strong>
									GND
									<br />
									<small>Millwork</small>
								</strong>
								<span>
									INVOICE
									<br />
									<small>DEMO-1042</small>
								</span>
							</div>
							<p>
								Prepared for
								<br />
								<strong>Oakridge residence</strong>
							</p>
							<table>
								<thead>
									<tr>
										<th>Description</th>
										<th>Qty</th>
										<th>Amount</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td>Interior door package</td>
										<td>24</td>
										<td>$4,800.00</td>
									</tr>
								</tbody>
							</table>
							<div className={styles.invoiceTotal}>
								Sample subtotal <strong>$4,800.00</strong>
							</div>
							<p className={styles.muted}>
								Illustrative document. No tax, pricing calculation, PDF file or
								actual invoice has been created.
							</p>
						</div>
					) : null}
					{panel === "approval" ? (
						<div className="grid gap-4 text-sm">
							<div className="rounded-md border bg-muted/30 p-3">
								<strong>Generate PDF</strong>
								<p className={styles.muted}>
									Confirm generate PDF. Authorization and record revision will
									be checked again before execution.
								</p>
							</div>
							<dl className="grid gap-2 sm:grid-cols-[8rem_1fr]">
								<dt className="text-muted-foreground">Effect</dt>
								<dd>Artifact generation</dd>
								<dt className="text-muted-foreground">Record revision</dt>
								<dd className="font-mono text-xs">demo-order-revision-7</dd>
							</dl>
							<pre className="rounded-md border bg-muted/30 p-3 text-xs">
								{JSON.stringify(
									{
										orderNo: "DEMO-1042",
										mode: "invoice",
										expectedRevision: "demo-order-revision-7",
										forceRegenerate: false,
									},
									null,
									2,
								)}
							</pre>
							<p className={styles.muted}>
								Preview only · No PDF will be generated from this screen.
							</p>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setPanel(null)}>
									Decline
								</Button>
								<Button
									onClick={() => {
										setPanel("document");
										setNotice(
											"Preview confirmation accepted; no PDF was generated.",
										);
									}}
								>
									Confirm and generate
								</Button>
							</div>
						</div>
					) : null}
				</DialogContent>
			</Dialog>
		</main>
	);
}

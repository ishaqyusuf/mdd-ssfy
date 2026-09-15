"use client";

import { useTRPCClient } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import {
	Component,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { AssistantOutcomeHelp } from "./assistant-outcome-help";

class MessageBoundary extends Component<
	{
		children: ReactNode;
		onFailure: () => void;
		onReset: () => void;
	},
	{ failed: boolean }
> {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch() {
		this.props.onFailure();
	}
	render() {
		if (!this.state.failed) return this.props.children;
		return (
			<div className="space-y-2 rounded-md border p-4" role="alert">
				<p className="text-sm">
					I couldn't display this response. Please try loading it again.
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						this.props.onReset();
						this.setState({ failed: false });
					}}
				>
					Try displaying again
				</Button>
			</div>
		);
	}
}

export function AssistantMessageBoundary({
	children,
	conversationId,
}: { children: ReactNode; conversationId: string }) {
	const client = useTRPCClient();
	const [reference, setReference] = useState<string | null>(null);
	const mounted = useRef(true);
	const attempt = useRef(0);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const report = useCallback(() => {
		const currentAttempt = ++attempt.current;
		void client.assistant.reportClientFailure
			.mutate({ eventId: crypto.randomUUID(), conversationId, stage: "render" })
			.then((result) => {
				if (mounted.current && currentAttempt === attempt.current) setReference(result.reference);
			})
			.catch(() => undefined);
	}, [client, conversationId]);
	return (
		<>
			<MessageBoundary onFailure={report} onReset={() => { attempt.current++; setReference(null); }}>
				{children}
			</MessageBoundary>
			{reference ? <AssistantOutcomeHelp reference={reference} /> : null}
		</>
	);
}

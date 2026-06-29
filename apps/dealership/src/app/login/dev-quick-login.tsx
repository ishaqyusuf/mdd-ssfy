"use client";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { AlertCircle, UserRound } from "lucide-react";
import { useState } from "react";

export type DevQuickLoginDealer = {
	id: number;
	email: string;
	label: string;
	secondaryLabel: string | null;
};

type DealerDevQuickLoginProps = {
	callbackURL: string;
	dealers: DevQuickLoginDealer[];
};

export function DealerDevQuickLogin({
	callbackURL,
	dealers,
}: DealerDevQuickLoginProps) {
	const [error, setError] = useState<string | null>(null);
	const [pendingDealerId, setPendingDealerId] = useState<number | null>(null);

	async function login(dealer: DevQuickLoginDealer) {
		setError(null);
		setPendingDealerId(dealer.id);

		try {
			const response = await fetch("/api/auth/dealer-dev-quick-sign-in", {
				body: JSON.stringify({
					callbackURL,
					dealerAuthId: dealer.id,
				}),
				headers: {
					"content-type": "application/json",
				},
				method: "POST",
			});

			if (!response.ok) {
				throw new Error("Quick login failed. Try another dealer account.");
			}

			const data = (await response.json()) as { url?: string };
			window.location.assign(data.url || callbackURL);
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Quick login failed. Try another dealer account.",
			);
		} finally {
			setPendingDealerId(null);
		}
	}

	return (
		<div className="space-y-3 border-slate-200 border-t pt-5">
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className="h-11 w-full justify-between"
						disabled={dealers.length === 0 || pendingDealerId !== null}
						type="button"
						variant="outline"
					>
						<span className="inline-flex items-center gap-2">
							<UserRound className="size-4" />
							Dev Quick Login
						</span>
						<Badge variant="secondary">{dealers.length}</Badge>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-96 p-0">
					<DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
						<span>Dealers</span>
						<Badge variant="outline">Dev access</Badge>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<ScrollArea className="h-72">
						<div className="flex flex-col gap-1 p-1">
							{dealers.map((dealer) => {
								const isPending = pendingDealerId === dealer.id;

								return (
									<DropdownMenuItem
										className="items-start gap-3 rounded-md p-2"
										disabled={pendingDealerId !== null}
										key={dealer.id}
										onClick={() => login(dealer)}
									>
										<div className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-slate-50 text-xs font-semibold text-slate-700">
											{getInitials(dealer.label)}
										</div>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="truncate text-sm font-medium">
													{dealer.label}
												</p>
												{isPending ? (
													<Badge className="shrink-0" variant="secondary">
														Signing in
													</Badge>
												) : null}
											</div>
											<p className="truncate text-xs text-muted-foreground">
												{dealer.secondaryLabel || dealer.email}
											</p>
										</div>
									</DropdownMenuItem>
								);
							})}
						</div>
					</ScrollArea>
				</DropdownMenuContent>
			</DropdownMenu>
			{error ? (
				<div
					className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive"
					role="alert"
				>
					<AlertCircle className="mt-0.5 size-4 shrink-0" />
					<p>{error}</p>
				</div>
			) : null}
		</div>
	);
}

function getInitials(value: string) {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

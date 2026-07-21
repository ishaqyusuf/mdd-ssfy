"use client";

import { Footer } from "@/components/footer";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

export function ResetPasswordClient() {
	const token = useSearchParams().get("token") || "";
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const trpc = useTRPC();
	const reset = useMutation(
		trpc.storefrontAuth.resetPassword.mutationOptions(),
	);
	const submit = (event: FormEvent) => {
		event.preventDefault();
		reset.mutate({ token, password, confirmPassword });
	};
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Choose a new password</CardTitle>
					</CardHeader>
					<CardContent>
						{!token ? (
							<Alert variant="destructive">
								<AlertDescription>
									This reset link is incomplete. Request a new link.
								</AlertDescription>
							</Alert>
						) : reset.isSuccess ? (
							<div className="text-center">
								<p>Your password has been updated and prior sessions ended.</p>
								<Button asChild className="mt-5">
									<Link href="/login">Sign in</Link>
								</Button>
							</div>
						) : (
							<form className="space-y-4" onSubmit={submit}>
								{reset.error && (
									<Alert variant="destructive">
										<AlertDescription>{reset.error.message}</AlertDescription>
									</Alert>
								)}
								<div>
									<Label htmlFor="password">New password</Label>
									<Input
										id="password"
										className="mt-1"
										type="password"
										autoComplete="new-password"
										value={password}
										onChange={(event) => setPassword(event.target.value)}
										required
									/>
								</div>
								<div>
									<Label htmlFor="confirmPassword">Confirm password</Label>
									<Input
										id="confirmPassword"
										className="mt-1"
										type="password"
										autoComplete="new-password"
										value={confirmPassword}
										onChange={(event) => setConfirmPassword(event.target.value)}
										required
									/>
								</div>
								<p className="text-xs text-muted-foreground">
									Use at least eight characters with upper- and lowercase
									letters and a number.
								</p>
								<Button className="w-full" disabled={reset.isPending}>
									{reset.isPending ? "Updating…" : "Update password"}
								</Button>
							</form>
						)}
					</CardContent>
				</Card>
			</main>
			<Footer />
		</div>
	);
}

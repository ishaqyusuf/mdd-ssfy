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
import { type FormEvent, useState } from "react";

export function ForgotPasswordClient() {
	const [email, setEmail] = useState("");
	const trpc = useTRPC();
	const request = useMutation(
		trpc.storefrontAuth.requestPasswordReset.mutationOptions(),
	);
	const submit = (event: FormEvent) => {
		event.preventDefault();
		request.mutate({ email });
	};
	return (
		<div className="min-h-screen bg-background">
			<main className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-10">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle>Reset your password</CardTitle>
						<p className="text-sm text-muted-foreground">
							We will email a single-use link if the address belongs to a
							customer account.
						</p>
					</CardHeader>
					<CardContent>
						{request.data ? (
							<Alert>
								<AlertDescription>{request.data.message}</AlertDescription>
							</Alert>
						) : (
							<form className="space-y-4" onSubmit={submit}>
								{request.error && (
									<Alert variant="destructive">
										<AlertDescription>{request.error.message}</AlertDescription>
									</Alert>
								)}
								<div>
									<Label htmlFor="email">Email</Label>
									<Input
										id="email"
										className="mt-1"
										type="email"
										autoComplete="email"
										value={email}
										onChange={(event) => setEmail(event.target.value)}
										required
									/>
								</div>
								<Button className="w-full" disabled={request.isPending}>
									{request.isPending ? "Sending…" : "Send reset link"}
								</Button>
							</form>
						)}
						<Button asChild variant="link" className="mt-3 w-full">
							<Link href="/login">Back to sign in</Link>
						</Button>
					</CardContent>
				</Card>
			</main>
			<Footer />
		</div>
	);
}

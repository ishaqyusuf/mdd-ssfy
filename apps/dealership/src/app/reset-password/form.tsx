"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	LockKeyhole,
} from "lucide-react";
import { useState } from "react";

type DealerResetPasswordFormProps = {
	token?: string | null;
};

export function DealerResetPasswordForm({ token }: DealerResetPasswordFormProps) {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [complete, setComplete] = useState(false);
	const [pending, setPending] = useState(false);

	async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);

		if (!token) {
			setError("This password reset link is invalid or expired.");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}

		if (password !== confirmPassword) {
			setError("Passwords do not match.");
			return;
		}

		setPending(true);

		try {
			const result = await authClient.resetPassword({
				newPassword: password,
				token,
			});

			if (result.error) {
				setError(
					result.error.message ||
						"This password reset link is invalid or expired.",
				);
				return;
			}

			setComplete(true);
			window.setTimeout(() => {
				window.location.assign("/login?reset=complete");
			}, 900);
		} catch {
			setError("Unable to reset password. Please request a fresh link.");
		} finally {
			setPending(false);
		}
	}

	if (!token) {
		return (
			<div
				className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive"
				role="alert"
			>
				<AlertCircle className="mt-0.5 size-4 shrink-0" />
				<p>This password reset link is invalid or expired.</p>
			</div>
		);
	}

	return (
		<form className="space-y-5" onSubmit={onSubmit}>
			<div className="space-y-2">
				<Label className="text-slate-700" htmlFor="password">
					New password
				</Label>
				<div className="relative">
					<LockKeyhole className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-slate-400" />
					<Input
						autoComplete="new-password"
						className="h-11 rounded-md border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]"
						id="password"
						minLength={8}
						onChange={(event) => setPassword(event.target.value)}
						required
						type="password"
						value={password}
					/>
				</div>
			</div>
			<div className="space-y-2">
				<Label className="text-slate-700" htmlFor="confirmPassword">
					Confirm password
				</Label>
				<div className="relative">
					<LockKeyhole className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-slate-400" />
					<Input
						autoComplete="new-password"
						className="h-11 rounded-md border-slate-200 bg-white pl-10 text-slate-950 placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-primary/20 focus-visible:ring-[3px]"
						id="confirmPassword"
						minLength={8}
						onChange={(event) => setConfirmPassword(event.target.value)}
						required
						type="password"
						value={confirmPassword}
					/>
				</div>
			</div>
			{error ? (
				<div
					className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm font-medium text-destructive"
					role="alert"
				>
					<AlertCircle className="mt-0.5 size-4 shrink-0" />
					<p>{error}</p>
				</div>
			) : null}
			{complete ? (
				<div
					className="flex items-start gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700"
					role="status"
				>
					<CheckCircle2 className="mt-0.5 size-4 shrink-0" />
					<p>Password reset. Redirecting to login...</p>
				</div>
			) : null}
			<Button
				className="h-11 w-full"
				disabled={pending || complete}
				type="submit"
			>
				{pending ? "Resetting password..." : "Reset password"}
				<ArrowRight className="size-4" />
			</Button>
		</form>
	);
}

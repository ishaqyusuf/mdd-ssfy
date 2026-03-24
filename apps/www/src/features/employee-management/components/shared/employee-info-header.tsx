"use client";

import { Avatar } from "@/components/avatar";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

interface EmployeeInfoHeaderProps {
	name: string;
	email?: string;
	phone?: string;
	roles: string[];
	insuranceStatus:
		| "valid"
		| "expiring_soon"
		| "expired"
		| "missing"
		| "pending"
		| "rejected";
	profile?: string;
}

const insuranceIcons = {
	valid: ShieldCheck,
	expiring_soon: ShieldAlert,
	expired: ShieldAlert,
	missing: ShieldQuestion,
	pending: ShieldQuestion,
	rejected: ShieldAlert,
};

const insuranceVariants: Record<
	string,
	"default" | "destructive" | "secondary" | "outline"
> = {
	valid: "default",
	expiring_soon: "secondary",
	expired: "destructive",
	missing: "secondary",
	pending: "outline",
	rejected: "destructive",
};

export function EmployeeInfoHeader({
	name,
	email,
	phone,
	roles,
	insuranceStatus,
	profile,
}: EmployeeInfoHeaderProps) {
	const InsuranceIcon = insuranceIcons[insuranceStatus];

	return (
		<div className="flex items-center gap-4 rounded-lg border bg-card p-4">
			<Avatar
				name={name}
				email={email}
				className="h-16 w-16"
				fallbackClassName="text-lg"
			/>
			<div className="flex flex-1 flex-col gap-1">
				<div className="flex items-center gap-2">
					<h2 className="text-lg font-semibold">{name}</h2>
					<Badge
						variant={insuranceVariants[insuranceStatus]}
						className="flex items-center gap-1 text-xs"
					>
						<InsuranceIcon className="h-3 w-3" />
						Insurance: {insuranceStatus.replace("_", " ")}
					</Badge>
				</div>
				{email && <p className="text-sm text-muted-foreground">{email}</p>}
				{phone && <p className="text-sm text-muted-foreground">{phone}</p>}
				<div className="flex flex-wrap gap-1">
					{roles.map((role) => (
						<Badge key={role} variant="outline" className="text-xs">
							{role}
						</Badge>
					))}
				</div>
			</div>
		</div>
	);
}

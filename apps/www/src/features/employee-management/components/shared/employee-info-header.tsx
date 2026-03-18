"use client";

import { Badge } from "@gnd/ui/badge";
import { Avatar, AvatarFallback } from "@gnd/ui/avatar";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";

interface EmployeeInfoHeaderProps {
    name: string;
    email?: string;
    phone?: string;
    roles: string[];
    insuranceStatus: "valid" | "expired" | "missing" | "pending";
    profile?: string;
}

const insuranceIcons = {
    valid: ShieldCheck,
    expired: ShieldAlert,
    missing: ShieldQuestion,
    pending: ShieldQuestion,
};

const insuranceVariants: Record<
    string,
    "default" | "destructive" | "secondary" | "outline"
> = {
    valid: "default",
    expired: "destructive",
    missing: "secondary",
    pending: "outline",
};

export function EmployeeInfoHeader({
    name,
    email,
    phone,
    roles,
    insuranceStatus,
    profile,
}: EmployeeInfoHeaderProps) {
    const initials = name
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const InsuranceIcon = insuranceIcons[insuranceStatus];

    return (
        <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
            <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{name}</h2>
                    <Badge
                        variant={insuranceVariants[insuranceStatus]}
                        className="flex items-center gap-1 text-xs"
                    >
                        <InsuranceIcon className="h-3 w-3" />
                        Insurance: {insuranceStatus}
                    </Badge>
                </div>
                {email && (
                    <p className="text-sm text-muted-foreground">{email}</p>
                )}
                {phone && (
                    <p className="text-sm text-muted-foreground">{phone}</p>
                )}
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

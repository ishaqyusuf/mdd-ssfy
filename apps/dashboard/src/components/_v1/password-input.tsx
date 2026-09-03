"use client";

import * as React from "react";
import { Icons } from "@gnd/ui/icons";
import { cn } from "@/lib/utils";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@gnd/ui/input-group";
import type { InputProps } from "@gnd/ui/input";

const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, ...props }, ref) => {
        const [showPassword, setShowPassword] = React.useState(false);

        return (
            <InputGroup className="h-12 rounded-lg bg-background">
                <InputGroupInput
                    type={showPassword ? "text" : "password"}
                    className={cn("h-full px-3 text-base", className)}
                    ref={ref}
                    {...props}
                />
                <InputGroupAddon align="inline-end">
                    <InputGroupButton
                        type="button"
                        size="icon-sm"
                        aria-label={
                            showPassword ? "Hide password" : "Show password"
                        }
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword((prev) => !prev)}
                        disabled={props.value === "" || props.disabled}
                    >
                        {showPassword ? (
                            <Icons.hide aria-hidden="true" />
                        ) : (
                            <Icons.view aria-hidden="true" />
                        )}
                    </InputGroupButton>
                </InputGroupAddon>
            </InputGroup>
        );
    },
);
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };

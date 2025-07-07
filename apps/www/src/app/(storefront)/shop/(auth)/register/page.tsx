"use client";

import Link from "next/link";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

export default function RegisterPage() {
    return (
        <div className="px-4 py-12 sm:px-6 lg:px-8">
            <div className="mx-auto flex  min-h-[90vh] max-w-2xl flex-col justify-center space-y-8">
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-bold">Create an Account</h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Enter your information to create an account
                    </p>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="Lee Robinson"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                placeholder="m@example.com"
                                required
                                type="email"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" required type="password" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="address">Shipping Address</Label>
                        <Input
                            id="address"
                            placeholder="123 Street St"
                            required
                        />
                    </div>
                    <Button className="w-full" type="submit">
                        Register
                    </Button>
                </div>
                <div className="text-center text-sm">
                    Already have an account?
                    <Link className="underline" href="#">
                        Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

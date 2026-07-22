"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { useTRPC } from "@/trpc/client";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { FormInput } from "@gnd/ui/controls/form-input";
import { Form } from "@gnd/ui/form";
import { Icons } from "@gnd/ui/icons";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { z } from "zod";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/),
    confirmPassword: z.string(),
    agreeToTerms: z.literal(true),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerificationLoading />}>
      <VerifyPageContent />
    </Suspense>
  );
}

function VerifyPageContent() {
  const token = useSearchParams().get("token") ?? "";
  const trpc = useTRPC();
  const started = useRef(false);
  const [verified, setVerified] = useState<{
    email: string;
    name: string;
  } | null>(null);
  const verify = useMutation(
    trpc.storefrontAuth.verifyEmail.mutationOptions({
      onSuccess: setVerified,
    }),
  );

  useEffect(() => {
    if (token && !started.current) {
      started.current = true;
      verify.mutate({ token });
    }
  }, [token]);

  if (!token) {
    return <VerificationError message="The verification token is missing." />;
  }
  if (verify.error) {
    return <VerificationError message={verify.error.message} />;
  }
  if (!verified) {
    return <VerificationLoading />;
  }

  return (
    <CreatePasswordForm
      token={token}
      email={verified.email}
      name={verified.name}
    />
  );
}

function VerificationLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <p className="animate-pulse text-muted-foreground">
        Verifying your email…
      </p>
    </div>
  );
}

function CreatePasswordForm({
  token,
  email,
  name,
}: {
  token: string;
  email: string;
  name: string;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const form = useZodForm(passwordSchema, {
    defaultValues: {
      password: "",
      confirmPassword: "",
      agreeToTerms: true,
    },
  });
  const createPassword = useMutation(
    trpc.storefrontAuth.createPassword.mutationOptions({
      onSuccess: () => {
        setTimeout(() => router.push("/login"), 1_000);
      },
    }),
  );

  if (createPassword.data) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-green-100">
              <Icons.Check className="size-7 text-green-700" />
            </div>
            <h1 className="mt-4 text-2xl font-bold">Account ready</h1>
            <p className="mt-2 text-muted-foreground">
              Your password has been created. Redirecting to sign in…
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create your password</CardTitle>
          <p className="text-sm text-muted-foreground">
            Email verified for {name} ({email}).
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((value) =>
                createPassword.mutate({ token, ...value }),
              )}
            >
              {createPassword.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {createPassword.error.message}
                  </AlertDescription>
                </Alert>
              )}
              <FormInput
                control={form.control}
                name="password"
                type="password"
                label="Password"
                PrefixIcon={Icons.Lock}
              />
              <FormInput
                control={form.control}
                name="confirmPassword"
                type="password"
                label="Confirm password"
                PrefixIcon={Icons.Lock}
              />
              <Button
                type="submit"
                className="w-full"
                disabled={createPassword.isPending}
              >
                {createPassword.isPending ? "Saving…" : "Create password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

function VerificationError({ message }: { message: string }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <h1 className="text-xl font-bold">Unable to verify email</h1>
          <p className="mt-2 text-sm text-destructive">{message}</p>
          <Button asChild variant="outline" className="mt-5">
            <Link href="/signup">Return to sign up</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Lock } from "lucide-react";

import { useZodForm } from "@/hooks/use-zod-form";
import {
  CreatePasswordSchema,
  createPasswordSchema,
} from "@sales/storefront-account";
import { useTaskTrigger } from "@trigger/hooks/use-task-trigger";
import { getBaseUrl } from "@/envs";
import { Button } from "@gnd/ui/button";
import { FormInput } from "@gnd/ui/controls/form-input";
import { Alert, AlertDescription } from "@gnd/ui/alert";
import Link from "next/link";
import { Form } from "@gnd/ui/form";
import {
  SendStorefrontEmailVerifiedEmailPayload,
  SendStorefrontPasswordCreatedEmailPayload,
} from "@jobs/schema";

export default function Page() {
  const [token] = useQueryState("token");
  const trpc = useTRPC();
  const trigger = useTaskTrigger({
    triggerMutation: trpc.taskTrigger.trigger,
  });
  const { data, isPending, error } = useQuery(
    trpc.storefront.auth.verifyEmail.queryOptions(
      {
        token,
      },
      {
        enabled: !!token,
      }
    )
  );

  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (data) {
      trigger.triggerAsync("send-storefront-email-verified-email", {
        email: data.email,
        name: data.name,
      } as SendStorefrontEmailVerifiedEmailPayload);
      const timer = setTimeout(() => {
        setShowPasswordForm(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [data, trigger]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <AnimatePresence mode="wait">
        {!showPasswordForm ? (
          <motion.div
            key="verification"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800"
          >
            <div className="flex flex-col items-center text-center">
              {isPending && <VerificationPending />}
              {error && <VerificationError message={error.message} />}
              {data && <VerificationSuccess />}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="create-password"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CreatePasswordForm id={data.id} email={data.email} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VerificationPending() {
  return (
    <>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          ease: "linear",
          repeat: Infinity,
        }}
        className="mb-4 h-12 w-12 rounded-full border-4 border-t-4 border-blue-500 border-t-transparent"
      ></motion.div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        Verifying your email...
      </h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Please wait a moment.
      </p>
    </>
  );
}

function VerificationError({ message }: { message: string }) {
  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
      >
        <svg
          className="h-10 w-10 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </motion.div>
      <h1 className="text-2xl font-bold text-red-500">Verification Failed</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        {message || "An unknown error occurred."}
      </p>
      <p className="mt-4 text-sm text-gray-500">
        Please try again or contact support.
      </p>
    </>
  );
}

function VerificationSuccess() {
  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
      >
        <motion.svg
          className="h-10 w-10 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </motion.svg>
      </motion.div>
      <h1 className="text-2xl font-bold text-green-500">Email Verified!</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Thank you for verifying your email address.
      </p>
      <p className="mt-4 text-sm text-gray-500">
        Please create a password to continue.
      </p>
    </>
  );
}

function CreatePasswordForm({ email, id }: { email: string; id: number }) {
  const form = useZodForm(createPasswordSchema, {
    defaultValues: {
      id,
    },
  });
  const router = useRouter();
  const trpc = useTRPC();
  const trigger = useTaskTrigger({
    triggerMutation: trpc.taskTrigger.trigger,
  });
  const { data, mutate, isPending, error } = useMutation(
    trpc.storefront.auth.createPassword.mutationOptions({
      onSuccess(data) {
        trigger.triggerAsync("send-storefront-password-created-email", {
          email: email,
          name: data.name,
        } as SendStorefrontPasswordCreatedEmailPayload);
        setTimeout(() => {
          router.push("/login");
        }, 2000);
      },
    })
  );

  const passwordCreated = !!data;

  function onSubmit(data: CreatePasswordSchema) {
    mutate(data);
  }

  if (passwordCreated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-gray-800"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
        >
          <motion.svg
            className="h-10 w-10 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </motion.svg>
        </motion.div>
        <h1 className="text-2xl font-bold text-green-500">Password Created!</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Your account is now ready.
        </p>
        <p className="mt-4 text-sm text-gray-500">Redirecting to login...</p>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Create Your Password</CardTitle>
          <p className="text-gray-600">
            Create a password for your GND Millwork account.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error?.message}</AlertDescription>
                </Alert>
              )}

              <FormInput
                PrefixIcon={Lock}
                label="Password"
                control={form.control}
                name="password"
                type="password"
                placeholder="Create your password"
              />
              <FormInput
                PrefixIcon={Lock}
                label="Confirm Password"
                control={form.control}
                name="confirmPassword"
                type="password"
                placeholder="Confirm your password"
              />

              <Button
                type="submit"
                className="w-full bg-amber-700 hover:bg-amber-800"
                disabled={isPending}
              >
                {isPending ? "Creating Password..." : "Create Password"}
              </Button>
            </form>
          </Form>
          <div className="mt-6 border-t pt-4 text-center">
            <p className="text-sm text-gray-600">
              Alternatively, you can sign in using a magic link.
            </p>
            <Link
              href="/login"
              className="text-sm font-medium text-amber-600 hover:text-amber-700"
            >
              Sign in with magic link
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

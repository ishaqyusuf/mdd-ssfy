"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useEffect } from "react";
import { motion } from "framer-motion";
export default function Page() {
  const [token] = useQueryState("token");
  const trpc = useTRPC();

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
  const r = useRouter();
  console.log({ data, isPending, error });
  useEffect(() => {
    if (!data) return;
    setTimeout(() => {
      r.push("/login");
    }, 2000);
  }, [data]);
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg dark:bg-gray-800"
      >
        <div className="flex flex-col items-center text-center">
          {isPending && (
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
          )}
          {error && (
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
              <h1 className="text-2xl font-bold text-red-500">
                Verification Failed
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {error.message || "An unknown error occurred."}
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Please try again or contact support.
              </p>
            </>
          )}
          {data && (
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
              <h1 className="text-2xl font-bold text-green-500">
                Email Verified!
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Thank you for verifying your email address.
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Redirecting to login...
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

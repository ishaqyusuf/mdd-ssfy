/**
 * v0 by Vercel.
 * @see https://v0.dev/t/LDRIwiFrrO2
 * Documentation: https://v0.dev/docs#integrating-generated-code-into-your-nextjs-app
 */
import { prisma } from "@/db";
import dayjs from "dayjs";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function RegistrationSubmittedPage({ searchParams }) {
    const e = await prisma.dealerAuth.findFirst({
        where: { email: searchParams.email },
    });
    const createdAgo = dayjs().diff(dayjs(e?.createdAt), "minutes");
    if (!e || createdAgo > 1) redirect("/");
    return (
        <div className="w-full">
            <section className="w-full min-h-screen py-12 md:py-24 lg:py-32 bg-muted">
                <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
                    <div className="space-y-3">
                        <CircleCheckIcon className="mx-auto h-12 w-12 text-green-500" />
                        <h1 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                            Registration Submitted!
                        </h1>
                        <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                            Thank you for registering to become a dealer partner
                            with GND Millwork. We have received your
                            registration details and are currently reviewing
                            your application.
                        </p>
                        <Link
                            href="/"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                            prefetch={false}
                        >
                            Go to Login
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function CircleCheckIcon(props) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

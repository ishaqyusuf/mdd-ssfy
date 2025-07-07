"use client";
import Link from "next/link";

import { siteConfig } from "@/config/site";

import { Shell } from "@/components/shell";
import { JoinNewsletterForm } from "./new-letter-form";
import { Icons } from "@/components/_v1/icons";

export default function SiteFooter() {
    return (
        <footer className="w-full border-t bg-background">
            <Shell>
                <section
                    id="footer-content"
                    aria-labelledby="footer-content-heading"
                    className="flex flex-col gap-10 lg:flex-row lg:gap-20"
                >
                    <section
                        id="footer-branding"
                        aria-labelledby="footer-branding-heading"
                    >
                        <Link
                            href="/"
                            className="flex w-fit items-center space-x-2"
                        >
                            <Icons.logoLg />

                            <span className="sr-only">Home</span>
                        </Link>
                    </section>
                    <section
                        id="newsletter"
                        aria-labelledby="newsletter-heading"
                        className="space-y-3"
                    >
                        <h4 className="text-base font-medium">Contact us</h4>
                        <ul>
                            <div className="flex flex-col space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Icons.address className="size-4" />
                                    <p>13285 SW 131th St Miami, FL 33186</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Icons.time className="size-4" />
                                    <p>
                                        Mon – Fri 7:30 am-4:30 pm Sat & Sun
                                        CLOSED
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Icons.phone className="size-4" />
                                    <p>(305) 278-6555</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Icons.Email className="size-4" />
                                    <p>support@gndmillwork.com</p>
                                </div>
                            </div>
                        </ul>
                    </section>
                    <section
                        id="footer-links"
                        aria-labelledby="footer-links-heading"
                        className="grid flex-1 grid-cols-1 gap-10 xxs:grid-cols-2 sm:grid-cols-2"
                    >
                        {siteConfig.footerNav.map((item) => (
                            <div key={item.title} className="space-y-3">
                                <h4 className="text-base font-medium">
                                    {item.title}
                                </h4>
                                <ul className="space-y-2.5">
                                    {item.items.map((link) => (
                                        <li key={link.title}>
                                            <Link
                                                href={link.href}
                                                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                                            >
                                                {link.title}
                                                <span className="sr-only">
                                                    {link.title}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </section>
                    <section
                        id="newsletter"
                        aria-labelledby="newsletter-heading"
                        className="space-y-3"
                    >
                        <h4 className="text-base font-medium">
                            Subscribe to for interesting info
                        </h4>
                        <JoinNewsletterForm />
                    </section>
                </section>
            </Shell>
        </footer>
    );
}

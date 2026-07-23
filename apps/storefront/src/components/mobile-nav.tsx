"use client";

import Link from "next/link";
import * as React from "react";

import { siteConfig } from "@/config/site";
import type { NavItem } from "@/types/nav";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@gnd/ui/accordion";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { Icons } from "@gnd/ui/icons";
import { Sheet, SheetContent, SheetTrigger } from "@gnd/ui/sheet";

interface MobileNavProps {
  items?: NavItem[];
}

export function MobileNav({ items }: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
        >
          <Icons.Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pr-0">
        <Link
          href="/"
          className="flex items-center space-x-2"
          onClick={() => setOpen(false)}
        >
          <span className="flex size-6 items-center [&_img]:size-6">
            <Icons.Logo />
          </span>
          <span className="font-bold">{siteConfig.name}</span>
        </Link>
        <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
          <Accordion type="multiple" className="w-full">
            {items?.map((item) =>
              item.items ? (
                <AccordionItem
                  value={item.title}
                  key={item.href ?? item.title}
                >
                  <AccordionTrigger>{item.title}</AccordionTrigger>
                  <AccordionContent>
                    <div className="flex flex-col space-y-2">
                      {item.items.map((subItem) =>
                        subItem.href ? (
                          <Link
                            key={`${subItem.href}:${subItem.title}`}
                            href={subItem.href}
                            className={cn(
                              "flex items-center text-sm font-medium text-muted-foreground",
                              subItem.disabled && "cursor-not-allowed opacity-80"
                            )}
                            onClick={() => setOpen(false)}
                          >
                            {subItem.title}
                          </Link>
                        ) : (
                          <div
                            key={subItem.title}
                            className="text-sm font-medium text-muted-foreground"
                          >
                            {subItem.title}
                          </div>
                        )
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ) : (
                item.href && (
                  <Link
                    key={item.href ?? item.title}
                    href={item.href}
                    className={cn(
                      "flex items-center text-sm font-medium text-muted-foreground",
                      item.disabled && "cursor-not-allowed opacity-80"
                    )}
                    onClick={() => setOpen(false)}
                  >
                    {item.title}
                  </Link>
                )
              )
            )}
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}

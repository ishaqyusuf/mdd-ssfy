"use client";

import { Button } from "@gnd/ui/button";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface BottomBarProps {
    selectedCount: number;
    onDeselect: () => void;
    children: ReactNode;
}

export function BottomBar({
    selectedCount,
    onDeselect,
    children,
}: BottomBarProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <motion.div
            className="pointer-events-none fixed bottom-6 left-0 right-0 z-50 flex h-12 justify-center"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
        >
            <div className="pointer-events-auto relative h-12 min-w-[400px]">
                <motion.div
                    className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                />
                <div className="relative flex h-12 items-center justify-between pl-4 pr-2">
                    <span className="text-sm">{selectedCount} selected</span>

                    <div className="flex items-center space-x-2">
                        <Button
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={onDeselect}
                        >
                            <span>Deselect all</span>
                        </Button>

                        {children}
                    </div>
                </div>
            </div>
        </motion.div>,
        document.body,
    );
}

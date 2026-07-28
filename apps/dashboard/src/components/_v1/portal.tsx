"use client";

import { useEffect, useState } from "react";
import { timeout } from "@/lib/timeout";
import { createPortal } from "react-dom";

interface Props {
    nodeId;
    children;
    noDelay?: boolean;
}
export default function Portal({ nodeId, noDelay, children }: Props) {
    const [node, setNode] = useState<HTMLElement | null>(null);

    useEffect(() => {
        let cancelled = false;
        let observer: MutationObserver | null = null;

        const resolveNode = async () => {
            if (!noDelay) await timeout(1500);
            if (cancelled) return;

            const existingNode = document.getElementById(nodeId);
            if (existingNode) {
                setNode(existingNode);
                return;
            }

            observer = new MutationObserver(() => {
                const nextNode = document.getElementById(nodeId);
                if (!nextNode) return;
                setNode(nextNode);
                observer?.disconnect();
                observer = null;
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
            });
        };

        setNode(document.getElementById(nodeId));
        void resolveNode();

        return () => {
            cancelled = true;
            observer?.disconnect();
        };
    }, [nodeId, noDelay]);

    if (node) return createPortal(<>{children}</>, node) as any;
    return null;
}

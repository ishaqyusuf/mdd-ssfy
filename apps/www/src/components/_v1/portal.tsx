"use client";

import { useEffect, useMemo, useState } from "react";
import { timeout } from "@/lib/timeout";
import { createPortal } from "react-dom";
import { useAsyncMemo } from "use-async-memo";

interface Props {
    nodeId;
    children;
    noDelay?: boolean;
}
export default function Portal({ nodeId, noDelay, children }: Props) {
    // const node = document.getElementById(nodeId);
    // const [node, setNode] = useState<any>(null);
    const nd = useAsyncMemo(async () => {
        if (!noDelay) await timeout(1500);
        return document.getElementById(nodeId);
    }, [nodeId, noDelay]);
    // useEffect(() => {
    //   const timer = setTimeout(
    //     async () => {
    //       // setPaymentState(Math.random() > 0.5 ? "success" : "failure");
    //       // const p = await validSquarePayment(paymentId);
    //       setNode(() => document.getElementById(nodeId));
    //     },
    //     noDelay ? 0 : 1500,
    //   );

    //   return () => clearTimeout(timer);
    // }, []);
    if (nd) return createPortal(<>{children}</>, nd) as any;
    return null;
}

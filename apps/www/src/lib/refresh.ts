"use client";

import { _useId } from "@/hooks/use-id";
import { dispatchSlice } from "@/store/slicers";

export default function refresh() {
    dispatchSlice("refreshToken", _useId());
}

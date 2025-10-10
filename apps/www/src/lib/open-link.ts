"use client";
import QueryString from "qs";

export function openLink(path, query = null, newTab = false) {
    const link = document.createElement("a");
    // let base = env.NEXT_PUBLIC_APP_URL;
    // base = path?.startsWith("http") ? null : `${base}/`;
    let base = path?.startsWith("http") ? "" : `${window.location.origin}/`;
    if (newTab) link.target = "_blank";
    const qs = query ? `?${QueryString.stringify(query)}` : null;
    link.href = `${base || ""}${path}${qs}`;
    link.click();
}

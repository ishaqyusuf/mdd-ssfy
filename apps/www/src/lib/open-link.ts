"use client";

import QueryString from "qs";

export function openLink(path, query = null, newTab = false) {
    const link = document.createElement("a");
    if (newTab) link.target = "_blank";
    const qs = query ? `?${QueryString.stringify(query)}` : "";
    const href = path?.startsWith("http")
        ? path
        : `${window.location.origin}${path?.startsWith("/") ? "" : "/"}${path}`;
    link.href = `${href}${qs}`;
    link.click();
}

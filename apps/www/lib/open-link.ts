"use client";

import QueryString from "qs";

export function openLink(path, query = {}, newTab = false) {
    const link = document.createElement("a");
    let base = process.env.NEXT_PUBLIC_APP_URL;
    base = path?.startsWith("http") ? null : `${base}/`;
    if (newTab) link.target = "_blank";
    link.href = `${base || ""}${path}?${QueryString.stringify(query)}`;
    link.click();
}

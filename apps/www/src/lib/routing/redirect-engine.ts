export type RedirectRule = {
    from: string;
    to: string;
    type?: "exact" | "pattern" | "prefix";
    permanent?: boolean;
    preserveQuery?: boolean;
};

export type ResolvedRedirect = {
    pathname: string;
    search: string;
    permanent: boolean;
};

const exactRedirectMaps = {
    "/community/invoices": "/community/unit-invoices",
    "/community/units": "/community/project-units",
    "/community/productions": "/community/unit-productions",
    "/sales-book/production-tasks": "/production/dashboard",
    "/settings/community/builders": "/community/builders",
    "community-settings/builders": "/community/builders",
    "/contractor/jobs": "/hrm/contractors/jobs",
    "/payments": "/jobs-dashboard/payments",
} as const;
const dynamicRedirectMaps = {
    "/community/project/:slug": "/community/projects/:slug",
    "/jobs/:taskType": "/jobs-dashboard",
    // "/sales-book/orders/:salesNo": "/sales-book/orders/v2/:salesNo",
    // "/sales-book/productions/:salesNo": "/sales-book/productions/v2/:salesNo",
} as const;
export const redirectRules: RedirectRule[] = [
    ...Object.entries(exactRedirectMaps).map(([from, to]) => ({
        from,
        to,
        type: "exact" as const,
        permanent: false,
        preserveQuery: true,
    })),
    ...Object.entries(dynamicRedirectMaps).map(([from, to]) => ({
        from,
        to: to as string,
        type: "pattern" as const,
    })),
    // Dynamic examples for future migrations:
    // {
    //     from: "/sales-book/orders/:salesNo",
    //     to: "/sales-book/orders/v2/:salesNo",
    //     type: "pattern",
    // },
    // {
    //     from: "/sales-book/productions/:salesNo",
    //     to: "/sales-book/productions/v2/:salesNo",
    //     type: "pattern",
    // },
];

export function resolveRedirectPath(input: string): ResolvedRedirect | null {
    return resolveRedirectPathWithRules(input, redirectRules);
}

export function resolveRedirectPathWithRules(
    input: string,
    rules: RedirectRule[],
): ResolvedRedirect | null {
    const url = new URL(input, "https://gnd.local");
    const pathname = normalizePath(url.pathname);
    const search = url.search;

    for (const rule of getOrderedRules(rules)) {
        const resolved = resolveRule(rule, pathname, search);
        if (!resolved) continue;

        const normalizedTarget = normalizePath(resolved.pathname);
        if (
            normalizedTarget === pathname &&
            (resolved.search || "") === (search || "")
        ) {
            return null;
        }

        return {
            pathname: normalizedTarget,
            search: resolved.search,
            permanent: resolved.permanent,
        };
    }

    return null;
}

export function resolveCanonicalPath(input: string): string {
    const url = new URL(input, "https://gnd.local");
    const resolved = resolveRedirectPath(url.toString());

    return resolved
        ? `${resolved.pathname}${resolved.search}`
        : `${normalizePath(url.pathname)}${url.search}`;
}

function getOrderedRules(rules: RedirectRule[]) {
    return [...rules].sort((left, right) => {
        const leftWeight = getRuleWeight(left);
        const rightWeight = getRuleWeight(right);
        if (leftWeight !== rightWeight) {
            return leftWeight - rightWeight;
        }

        return right.from.length - left.from.length;
    });
}

function getRuleWeight(rule: RedirectRule) {
    switch (rule.type ?? inferRuleType(rule.from)) {
        case "exact":
            return 0;
        case "pattern":
            return 1;
        case "prefix":
            return 2;
    }
}

function resolveRule(rule: RedirectRule, pathname: string, search: string) {
    const normalizedFrom = normalizePath(rule.from);
    const normalizedTo = normalizePath(rule.to);
    const preserveQuery = rule.preserveQuery !== false;
    const permanent = rule.permanent === true;
    const type = rule.type ?? inferRuleType(normalizedFrom);

    if (type === "exact") {
        if (pathname !== normalizedFrom) return null;
        return {
            pathname: normalizedTo,
            search: preserveQuery ? search : "",
            permanent,
        };
    }

    if (type === "prefix") {
        if (!pathname.startsWith(normalizedFrom)) return null;
        const suffix = pathname.slice(normalizedFrom.length);
        return {
            pathname: normalizePath(`${normalizedTo}${suffix}`),
            search: preserveQuery ? search : "",
            permanent,
        };
    }

    const match = matchPattern(normalizedFrom, pathname);
    if (!match) return null;

    return {
        pathname: interpolateParams(normalizedTo, match.params),
        search: preserveQuery ? search : "",
        permanent,
    };
}

function inferRuleType(path: string): RedirectRule["type"] {
    return path.includes("/:") ? "pattern" : "exact";
}

function matchPattern(pattern: string, pathname: string) {
    const patternParts = splitPath(pattern);
    const pathParts = splitPath(pathname);
    if (patternParts.length !== pathParts.length) return null;

    const params: Record<string, string> = {};

    for (const [index, part] of patternParts.entries()) {
        const current = pathParts[index];
        if (!current) return null;

        if (part.startsWith(":")) {
            params[part.slice(1)] = decodeURIComponent(current);
            continue;
        }

        if (part !== current) {
            return null;
        }
    }

    return { params };
}

function interpolateParams(
    target: string,
    params: Record<string, string>,
): string {
    const parts = splitPath(target).map((part) =>
        part.startsWith(":")
            ? encodeURIComponent(params[part.slice(1)] ?? "")
            : part,
    );

    return normalizePath(`/${parts.join("/")}`);
}

function splitPath(path: string) {
    return normalizePath(path).split("/").filter(Boolean);
}

function normalizePath(path: string) {
    if (!path) return "/";
    const normalized = `/${path}`.replace(/\/{2,}/g, "/");
    if (normalized.length > 1 && normalized.endsWith("/")) {
        return normalized.slice(0, -1);
    }
    return normalized;
}


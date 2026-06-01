"use client";

import dynamic from "next/dynamic";

type NewSalesFormProps = {
    mode: "create" | "edit";
    type: "order" | "quote";
    slug?: string;
};

const NewSalesForm = dynamic(
    () => import("./new-sales-form").then((module) => module.NewSalesForm),
    {
        loading: () => (
            <div className="rounded-lg border p-8 text-sm text-muted-foreground">
                Loading sales form...
            </div>
        ),
    },
);

export function LazyNewSalesForm(props: NewSalesFormProps) {
    return <NewSalesForm {...props} />;
}

"use client";

import RolesSheet from "./roles-sheet";

type Props = {
    //   defaultCurrency?: string;
};

export async function GlobalSheets({}: Props) {
    return (
        <>
            <RolesSheet />
            {/* We preload the invoice data (template, invoice number etc) */}
            {/* <Suspense fallback={null}>
        <InvoiceCreateSheetServer teamId={userData?.team_id} />
      </Suspense> */}
        </>
    );
}

"use client";
import RolesProfilesSheet from "./roles-profile-sheet";

type Props = {
    //   defaultCurrency?: string;
};

export function GlobalSheets({}) {
    return (
        <>
            <RolesProfilesSheet />
            {/* We preload the invoice data (template, invoice number etc) */}
            {/* <Suspense fallback={null}>
        <InvoiceCreateSheetServer teamId={userData?.team_id} />
      </Suspense> */}
        </>
    );
}

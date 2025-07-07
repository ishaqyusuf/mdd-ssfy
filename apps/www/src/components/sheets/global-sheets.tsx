"use client";
import { AuthGuard } from "../auth-guard";
import { _perm } from "../sidebar/links";
import RolesProfilesSheet from "./roles-profile-sheet";

type Props = {
    //   defaultCurrency?: string;
};

export function GlobalSheets({}) {
    return (
        <>
            <AuthGuard rules={[_perm.is("editRole")]}>
                <RolesProfilesSheet />
            </AuthGuard>
            {/* We preload the invoice data (template, invoice number etc) */}
            {/* <Suspense fallback={null}>
        <InvoiceCreateSheetServer teamId={userData?.team_id} />
      </Suspense> */}
        </>
    );
}

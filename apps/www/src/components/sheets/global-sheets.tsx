"use client";
import { AuthGuard } from "../auth-guard";
import { SearchModal } from "../search/search-modal";
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
            <SearchModal />
        </>
    );
}

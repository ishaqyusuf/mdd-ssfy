import { _dbUser, user } from "@/app/(v1)/_actions/utils";
import { Metadata } from "next";
import EmailPersolizeForm from "./email-personalize-form";
import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
import { BreadLink } from "@/components/_v1/breadcrumbs/links";
import { IUser } from "@/types/hrm";
import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";

export const metadata: Metadata = {
    title: "Email Settings | GND",
};

export default async function EmailSettingsPage({}) {
    const _user: IUser = await _dbUser();
    if (!_user.meta) _user.meta = {} as any;
    if (!_user.meta.emailRespondTo) _user.meta.emailRespondTo = _user.email;
    delete (_user.meta as any).exception;

    if (!_user.meta.emailTitle)
        _user.meta.emailTitle = `${
            _user.name?.split(" ")?.[0]
        } From Gnd Millwork`;
    if (!_user.meta.email) {
        const p1 = _user.username || _user.email?.split("@")[0];
        _user.meta.email = `${p1}@gndprodesk.com`;
    }
    return (
        <AuthGuard roles={["Admin"]}>
            <Breadcrumbs>
                <BreadLink isFirst title="Settings" />
                <BreadLink isLast title="Email" />
            </Breadcrumbs>
            <EmailPersolizeForm user={_user as any} />
        </AuthGuard>
    );
}

import AuthGuard from "@/app/(v2)/(loggedIn)/_components/auth-guard";
import { cn } from "@/lib/utils";
import { ICan } from "@/types/auth";
import FTitle from "./f-page-title";
import { PrimitiveDivProps } from "@/types/type";

export type AuthPermissions = (keyof ICan | (keyof ICan)[])[];
interface Props extends PrimitiveDivProps {
    can?: AuthPermissions;
    roles?: string[];
    permissionType?: "every" | "some" | "none";
    title?: string;
}

export default function FPage({
    children,
    className,
    can,
    title,
    roles,
    permissionType,
}: Props) {
    return (
        <AuthGuard can={can} permissionType={permissionType} roles={roles}>
            {title && <FTitle>{title}</FTitle>}
            <div className={cn(className)}>{children}</div>
        </AuthGuard>
    );
}

"use client";

import { openModal } from "@/lib/modal";
import { ModalName } from "@/store/slicers";

import { Button } from "@gnd/ui/button";

import AuthGuard, {
    AuthPermissions,
} from "../../app/(v2)/(loggedIn)/_components/auth-guard";
import { Icons } from "./icons";
import LinkableNode from "./link-node";

interface Props {
    title;
    subtitle?;
    newLink?;
    Action?;
    modalData?;
    buttonText?;
    newDialog?: ModalName;
    ButtonIcon?;
    permissions?: AuthPermissions;
    newAction?;
}
export default function PageHeader({
    title,
    newLink,
    subtitle,
    Action,
    permissions,
    newDialog,
    newAction,
    buttonText = "New",
    ButtonIcon = "add",
    modalData,
}: Props) {
    const BtnIcon = Icons[ButtonIcon];
    return (
        <div className="flex items-center justify-between space-y-2">
            <div className="space-y-0.5">
                <h2
                    className="text-xl font-bold capitalize tracking-tight sm:text-2xl
                "
                >
                    {title}
                </h2>
                {subtitle && (
                    <p className="text-muted-foreground">{subtitle}</p>
                )}
            </div>
            <div className="flex items-center space-x-2">
                <AuthGuard can={permissions || []}>
                    {(newLink || newDialog || newAction) && (
                        <Button
                            onClick={() => {
                                newDialog && openModal(newDialog, modalData);
                                newAction && newAction();
                            }}
                            size="sm"
                            className="h-8"
                        >
                            <LinkableNode
                                className="inline-flex items-center"
                                href={newLink}
                            >
                                <BtnIcon className="mr-2 h-4 w-4" />
                                <span>{buttonText} </span>
                            </LinkableNode>
                        </Button>
                    )}
                </AuthGuard>
                {Action && <Action />}
            </div>
        </div>
    );
}

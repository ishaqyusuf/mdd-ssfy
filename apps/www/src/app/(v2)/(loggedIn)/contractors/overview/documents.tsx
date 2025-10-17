"use client";

import Image from "next/image";
import { _deleteContractorDoc } from "@/app/(v2)/(loggedIn)/contractors/overview/_actions/delete-contractor-doc";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { openModal } from "@/lib/modal";
import { IUserDoc } from "@/types/hrm";

import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";

import { ContractorOverview } from "./type";

interface Props {
    contractor: ContractorOverview;
    className?: string;
}
export default function ContractorDocuments({ contractor, ...props }: Props) {
    async function deleteImg(img: IUserDoc) {
        await _deleteContractorDoc(img);
    }
    return (
        <Card {...props}>
            <CardHeader>
                <CardTitle>
                    <span>Documents</span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Button onClick={() => openModal("uploadDoc", contractor)}>
                    Upload
                </Button>
                <Table>
                    <TableBody>
                        {contractor.user.documents?.map((doc) => (
                            <TableRow key={doc.id}>
                                <TableCell>
                                    <Image
                                        className="cursor-pointer rounded border-2"
                                        onClick={() =>
                                            openModal("img", {
                                                src: doc.meta.url,
                                            })
                                        }
                                        width={70}
                                        height={50}
                                        src={doc.meta.url}
                                        alt={doc.description as any}
                                    />
                                </TableCell>
                                <TableCell>
                                    <p>{doc.description}</p>
                                    <ConfirmBtn onClick={() => deleteImg(doc)}>
                                        Delete
                                    </ConfirmBtn>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

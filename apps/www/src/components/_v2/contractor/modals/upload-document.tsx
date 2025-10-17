"use client";

// import cloudinary from "@/lib/cloudinary";
import { useRef } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { _saveDocUpload } from "@/app/(v2)/(loggedIn)/contractors/overview/_actions/upload-contractor-doc";
import { ContractorOverview } from "@/app/(v2)/(loggedIn)/contractors/overview/type";
import Btn from "@/components/_v1/btn";
import BaseModal from "@/components/_v1/modals/base-modal";
import { closeModal } from "@/lib/modal";
import { uploadFile } from "@/lib/upload-file";
import { IUser } from "@/types/hrm";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";

export default function UploadDocumentModal({}) {
    const fileInputRef = useRef(null);
    const form = useForm({
        defaultValues: {
            file: null,
            description: null,
            url: null,
            userId: null,
            meta: {},
        },
    });
    const [loading, startTransition] = useTransition();
    async function uploadImage() {
        startTransition(async () => {
            const { file, ...formData } = form.getValues();
            if (!file) {
                toast.error("Upload a valid image");
            } else {
                const data = await uploadFile(file, "contractor-document");

                if (data.error) {
                    toast.error(data.error.message);
                } else {
                    formData.url = data.public_id;
                    formData.meta = {
                        url: data.secure_url,
                        assetId: data.asset_id,
                    };
                    await _saveDocUpload(formData);
                    toast.success("upload successful");
                }
                closeModal();
            }
        });
    }
    const handleFileUpload = async () => {
        // 'use server'
        const fileInput = fileInputRef.current as any;
        const file = fileInput?.files?.[0];
        if (file) {
            form.setValue("file", file);
        }
    };
    return (
        <BaseModal<ContractorOverview>
            className="sm:max-w-[500px]"
            onOpen={(data) => {
                form.reset({
                    userId: data?.user.id,
                    meta: {},
                } as any);
            }}
            modalName="uploadDoc"
            Title={({ data }) => (
                <div className="flex items-center space-x-2">
                    Upload Document
                </div>
            )}
            Subtitle={({ data }) => <>{data?.user.name}</>}
            Footer={({ data }) => (
                <>
                    <Btn isLoading={loading} onClick={uploadImage}>
                        Upload
                    </Btn>
                </>
            )}
            Content={({ data }) => (
                <div>
                    <div className="">
                        <div className="">
                            <div className="">
                                <div className="mb-4 border-2 border-dashed border-gray-400 p-4">
                                    <label className="mb-2 block text-sm font-bold text-gray-700">
                                        Select a file
                                    </label>
                                    <input
                                        accept="image/*"
                                        type="file"
                                        ref={fileInputRef}
                                        className="w-full p-2"
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Document Info</Label>
                            <Input
                                className=""
                                {...form.register("description")}
                            />
                        </div>
                    </div>
                </div>
            )}
        />
    );
}

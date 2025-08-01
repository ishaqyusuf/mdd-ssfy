import { usePacking } from "@/hooks/use-sales-packing";
import { useZodForm } from "@/hooks/use-zod-form";
import { Button } from "@gnd/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { CheckCircle, X } from "lucide-react";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { SignaturePad } from "./signature-pad";

import { AttachmentGallery } from "./attachment-gallery";
import { useFieldArray } from "react-hook-form";
import { useSignature } from "@/hooks/use-signature";
import { dispatchForm } from "@sales/schema";

// const schema = z.object({
//     receivedBy: z.string(),
//     note: z.string(),
//     attachments: z.array(
//         z.object({
//             pathname: z.string(),
//         }),
//     ),
// });
export function DispatchCompleteForm({}) {
    const ctx = usePacking();
    const showPackingWarning = true;
    const onCancel = () => {
        ctx.setMainTab("main");
    };
    const form = useZodForm(dispatchForm, {
        defaultValues: {
            receivedBy: ctx?.data?.address?.name,
            note: "",
            attachments: [],
            signature: null,
            dispatchId: ctx.data.dispatch.id,
        },
    });
    const {
        fields: attachments,
        append,
        remove,
        insert,
    } = useFieldArray({
        control: form.control,
        name: "attachments",
    });
    const sig = useSignature({
        id: `dispatch-${ctx.data?.dispatch?.id}`,
        title: `Dispatch ${ctx.data?.dispatch?.id} Signature`,
    });
    return (
        <div className="">
            <Card>
                <CardHeader className="bg-green-50">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Complete Dispatch
                        </CardTitle>
                        <Button variant="ghost" size="icon" onClick={onCancel}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form
                            className="p-6 space-y-6"
                            onSubmit={form.handleSubmit(
                                async (data: z.infer<typeof dispatchForm>) => {
                                    const signature = await sig.saveSignature(
                                        "dispatch-documents",
                                        `${data.receivedBy}`,
                                    );
                                    data.signature = signature;
                                    ctx.onSubmitDispatch(data);
                                },
                            )}
                        >
                            {/* Packing Warning */}
                            {showPackingWarning && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-amber-100 rounded-full p-1">
                                            <CheckCircle className="h-4 w-4 text-amber-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-amber-800">
                                                Incomplete Packing
                                            </h4>
                                            <p className="text-sm text-amber-700 mt-1">
                                                Some items are not fully packed.
                                                You can still complete the
                                                dispatch, but make sure this is
                                                intentional (partial delivery,
                                                back-order, etc.).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Customer Information */}
                            <div>
                                <h4 className="font-medium mb-3">
                                    Customer Information
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">
                                            Contact:
                                        </span>
                                        <span className="ml-2 font-medium">
                                            {ctx.data.address.name}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">
                                            Phone:
                                        </span>
                                        <span className="ml-2 font-medium">
                                            {ctx.data.address.phone}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Received By */}
                            <div className="space-y-2">
                                <FormInput
                                    label="Received By*"
                                    control={form.control}
                                    name="receivedBy"
                                    placeholder="Enter recipient name"
                                />
                            </div>

                            {/* Signature Pad */}
                            <SignaturePad
                                signatureId={sig.id}
                                onSignatureChange={
                                    async (signature) => {
                                        const blobData = await fetch(
                                            signature,
                                        ).then((res) => res.blob());
                                        console.log(blobData);
                                    }

                                    // onCompletionDataChange({ signature })
                                }
                            />

                            {/* Photo Upload */}
                            {/* <FileUpload
                            photo={completionData.photo}
                            onPhotoChange={(photo) =>
                                onCompletionDataChange({ photo })
                            }
                        /> */}

                            <AttachmentGallery
                                attachments={attachments as any}
                                path="dispatch-documents"
                                onAttached={(result) => {
                                    for (const a of result)
                                        append({
                                            pathname: a.pathname,
                                        });
                                }}
                                onDelete={(data, i) => {
                                    remove(i);
                                }}
                            />
                            {/* <FileUpload
                                label="Attach Photo (Optional)"
                                path="dispatch-documents"
                                onUploadComplete={(e) => {
                                    console.log(e);
                                }}
                            >
                                <Label
                                    onClick={() =>
                                        document
                                            .getElementById("upload-files")
                                            ?.click()
                                    }
                                    className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                >
                                    <Camera className="size-4" />
                                    <span>Take Photo</span>
                                </Label>
                            </FileUpload> */}
                            {/* Note */}
                            <div className="space-y-2">
                                <FormInput
                                    label=" Delivery Notes (Optional)"
                                    type="textarea"
                                    control={form.control}
                                    name="note"
                                    placeholder="Add any notes about the delivery (condition, location, special instructions, etc.)"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="flex gap-3 pt-4">
                                <SubmitButton
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    isSubmitting={ctx.submitDispatch.isPending}
                                >
                                    Complete Dispatch & Confirm Delivery
                                </SubmitButton>
                                <Button variant="outline" onClick={onCancel}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}


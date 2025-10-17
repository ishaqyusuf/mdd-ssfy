"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { put } from "@vercel/blob";
import { BlobPath } from "@gnd/utils/constants";
import { env } from "@/env.mjs";

interface SignaturePadProps {
    onSignatureChange: (signature: string) => void;
    signatureId: string;
}

export function SignaturePad({
    onSignatureChange,
    signatureId,
}: SignaturePadProps) {
    const [isDrawing, setIsDrawing] = useState(false);

    const startDrawing = (
        e:
            | React.MouseEvent<HTMLCanvasElement>
            | React.TouchEvent<HTMLCanvasElement>,
    ) => {
        setIsDrawing(true);
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x =
            "touches" in e
                ? e.touches[0].clientX - rect.left
                : e.clientX - rect.left;
        const y =
            "touches" in e
                ? e.touches[0].clientY - rect.top
                : e.clientY - rect.top;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.beginPath();
            ctx.moveTo(x, y);
        }
    };

    const draw = (
        e:
            | React.MouseEvent<HTMLCanvasElement>
            | React.TouchEvent<HTMLCanvasElement>,
    ) => {
        if (!isDrawing) return;

        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const x =
            "touches" in e
                ? e.touches[0].clientX - rect.left
                : e.clientX - rect.left;
        const y =
            "touches" in e
                ? e.touches[0].clientY - rect.top
                : e.clientY - rect.top;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.lineWidth = 2;
            ctx.lineCap = "round";
            ctx.strokeStyle = "#000";
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = document.getElementById(
            signatureId,
        ) as HTMLCanvasElement;
        if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        onSignatureChange("");
    };

    return (
        <div className="space-y-2">
            <Label>Digital Signature</Label>
            <div className="border rounded-lg p-4 bg-white">
                <canvas
                    id={signatureId}
                    width={400}
                    height={200}
                    className="border border-dashed border-gray-300 w-full h-32 cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
                <div className="flex justify-between mt-2">
                    <p className="text-xs text-muted-foreground">Sign above</p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearSignature}
                    >
                        Clear
                    </Button>
                </div>
            </div>
        </div>
    );
}


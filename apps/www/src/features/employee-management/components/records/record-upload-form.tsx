"use client";

import { Button } from "@gnd/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@gnd/ui/dialog";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { useState } from "react";
import { EmployeeRecord } from "../../types";

interface Props {
    open: boolean;
    onClose: () => void;
    onSubmit?: (data: {
        type: EmployeeRecord["type"];
        title: string;
        expiresAt?: string;
    }) => void;
}

const recordTypes: { value: EmployeeRecord["type"]; label: string }[] = [
    { value: "insurance", label: "Insurance" },
    { value: "background-check", label: "Background Check" },
    { value: "certification", label: "Certification" },
    { value: "id", label: "ID" },
    { value: "other", label: "Other" },
];

export function RecordUploadForm({ open, onClose, onSubmit }: Props) {
    const [type, setType] = useState<EmployeeRecord["type"]>("insurance");
    const [title, setTitle] = useState("");
    const [expiresAt, setExpiresAt] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSubmit?.({ type, title, expiresAt: expiresAt || undefined });
        setTitle("");
        setExpiresAt("");
        onClose();
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upload Record</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label>Type</Label>
                        <Select
                            value={type}
                            onValueChange={(v) =>
                                setType(v as EmployeeRecord["type"])
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                {recordTypes.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Title</Label>
                        <Input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Liability Insurance 2025"
                            required
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <Label>Expiry Date (optional)</Label>
                        <Input
                            type="date"
                            value={expiresAt}
                            onChange={(e) => setExpiresAt(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={!title}>
                            Upload
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

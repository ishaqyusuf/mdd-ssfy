"use client";
import { useCommunityModelStore } from "@/store/community-model";
import { Button } from "@gnd/ui/button";

export function FormHeader() {
    const store = useCommunityModelStore();
    const onSubmit = () => {};
    return (
        <div className="flex justify-end">
            <Button>Save</Button>
        </div>
    );
}


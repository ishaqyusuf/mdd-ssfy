"use client";

import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";

export function OpenCommunityTemplateModal() {
    const { setParams } = useCommunityTemplateParams();

    return (
        <>
            <div>
                <Button
                    onClick={(e) => {
                        setParams({
                            createTemplate: true,
                        });
                    }}
                >
                    <Icons.Add className="mr-2" />
                    New
                </Button>
            </div>
        </>
    );
}


import { useRef, useState } from "react";
import {
    harvestDoorPricingUseCase,
    saveHarvestedDoorPricingUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { Menu } from "@/components/(clean-code)/menu";
import { chunker } from "@/lib/chunker";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";

export default function DoorPriceHarvest({}) {
    function woker() {
        harvestDoorPricingUseCase().then((list) => {
            chunker({
                worker: saveHarvestedDoorPricingUseCase,
                list,
            });
        });
    }
    return (
        <Menu.Item disabled onClick={woker}>
            Scrape Door Price
        </Menu.Item>
    );
}

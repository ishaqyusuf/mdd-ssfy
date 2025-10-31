"use client";
import { _modal } from "@/components/common/modal/provider";
import { ComponentHelperClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import DoorSizeSelectModal from ".";

export function openDoorSizeSelectModal(cls: ComponentHelperClass, door?) {
    console.log({
        i: cls.itemUid,
        is: cls.itemStepUid,
        s: cls.stepUid,
    });
    _modal.openModal(<DoorSizeSelectModal door={door} cls={cls} />);
}

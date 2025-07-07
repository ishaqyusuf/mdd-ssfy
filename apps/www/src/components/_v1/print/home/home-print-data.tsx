"use client";

import { DesignTemplateForm } from "@/app/(v1)/(loggedIn)/settings/community/_components/model-form/model-form";
import {
    BifoldDoorForm,
    DecoForm,
    DoubleDoorForm,
    ExteriorFrame,
    GarageDoorForm,
    InteriorDoorForm,
    LockHardwareForm,
    ProjectHeaderForm,
} from "@/app/(v1)/(loggedIn)/settings/community/_components/model-form/model-sections";
import { ExtendedHome, HomeTemplateDesign, IHome } from "@/types/community";
import { useForm } from "react-hook-form";

interface Props {
    design: HomeTemplateDesign;
    home: ExtendedHome;
}
export default function HomePrintData({ design, home }: Props) {
    const defaultValues = {
        ...(design || {}),
        ctx: {
            print: true,
        },
    };
    const form = useForm<DesignTemplateForm>({
        defaultValues,
    });

    return (
        <>
            <div>
                <table className="border-collapse bg-white w-full shidden print:table table-fixed">
                    <thead>
                        <tr>
                            <th colSpan={28} className="">
                                <div className="flex flex-col">
                                    <span className="text-xl font-bold">
                                        GND Millwork Corp.
                                    </span>
                                    <span className="text-base tracking-wide font-semibold leading-none">
                                        13285 SW 131 St Miami, Fl 33186
                                    </span>
                                    <div className="my-2 space-y-1">
                                        <div className="border-b border-2 border-primary"></div>
                                        <div className="border-b border-primary"></div>
                                    </div>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colSpan={28}>
                                <ProjectHeaderForm form={form} />
                                {/*  */}
                                <ExteriorFrame form={form} />
                                {/* Interior */}
                                <GarageDoorForm form={form} />
                                <InteriorDoorForm form={form} />
                                <DoubleDoorForm form={form} />
                                <BifoldDoorForm form={form} />
                                {/* lock */}
                                <LockHardwareForm form={form} />
                                {/* deco */}
                                <DecoForm form={form} />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </>
    );
}

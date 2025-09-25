import { useState } from "react";
import { browseComponentImgUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { useDebounceInput } from "@/hooks/use-debounce";

import { Input } from "@gnd/ui/input";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { ComponentImg } from "../../../../../../../../components/forms/sales-form/component-img";

interface Props {
    onSelect?(img: string);
    onBack?();
    title;
    stepId;
}
export function openImgModal(props: Props) {
    _modal.openModal(<StepComponentFormModal {...props} />);
}

export default function StepComponentFormModal(props: Props) {
    let initialInput = "";
    const [results, setResults] = useState<{ img: string; title: string }[]>(
        [],
    );
    const [msg, setMsg] = useState("");
    async function search() {
        let q = deb.value;
        // if (!q) setMsg("Start typing component name to search");
        // else
        browseComponentImgUseCase({
            q,
            stepId: props.stepId,
        }).then((res) => {
            if (!res.length) {
                setResults([]);
                setMsg("No result found");
            } else {
                setResults(res);
                setMsg("");
            }
        });
    }
    const deb = useDebounceInput(initialInput, 400, search);
    return (
        <Modal.Content size="xl">
            <Modal.Header
                onBack={props.onBack}
                title={"Search Image"}
                subtitle={props.title}
            />
            <div className="flex flex-col gap-4">
                <div>
                    <Input
                        placeholder="Search..."
                        value={deb.value}
                        onChange={(e) => deb.setValue(e.target.value)}
                    />
                </div>
                <ScrollArea className="h-[80vh]">
                    {msg && (
                        <div className="flex justify-center to-muted-foreground py-4">
                            {msg}
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                        {results?.map((component, index) => (
                            <div
                                key={index}
                                onClick={(e) => {
                                    props.onSelect(component.img);
                                }}
                                className="flex cursor-pointer flex-col items-center border p-2 hover:border-muted-foreground"
                                // component={component}
                                // swapDoor={door}
                            >
                                <div className="w-full">
                                    <ComponentImg
                                        noHover
                                        aspectRatio={2 / 1}
                                        src={component.img}
                                    />
                                </div>
                                <span className="font-mono uppercase">
                                    {component.title}
                                </span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>
        </Modal.Content>
    );
}

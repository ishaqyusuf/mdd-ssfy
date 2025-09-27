import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Suspense } from "react";
import { createSchemaBlockContext, SchemaBlockProvider } from "./context";

interface Props {
    blockId: number;
    children?;
}
export function SchemaBlock(props: Props) {
    return (
        <Suspense fallback={<Skeletons.Dashboard />}>
            <SchemaBlockProvider
                value={createSchemaBlockContext({
                    blockId: props.blockId,
                })}
            >
                <Form />
                {props.children}
            </SchemaBlockProvider>
        </Suspense>
    );
}

function Form({}) {
    return <div className=""></div>;
}


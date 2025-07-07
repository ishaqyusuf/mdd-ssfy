import { createContext, useContext, useEffect } from "react";
import { Cmd } from ".";
import { useForm } from "react-hook-form";
import { usePathname } from "next/navigation";

interface CmdContext {
    form: any;
}
interface CmdFormProps {
    form: any;
}
const cmdContext = createContext<CmdContext>({} as any);

export const CommandProvider = ({ children }) => {
    const form = useForm({
        defaultValues: {
            pageActions: {},
        },
    });
    const initialValue = {
        form,
    };
    //use effect perform action when new page loads

    return (
        <cmdContext.Provider value={initialValue}>
            {children}
            <Cmd />
        </cmdContext.Provider>
    );
};
export function useCmd(actions?) {
    const cmd = useContext<CmdContext>(cmdContext);
    const path = usePathname();
    if (actions) {
        cmd.form.setValue(`pageActions.${path}`, {
            commands: actions,
        });
        // console.log(actions);
    }
    return {
        ...cmd,
    };
}

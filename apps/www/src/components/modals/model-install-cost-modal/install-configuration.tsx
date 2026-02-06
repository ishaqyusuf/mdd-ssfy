import { useBuilderModelInstallsContext } from "@/hooks/use-model-install-config";

export function InstallConfiguration() {
    const { tasks, installCosts } = useBuilderModelInstallsContext();
    console.log({ installCosts, tasks });
    return (
        <>
            <div className="bg-green-200 h-screen"></div>
        </>
    );
}


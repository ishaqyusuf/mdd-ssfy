import { useBuilders } from "@/_v2/hooks/use-static-data";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { saveProject } from "@/app/(v1)/_actions/community/projects";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import { ModalContextProps } from "@/components/common/modal/provider";
import { projectSchema } from "@/lib/validations/community-validations";
import { IProject } from "@/types/community";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Form } from "@gnd/ui/form";

import { updateProjectAction } from "./actions/action";

export default function ProjectModal({ data }: { data?: IProject }) {
    const form = useForm<IProject>({
        resolver: zodResolver(projectSchema),
        defaultValues: {
            ...data,
        },
    });
    const builders = useBuilders();
    async function save(modal: ModalContextProps) {
        const data = form.getValues();
        if (!data.id) await saveProject(data);
        else await updateProjectAction(data);
        modal.close();
        toast.message("Saved!");
        _revalidate("projects");
    }
    return (
        <Form {...form}>
            <Modal.Content>
                <Modal.Header
                    title={data?.id ? "Edit Project" : "Create Project"}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        size="sm"
                        control={form.control}
                        name="title"
                        label="Project Name"
                        className="col-span-2"
                    />
                    <FormInput
                        size="sm"
                        control={form.control}
                        name="refNo"
                        label="Ref No."
                    />
                    <FormSelect
                        options={builders.data || []}
                        label="Builder"
                        valueKey="id"
                        titleKey="name"
                        size="sm"
                        name="builderId"
                        control={form.control}
                    />
                    <FormInput
                        size="sm"
                        control={form.control}
                        name="address"
                        label="Address"
                        className="col-span-2"
                    />
                    <FormInput
                        size="sm"
                        control={form.control}
                        name="meta.supervisor.name"
                        label="Supervisor"
                    />
                    <FormInput
                        size="sm"
                        control={form.control}
                        name="meta.supervisor.email"
                        label="Supervisor Email"
                    />
                </div>
                <Modal.Footer onSubmit={save} />
            </Modal.Content>
        </Form>
    );
}

import { getTakeOffStepForms } from "@/actions/get-takeoff-step-forms";
import { useTakeoff, useTakeoffItem } from "./context";
import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { Menu } from "@/components/(clean-code)/menu";
import { ComponentImg } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/component-img";
import { Home } from "lucide-react";

export function SectionSelector() {
    const ctx = useTakeoff();
    const { itemUid: uid, section } = useTakeoffItem();
    async function select(componentUid, templateId?) {
        const section = ctx.sections.find(
            (s) => s.componentUid == componentUid,
        );
        const template = section?.templates?.find((t) => t.id == templateId);
        const stepForms = await getTakeOffStepForms({
            configs:
                template?.data?.formSteps ||
                section.routeSequence?.map(({ uid: stepUid }) => ({
                    stepUid,
                })),
            itemUid: uid,
        });

        const zus = ctx.zus;
        // zus.dotUpdate(`sequence.formItem`, fi);
        Object.keys(zus.kvStepForm)
            .filter((k) => k.startsWith(uid))
            .map((val) => zus.removeKey(`kvStepForm.${val}`));
        const rootItemStepUid = `${uid}-${section.stepUid}`;

        zus.dotUpdate(`kvStepForm.${rootItemStepUid}`, {
            componentUid: section.componentUid,
            stepId: section.stepId,
            componentId: section.componentId,
            value: section.title,
            title: `Item Type`,
        });
        const seq = stepForms.map((a) => {
            zus.dotUpdate(`kvStepForm.${a.stepFormUid}`, a.stepForm);
            return a.stepFormUid;
        });
        if (!template) seq.unshift(`${uid}-${section.stepUid}`);
        zus.dotUpdate(`sequence.stepComponent.${uid}`, seq);
        const component = new ComponentHelperClass(
            rootItemStepUid,
            section.componentUid,
        );
        component.resetGroupItem(section.title);
    }
    return (
        <Menu
            label={
                <span className="uppercase">{section?.title || "Section"}</span>
            }
            Icon={() => (
                <>
                    {section?.img ? (
                        <div className="size-4">
                            <ComponentImg
                                aspectRatio={0.9}
                                src={section?.img}
                            />
                        </div>
                    ) : (
                        <Home className="size-4" />
                    )}
                </>
            )}
        >
            {ctx.sections.map((section) => (
                <Menu.Item
                    onClick={(e) => {
                        select(section.componentUid);
                    }}
                    SubMenu={
                        section?.templates?.length ? (
                            <>
                                <Menu.Item
                                    onClick={(e) => {
                                        select(section.componentUid);
                                    }}
                                >
                                    New
                                </Menu.Item>
                                {section?.templates?.map((template) => (
                                    <Menu.Item
                                        onClick={(e) => {
                                            select(
                                                section.componentUid,
                                                template.id,
                                            );
                                        }}
                                        key={template.id}
                                    >
                                        {template.title}
                                    </Menu.Item>
                                ))}
                            </>
                        ) : null
                    }
                    key={section.componentUid}
                >
                    {section.title}
                </Menu.Item>
            ))}
        </Menu>
    );
}

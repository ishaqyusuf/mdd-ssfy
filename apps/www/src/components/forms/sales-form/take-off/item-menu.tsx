import { Menu } from "@/components/(clean-code)/menu";
import { useTakeoffItem } from "./context";
import { copySalesTakeOffItem } from "@/lib/sales/copy-sales-item";
import ConfirmBtn from "@/components/confirm-button";
import { ItemClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/item-class";

export function ItemMenu({}) {
    const ctx = useTakeoffItem();
    const copyOptions = ctx.zus.sequence.formItem
        ?.map((uid, index) => {
            return {
                uid,
                index,
                title: ctx.zus.kvFormItem[uid]?.title,
            };
        })
        ?.filter((f) => f.uid != ctx.itemUid);
    return (
        <div className="flex items-center gap-2">
            <DeleteMenu />
            <Menu triggerSize="lg">
                <Menu.Item
                    onClick={(e) => {
                        ctx.setOpenTemplateForm(true);
                    }}
                >
                    Create Template
                </Menu.Item>
                <Menu.Item
                    SubMenu={copyOptions?.map((opt) => (
                        <Menu.Item
                            onClick={(e) => {
                                copySalesTakeOffItem(opt.uid, ctx.itemUid, ctx);
                            }}
                            key={opt.index}
                        >
                            {opt.title || `Item ${opt.index + 1}`}
                        </Menu.Item>
                    ))}
                    disabled={!copyOptions?.length}
                >
                    Copy
                </Menu.Item>
            </Menu>
        </div>
    );
}
function DeleteMenu() {
    const ctx = useTakeoffItem();
    function deleteItem() {
        const cls = new ItemClass(ctx?.itemUid);
        cls.deleteItem();
    }
    return <ConfirmBtn onClick={deleteItem} trash size="icon" />;
}

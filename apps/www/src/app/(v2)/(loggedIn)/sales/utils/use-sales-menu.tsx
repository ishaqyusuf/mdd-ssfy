import { useRouter } from "next/navigation";
import {
    copySalesUseCase,
    moveOrderUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-form-use-case";
import { useAssignment } from "@/app/(v2)/(loggedIn)/sales-v2/productions/_components/_modals/assignment-modal/use-assignment";
import { updateDeliveryModeDac } from "@/app/(v2)/(loggedIn)/sales/_data-access/update-delivery-mode.dac";
import salesData from "@/app/(v2)/(loggedIn)/sales/sales-data";
import useSalesPdf from "@/app/(v2)/printer/sales/use-sales-pdf";
import {
    DeleteRowAction,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import { IconKeys } from "@/components/_v1/icons";
import SendEmailSheet from "@/components/_v2/email/send-email";
import { useModal } from "@/components/common/modal/provider";
import { openLink } from "@/lib/open-link";
import { truthy } from "@/lib/utils";
import { IOrderPrintMode, ISalesType } from "@/types/sales";
import { toast } from "sonner";

import {
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@gnd/ui/dropdown-menu";

import {
    copyOrderAction,
    deleteOrderAction,
} from "../../../../(v1)/(loggedIn)/sales/_actions/sales";

type Mode = "dealer" | "internal";
export function useSalesMenu(item: any, mode: Mode = "internal") {
    const modal = useModal();
    const isEstimate = item.type == "quote";
    const { isDyke, type, slug } = item;

    const typeSlug = `${type}/${slug}`;
    const _viewHref = isDyke ? `/sales-v2/overview/${typeSlug}` : ``;
    const _editHref = isDyke ? `/sales/${typeSlug}` : `${_viewHref}/form`;

    const assignment = useAssignment();
    function emailAction() {
        const email =
            item.billingAddress?.email ||
            item.shippingAddress?.email ||
            item.customer?.email;

        modal?.openSheet(
            <SendEmailSheet
                data={{
                    parentId: item.id,
                    to: email as any,
                    type: !isEstimate ? "sales" : "quote",
                }}
                download={{
                    slug: item.orderId,
                    date: item.createdAt,
                    path: "sales",
                }}
                subtitle={`Sales Order | ${item.orderId}`}
            />,
        );
    }
    function prodAction() {
        assignment.open(item.id);
    }
    async function updateDeliveryMode(delivery) {
        if (delivery != item.deliveryOption) {
            await updateDeliveryModeDac(
                item.id,
                delivery,
                !isEstimate ? "orders" : "quotes",
            );
            toast.success("Updated");
        }
    }
    const router = useRouter();
    const copyAs = async (as: ISalesType) => {
        const resp = item.isDyke
            ? await copySalesUseCase(item.orderId, as)
            : await copyOrderAction({
                  orderId: item.orderId,
                  as,
              });
        if (resp.link)
            toast.message(`${as} copied successfully`, {
                action: {
                    label: "Open",
                    onClick: () => router.push(resp.link),
                },
            });
    };
    const moveTo = async (type: ISalesType) => {
        await moveOrderUseCase(item.orderId, type);

        toast.message("Success");
    };
    const moveToQuote = async () => await moveTo("quote");
    const moveToSales = async () => await moveTo("order");
    const copyAsSale = async () => await copyAs("order");
    const copyAsEstimate = async () => await copyAs("quote");

    const _pdf = useSalesPdf();
    function print(mode: IOrderPrintMode, sec) {
        const print = sec == "Print";
        const mockup = sec == "Print Mockup";
        const pdf = sec == "Pdf";

        let ids = [item.slug];
        const query = {
            slugs: ids.join(","),
            mode,
            mockup: mockup ? "yes" : "no",
            preview: false,
        };
        if (item.deletedAt) (query as any).deletedAt = item.deletedAt;
        if (pdf)
            _pdf?.print({
                ...query,
                pdf: true,
            } as any);
        else openLink(`printer/sales`, query, true);
    }
    const fullPrint = _option(
        "Print",
        null,
        "print",
        isEstimate
            ? [
                  _option("Print", () => print("quote", "print"), "estimates"),
                  _option(
                      "Print Mockup",
                      () => print("quote", "Print Mockup"),
                      "box",
                  ),
                  _option("Pdf", () => print("quote", "Pdf"), "pdf"),
              ]
            : ["Print", "Print Mockup", "Pdf"]
                  .map((groupTitle) => [
                      { groupTitle },
                      _option(
                          "Order & Packing",
                          () => print("order-packing", groupTitle),
                          "box",
                      ),
                      _option(
                          "Order",
                          () => print("order", groupTitle),
                          "orders",
                      ),
                      _option(
                          "Packing List",
                          () => print("packing list", groupTitle),
                          "packingList",
                      ),
                      _option(
                          "Production",
                          () => print("production", groupTitle),
                          "production",
                      ),
                  ])
                  .flat(),
    );
    const _actions = {
        view: _option("View", _viewHref, "view"),
        edit: _option("Edit", _editHref, "edit"),
        email: _option("Email", emailAction, "Email"),
        production: _option("Production", prodAction, "production"),
        delivery: _option(
            "Delivery",
            null,
            "delivery",
            salesData.delivery?.map((d, i) =>
                _option(
                    d.text,
                    () => updateDeliveryMode(d.text),
                    i == 0 ? "pickup" : "delivery2",
                ),
            ),
        ),
        moveToQuote: _option("Move to Quote", moveToQuote, "estimates"),
        moveToSales: _option("Move to Sales", moveToSales, "orders"),
        copy: _option("Copy as", null, "copy", [
            _option("Sales", copyAsSale, "orders"),
            _option("Quote", copyAsEstimate, "estimates"),
        ]),
        fullPrint,
    };
    const menuList = {
        evalMenu: [_actions.view, _actions.edit],
        options: [
            _actions.view,
            _actions.edit,
            _actions.email,
            ...truthy(
                !isEstimate,
                [_actions.production, _actions.delivery, _actions.moveToQuote],
                [_actions.moveToSales],
            ),
            _actions.copy,
            _actions.fullPrint,
        ] as MenuOption[],
    };
    const ctx = {
        ...menuList,
        MenuList({
            menuKey,
            withDelete,
        }: {
            menuKey: keyof typeof menuList;
            withDelete?: boolean;
        }) {
            return (
                <>
                    {ctx[menuKey]?.map((option, oi) => (
                        <ctx.Render option={option} key={oi} />
                    ))}
                    {withDelete && (
                        <DeleteRowAction
                            menu
                            row={item}
                            action={deleteOrderAction}
                        />
                    )}
                </>
            );
        },
        Render: function Render({ option }: { option: MenuOption }) {
            if (option.groupTitle)
                return (
                    <>
                        <DropdownMenuLabel>
                            {option.groupTitle}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                    </>
                );
            return (
                <MenuItem
                    href={option.href}
                    onClick={option.action}
                    icon={option.icon}
                    key={option.title}
                    SubMenu={option?.subMenu?.map((s, si) => (
                        <Render key={si} option={s} />
                    ))}
                >
                    {option.title}
                </MenuItem>
            );
        },
    };
    return ctx;
}

function _option(title, action, icon: IconKeys, subMenu: MenuOption[] = null) {
    const isHref = typeof action === "string";
    return {
        title,
        action: isHref ? undefined : action,
        icon,
        href: isHref ? action : undefined,
        subMenu,
    };
}
// export type ExtendedOption = Option | { groupHead: string; options: Option[] };
export interface MenuOption {
    title?: string;
    groupTitle?: string;
    action?;
    icon?: IconKeys;
    href?;
    subMenu?: MenuOption[];
}

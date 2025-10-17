export interface IOptions {
    label?;
    Icon?;
    onClick?;
    href?;
    more: IOptions[];
}
export interface IMobileOptions {
    tab;
    options: IOptions[];
}
export default {
    simple(label, onClick?, Icon?) {
        return { label, Icon, onClick };
    },
    href(label, href, Icon?) {
        return { href, Icon, label };
    },
    more(label, more, Icon?) {
        return { label, Icon, more };
    },
    toMobile(options: IOptions[]) {
        let mobileTabs: any = [
            {
                name: "main",
                items: options
            }
        ];
        options?.map(o => {
            if (o.more)
                mobileTabs.push({
                    name: o.label,
                    items: o.more
                });
        });
        return mobileTabs;
    }
} as any;

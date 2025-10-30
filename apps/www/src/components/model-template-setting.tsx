import { Menu } from "@gnd/ui/custom/menu";
import { Settings } from "lucide-react";

interface Props {
    slug: String;
}
export function ModelTemplateSetting(props: Props) {
    return (
        <Menu
            SubMenu={
                <>
                    <Menu.Item>Itme 1</Menu.Item>
                </>
            }
            Icon={Settings}
        ></Menu>
    );
}


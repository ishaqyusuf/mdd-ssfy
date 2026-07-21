import { Icons, type Icon } from "@gnd/ui/icons";


export interface NavItem {
  title: string;
  href?: string;
  disabled?: boolean;
  external?: boolean;
  icon?: Icon;
  label?: string;
  description?: string;
  items?: NavItem[];
}
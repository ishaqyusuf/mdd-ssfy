import {
  Dialog as DialogRoot,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "./dialog";

const Dialog = Object.assign(
  {},
  {
    Root: DialogRoot,
    Content: DialogContent,
    Header: DialogHeader,
    Footer: DialogFooter,
    Title: DialogTitle,
    Description: DialogDescription,
    Trigger: DialogTrigger,
    Close: DialogClose,
  }
);

import {
  Popover as PopoverRoot,
  PopoverContent,
  PopoverTrigger,
} from "./popover";

const Popover = Object.assign(
  {},
  {
    Root: PopoverRoot,
    Content: PopoverContent,
    Trigger: PopoverTrigger,
  }
);

import {
  DropdownMenu as DropdownMenuRoot,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuRadioGroup,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "./dropdown-menu";

const DropdownMenu = Object.assign(
  {},
  {
    Root: DropdownMenuRoot,
    Content: DropdownMenuContent,
    Trigger: DropdownMenuTrigger,
    Item: DropdownMenuItem,
    Label: DropdownMenuLabel,
    Separator: DropdownMenuSeparator,
    CheckboxItem: DropdownMenuCheckboxItem,
    RadioItem: DropdownMenuRadioItem,
    RadioGroup: DropdownMenuRadioGroup,
    Group: DropdownMenuGroup,
    Sub: DropdownMenuSub,
    SubContent: DropdownMenuSubContent,
    SubTrigger: DropdownMenuSubTrigger,
  }
);

import {
  Sheet as SheetRoot,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
  SheetClose,
} from "./sheet";

const Sheet = Object.assign(
  {},
  {
    Root: SheetRoot,
    Content: SheetContent,
    Header: SheetHeader,
    Footer: SheetFooter,
    Title: SheetTitle,
    Description: SheetDescription,
    Trigger: SheetTrigger,
    Close: SheetClose,
  }
);

import { Tabs as TabsRoot, TabsList, TabsTrigger, TabsContent } from "./tabs";

const Tabs = Object.assign(
  {},
  {
    Root: TabsRoot,
    List: TabsList,
    Trigger: TabsTrigger,
    Content: TabsContent,
  }
);
import {
  Select as SelectRoot,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./select";

const Select = Object.assign(
  {},
  {
    Root: SelectRoot,
    Content: SelectContent,
    Trigger: SelectTrigger,
    Value: SelectValue,
    Item: SelectItem,
    Group: SelectGroup,
    Label: SelectLabel,
    Separator: SelectSeparator,
    ScrollUpButton: SelectScrollUpButton,
    ScrollDownButton: SelectScrollDownButton,
  }
);
import {
  Accordion as AccordionRoot,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "./accordion";

const Accordion = Object.assign(
  {},
  {
    Root: AccordionRoot,
    Item: AccordionItem,
    Trigger: AccordionTrigger,
    Content: AccordionContent,
  }
);

import {
  HoverCard as HoverCardRoot,
  HoverCardContent,
  HoverCardTrigger,
} from "./hover-card";

const HoverCard = Object.assign(
  {},
  {
    Root: HoverCardRoot,
    Content: HoverCardContent,
    Trigger: HoverCardTrigger,
  }
);
export {
  HoverCard,
  Accordion,
  Dialog,
  Select,
  Popover,
  DropdownMenu,
  Sheet,
  Tabs,
};

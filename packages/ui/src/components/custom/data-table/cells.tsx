import { memo } from "react";
import { Checkbox } from "../../checkbox";
const SelectCell = memo(
  ({
    checked,
    onChange,
  }: {
    checked: boolean;
    onChange: (value: boolean) => void;
  }) => <Checkbox checked={checked} onCheckedChange={onChange} />
);

SelectCell.displayName = "SelectCell";

export const cells = Object.assign(
  {},
  {
    selectColumn: {
      id: "select",
      meta: {
        className:
          "md:sticky bg-background group-hover:bg-[#F2F1EF] group-hover:dark:bg-secondary z-10 border-r border-border before:absolute before:right-0 before:top-0 before:bottom-0 before:w-px before:bg-border after:absolute after:right-[-24px] after:top-0 after:bottom-0 after:w-6 after:bg-gradient-to-l after:from-transparent after:to-background group-hover:after:to-muted after:z-[-1]",
      },
      cell: ({ row }) => (
        <SelectCell
          checked={row.getIsSelected()}
          onChange={(value) => row.toggleSelected(!!value)}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
  }
);

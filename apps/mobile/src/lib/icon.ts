import { IconSymbolName } from "@/components/ui/IconSymbol";

export const ICONS_MAPPING: { [k in string]: IconSymbolName } = {
  inactive: "xmark.circle.fill",
  published: "checkmark",
  draft: "archivebox",
};

export const getIcon = (name) => {
  return ICONS_MAPPING?.[name?.toLocaleLowerCase()];
};

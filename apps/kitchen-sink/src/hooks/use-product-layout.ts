import { usePathname } from "expo-router";
import { useMemo } from "react";

export function useProductLayoutTabs() {
  const path = usePathname();
  const tabs = useMemo(() => {
    const item = (title, link) => {
      const absLink = `/fikri-products${link}`;
      return { title, link: absLink, active: path === absLink };
    };
    const tabList = [
      item("All Products", ""),
      item("Coupons", "/coupons"),
      item("Shipping Rate", "/shipping-rate"),
      item("Tax Rates", "/tax-rates"),
    ];
    console.log({ tabList, path });
    return tabList;
  }, [path]);

  return tabs;
}

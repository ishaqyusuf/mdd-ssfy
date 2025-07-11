"use client";

import { Env } from "@/components/env";
import { Icons } from "@/components/_v1/icons";
import Portal from "@/components/_v1/portal";

import { Menu } from "../../../../components/(clean-code)/menu";
import { AssignmentCompleteDate } from "./assignment-complete-date";
import Customers from "./customers";
import DoorPriceHarvest from "./door-price-harvest";
import FixCustomerTaxProfile from "./fix-customer-tax-profiles";
import HtpDoors from "./hpt-doors";
import JanSalesStat from "./january-sales-stats";
import SalesStat from "./sales-stat";

export default function BackwardCompat({}) {
    return (
        <Env isDev>
            <Portal nodeId={"navRightSlot"}>
                <Menu Icon={Icons.X}>
                    <SalesStat />
                    <HtpDoors />
                    <DoorPriceHarvest />
                    <Customers />
                    <JanSalesStat />
                    <FixCustomerTaxProfile />
                    <AssignmentCompleteDate />
                </Menu>
            </Portal>
        </Env>
    );
}

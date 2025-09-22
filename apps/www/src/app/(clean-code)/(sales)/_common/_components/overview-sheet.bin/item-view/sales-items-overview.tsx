import { useEffect, useRef, useState } from "react";
import Money from "@/components/_v1/money";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { Menu } from "@/components/(clean-code)/menu";
import Button from "@/components/common/button";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";

import { updateSalesItemControlUseCase } from "../../../use-case/sales-item-control-use-case";
import { GetSalesOverview } from "../../../use-case/sales-item-use-case";
import { useSalesOverview } from "../overview-provider";

export type ItemGroupType = GetSalesOverview["itemGroup"][number];
export type ItemType = ItemGroupType["items"][number];
export type ItemAssignment = ItemType["assignments"][number];
export type ItemAssignmentSubmission = ItemAssignment["submissions"][number];
type PillsType = ItemType["pills"];
type AnalyticsType = ItemType["analytics"];

interface LineItemProps {
    className?: string;
    item: ItemType;
    onClick?;
}

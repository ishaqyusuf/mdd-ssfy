import React from "react";

type SearchParams = {
    [key: string]: string | string[] | undefined;
};

type DatePreset = {
    label: string;
    from: Date;
    to: Date;
    shortcut: string;
};

type Option = {
    label: string;
    value: string | boolean | number | undefined;
};

type Input = {
    type: "input";
    options?: Option[];
};

type Checkbox = {
    type: "checkbox";
    component?: (props: Option) => React.ReactElement | null;
    options?: Option[];
};

type Slider = {
    type: "slider";
    min: number;
    max: number;
    // if options is undefined, we will provide all the steps between min and max
    options?: Option[];
};

type Timerange = {
    type: "timerange";
    options?: Option[]; // required for TS
    presets?: DatePreset[];
};

type Base<TData> = {
    label: string;
    value: keyof TData;
    /**
     * Defines if the accordion in the filter bar is open by default
     */
    defaultOpen?: boolean;
    /**
     * Defines if the command input is disabled for this field
     */
    commandDisabled?: boolean;
};

type DataTableCheckboxFilterField<TData> = Base<TData> & Checkbox;
type DataTableSliderFilterField<TData> = Base<TData> & Slider;
type DataTableInputFilterField<TData> = Base<TData> & Input;
type DataTableTimerangeFilterField<TData> = Base<TData> & Timerange;

export type DataTableFilterField<TData> =
    | DataTableCheckboxFilterField<TData>
    | DataTableSliderFilterField<TData>
    | DataTableInputFilterField<TData>
    | DataTableTimerangeFilterField<TData>;

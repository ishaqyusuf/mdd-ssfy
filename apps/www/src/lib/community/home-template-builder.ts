type fieldType = "input" | "check" | "radio" | "select" | "combobox";
function gridField(
    label,
    key,
    type: fieldType = "input",
    labelSpan: number = 2,
    fieldSpan: number = 10,
    options: any = null
) {
    const field: any = {
        label,
        type,
        key,
        labelSpan,
        fieldSpan,
        options,
    };
    field[type] = true;
    field["span"] = labelSpan + fieldSpan;
    if (key) field[key] = "";
    return field;
}
let _field = (label, key, lSpan = 2, fSpan = 4) => {
    return gridField(label, key, "input", lSpan, fSpan);
};
function option(value, label: any = null) {
    return {
        value,
        label: label ?? value,
    };
}
// const forms = {
const project_header = [
    _field("Project Name", "title", 2, 4),
    _field("Builder", "builder_name", 2, 4),

    // { readonly: true, ...gridField("Project Name", "title", "input") },
    // { readonly: true, ...gridField("Builder", "builder_name") },
    // gridField("Lot", "lot", "input", 2, 4),
    // gridField("Block", "block", "input", 2, 4),
    _field("Model No.", "model_name", 2, 4),
    _field("Lot", "lot", 2, 1),
    _field("Blk", "block", 2, 1),
    // gridField("", "orientations", "combobox", 2, 4, [
    //     "LH",
    //     "RH"
    //     // option("", ""),
    //     // option("lh", "LH"),
    //     // option("rh", "RH"),
    // ]),
    { readonly: true, ...gridField("Address", "address") },
    { readonly: true, ...gridField("Deadbolt", "deadbolt") },
];
const entry = [
    // gridField("Title", "entry_name"),
    //   gridField("No", "entry_no"),
    gridField("Material", "material", "combobox", 2, 10, [
        // option("metal"),
        // option("wood"),
        // option("fiber"),
        "Metal",
        "Wood",
        "Fiber",
    ]),
    gridField("Layer", "layer", "combobox", 2, 4, [
        // option("single"),
        "Single",
        "Double",
        // option("double"),
    ]),
    gridField("Bore", "bore", "combobox", 2, 4, [
        // option("bore_1", "One"),
        // option("bore_2", "Two"),
        "One",
        "Two",
    ]),
    { ...gridField("6/8", "six_eight", "input", 2, 4), caps: true },
    gridField("8/0", "eight_zero", "input", 2, 4),
    gridField("Handle", "orientation", "combobox", 2, 4, [
        // option("", ""),
        // option("lh", "LH"),
        // option("rh", "RH"),
        "LH",
        "RH",
    ]),
    gridField("Type", "others", "input", 2, 4),
    gridField("Side Door", "side_door", "input", 2, 10),
    gridField("Handle", "side_door_height", "combobox", 2, 4, ["6/8", "8/0"]),
    gridField("Qty", "side_door_qty", "input", 2, 4),
];
const garage_door = [
    gridField("Type", "type"),
    {
        value: "Wood",
        ...gridField("Material", "material", "combobox", 2, 10, [
            "Metal",
            "Wood",
            // option("metal", "Metal"),
            // option("wood", "Wood"),
        ]),
    },
    gridField("Garage PH", "ph"),
    gridField("Single", "single"),
    { value: "4 7/8", ...gridField("Frame", "frame") },
    {
        value: "bore_2",
        ...gridField("Bore", "bore", "combobox", 2, 4, [
            "One",
            "Two",
            // option("bore_1", "One"),
            // option("bore_2", "Two"),
        ]),
    },
    gridField("Height", "door_height", "combobox", 2, 4, ["6/8", "8/0"]),
    gridField("Size", "door_size", "combobox", 2, 4, [
        "1/6",
        "2/0",
        "2/4",
        "2/6",
        "2/8",
        "2/10",
        "3/0",
    ]),
    {
        value: "",
        ...gridField("Handle", "orientation", "combobox", 2, 4, [
            // option("", ""),
            // option("lh", "LH"),
            // option("rh", "RH"),
            "LH",
            "RH",
        ]),
    },
    gridField("Size", "door_size_1", "combobox", 2, 4, [
        "1/6",
        "2/0",
        "2/4",
        "2/6",
        "2/8",
        "2/10",
        "3/0",
    ]),
    gridField("Handle", "orientation_1", "combobox", 2, 4, [
        // option("", ""),
        // option("lh", "LH"),
        // option("rh", "RH"),
        "LH",
        "RH",
    ]),
];
function slrgrid(label, title) {}
const interior_door = [
    gridField("Size", "door_size_1", "combobox", 2, 4, []),
    gridField("Handle", "orientation_1", "combobox", 2, 4, [
        // option("", ""),
        // option("lh", "LH"),
        // option("rh", "RH"),
        "LH",
        "RH",
    ]),
    _field("Style", "style", 2, 4),
    _field("Jamb Size", "jamb_size", 2, 4),
    // gridField("Style", "jamb_size"),
    // gridField("Jamb Size", "jamb_size", "combobox", 2, 10, [
    //   "4-5/8",
    //   // "4-7/8",
    //   // "5-1/4",
    // ]),
    gridField("Casing Style", "casing_style", "combobox", 2, 4, [
        "WM473 FLAT 2-1/4",
        "WM366 COLONIAL 2-1/4",
    ]),
    gridField("Door Type", "door_type", "combobox", 2, 4, [
        "Hollow Core",
        "Hardboard",
        "Solid",
    ]),
    ...[1, 2].map((i) => {
        return {
            print: true,
            doors: true,
            fields: [
                {
                    print: true,
                    ...gridField("Height", "height_" + i, "combobox", 2, 4, [
                        "6/8",
                        "8/0",
                    ]),
                },
                _lrgrid("1/6", "one_six", i),
                _lrgrid("2/0", "two", i),
                _lrgrid("2/4", "two_four", i),
                _lrgrid("2/6", "two_six", i),
                _lrgrid("2/8", "two_eight", i),
                _lrgrid("2/10", "two_ten", i),
                _lrgrid("3/0", "three", i),
            ],
        };
    }),
    // {
    //   print: true,
    //   ...gridField("Height", "height_1", "combobox", 2, 4, ["6/8", "8/0"]),
    // },
    // {
    //   print: true,
    //   ...gridField("Height", "height_2", "combobox", 2, 4, ["6/8", "8/0"]),
    // },

    // ...twinLRGrid("1/6", "one_six"),
    // ...twinLRGrid("2/0", "two"),
    // ...twinLRGrid("2/4", "two_four"),
    // ...twinLRGrid("2/6", "two_six"),
    // ...twinLRGrid("2/8", "two_eight"),
    // ...twinLRGrid("2/10", "two_ten"),
    // ...twinLRGrid("3/0", "three"),
];
const double_door = [
    ...LRGrid("6/0", "six"),
    ...LRGrid("5/8", "five_eight"),
    ...LRGrid("5/4", "five_four"),
    ...LRGrid("5/0", "five"),
    ...LRGrid("4/0", "four"),
    _field("Mirrored Bifold", "mirrored"),
    _field("Swing Door", "swing_door"),
    _field("Special Door", "special_door"),
    _field("Bypass", "others"),
    _field("Pocket Door", "pocket_door"),
    _field("Others", "special_door_2"),
    _field("Others", "special_door_3"),
    _field("Others", "special_door_4"),
];
export const bifold_door = [
    gridField("Style", "style"),
    // halfGrid("Metal", "metal"),
    // halfGrid("Wood", "wood"),
    halfGrid("4/0", "four"),
    halfGrid("1/0", "one"),

    halfGrid("4/8", "four_eight"),
    halfGrid("1/6", "one_six"),

    halfGrid("5/0", "five"),
    halfGrid("1/8", "one_eight"),

    halfGrid("6/0", "six"),
    halfGrid("2/0", "two"),

    halfGrid("2/4 LL", "two_four_ll"),
    halfGrid("2/4", "two_four"),

    halfGrid("2/6 LL", "two_six_ll"),
    halfGrid("2/6", "two_six"),

    halfGrid("2/8 LL", "two_eight_ll"),
    halfGrid("2/8", "two_eight"),

    halfGrid("3/0 LL", "three_ll"),
    halfGrid("3/0", "three"),

    halfGrid("Palos", "palos_qty"),
    {
        span: 6,
    },
    // gridField("Model", "model", "select", 2, 4, [
    //   option("2 PNL"),
    //   option("Bored -n- Batten"),
    // ]),
    {
        qty_key: "crown_qty",
        ...gridField("Crown", "crown", "combobox", 2, 10, [
            "7 ¼",
            "6 ¼",
            "5 ¼",
            "4 ¼",
            "3 ½",
        ]),
    },
    // gridField("Quantity", "crown_qty", "input", 2, 4),
    {
        // qty_key: "qty",
        ...gridField("Baseboard", "casing", "combobox", 2, 6, [
            "5 ¼",
            "4 ¼",
            "3 ½",
            "1x6 Flatboard",
            "1x4 Flatboard",
            // option("five_q", "5 ¼"),
            // option("four_q", "4 ¼"),
            // option("three_h", "3 ½"),
        ]),
    },
    gridField("Quantity", "qty", "input", 2, 2),

    gridField("Scuttle Cover", "scuttle", "combobox", 2, 6, ["Metal", "Wood"]),
    gridField("Quantity", "scuttle_qty", "input", 2, 2),
    gridField("Casing Style", "casing_style", "combobox", 2, 6, [
        "WM473 FLAT 2-1/4",
        "WM366 COLONIAL 2-1/4",
    ]),
    gridField("Quantity", "casing_qty", "input", 2, 2),
    gridField("Other", "bifold_other_1", "combobox", 2, 6, []),
    gridField("Quantity", "bifold_other_1_qty", "input", 2, 2),
    gridField("Other", "bifold_other_2", "combobox", 2, 6, []),
    gridField("Quantity", "bifold_other_2_qty", "input", 2, 2),
];
const lock_hardware = [
    gridField("Brand", "brand", "combobox", 2, 10, [
        "Kwikset",
        "Schlage",
        // option("Custom"),
    ]),
    //   halfGrid("Kwikset", "kwik"),
    //   halfGrid("Weizer", "weizer"),
    //   gridField("Schlage", "schlage", "check", 2, 10),
    halfGrid("Handle Set", "handle_set"),
    halfGrid("Door Stop", "door_stop"),
    halfGrid("Dummy", "dummy"),
    halfGrid("Door Viewer", "door_viewer"),
    halfGrid("Deadbolt", "deadbolt"),
    halfGrid("W. Stripper", "w_stripper"),
    halfGrid("Passage", "passage"),
    halfGrid("Hinges", "hinges"),
    halfGrid("Privacy", "privacy", 2, 4),
    halfGrid("Hook & Aye", "hook_aye"),
];
const deco_shutters = [
    gridField("Model", "model", "combobox", 2, 10, [
        "2 PNL",
        "Bored -n- Batten",
    ]),
    gridField("Size 1", "size_1", "combobox", 2, 4, ["14-39", "14-59"]),
    {
        span: 6,
    },
    gridField("Size 2", "size_2", "combobox", 2, 4, ["14-39", "14-59"]),
    {
        span: 6,
    },
];
function _lrgrid(label, key, h) {
    return {
        ...gridField(`${label}`, null, "input", 2, 4),
        // twin: true,
        twins: [
            {
                prefix: "LH:",
                key: [key, h, "lh"].join("_"),
            },
            {
                prefix: "RH:",
                key: [key, h, "rh"].join("_"),
            },
        ],
        print: true,
    };
}
function twinLRGrid(label, key) {
    let _grid: any[] = [];
    [1, 2].map((h) => {
        _grid.push(_lrgrid(label, key, h));
    });
    return _grid;
}
function LRGrid(label, key, lspan = 2, rspan = 4) {
    return [
        gridField(`${label} LH`, `${key}_lh`, "input", lspan, rspan),
        gridField(`${label} RH`, `${key}_rh`, "input", lspan, rspan),
    ];
}
function halfGrid(label, key, labelCol = 2, fieldCol = 4) {
    return gridField(label, key, "input", labelCol, fieldCol);
}
function buildTask(task, type) {
    const content: any = {};
    //   console.log(task);
    task.map((field) => {
        // console.log(field);
        if (field.twins) {
            field.twins.map((t) => {
                content[t.key] = t.value;
            });
        }
        if (field.doors)
            field.fields.map((f) => {
                if (f.twins)
                    f.twins.map((t) => {
                        content[t.key] = t.value;
                    });
                else content[f.key] = f.value;
            });
        if (field.key) content[field.key] = field.value;
        if (field.qty_key) content[field.qty_key] = ""; //field[field.qty_key]
    });
    return {
        type,
        section_title: taskSections[type],
        content,
    };
    //   task.map((field) => {

    // row.map((r) => r.key && (content[r.key] = ""));
    //   });
    return task;
}
export const taskSections = {
    entry: "Exterior Frame",
    // project: "Project Detail",
    garage_door: "Interior Trim",
    lock_hardware: "Lock & Hardware",
    deco_shutters: "Deco-Shutters",
};
const exp = {
    buildTask,
    project: project_header,
    entry,
    garage_door,
    interior_door,
    double_door,
    bifold_door,
    deco_shutters,
    lock_hardware,
    getTaskScaffold(type) {
        return buildTask(this[type], type).content;
    },
    buildProduct() {
        return [
            buildTask(entry, "entry"),
            buildTask(this.garage_door, "garage_door"),
            buildTask(this.interior_door, "interior_door"),
            buildTask(this.double_door, "double_door"),
            buildTask(this.bifold_door, "bifold_door"),
            buildTask(this.lock_hardware, "lock_hardware"),
            buildTask(this.deco_shutters, "deco_shutters"),
        ];
    },
};
export default exp;

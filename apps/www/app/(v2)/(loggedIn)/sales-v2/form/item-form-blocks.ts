import { DykeBlock } from "../type";

export function createBlock(title, options?) {
    return { title, options };
}
export function createBlockItem(title, img?) {
    return { title, img };
}

export function getNextBlock({ openBlock = 0, value = null }) {
    let resp: any = { blockIndex: null, block: null };
    if (openBlock == -1) {
        resp.block = itemFormBlocks[0];
        resp.blockIndex = 0;
    } else {
        if (value == "Shelf Items") {
            resp.block = createBlock("Shelf Items", []);
            resp.blockIndex = openBlock + 1;
        }
    }
    return resp;
}
export const itemFormBlocks: DykeBlock[] = [
    createBlock("Door Type", [
        createBlockItem("Interior"),
        createBlockItem("Exterior"),
        createBlockItem("Shelf Items"),
    ]),
    createBlock("Door Configuration", [
        createBlockItem("Interior Door Unit - Single"),
        createBlockItem("Interior Door Unit - Double"),
        createBlockItem('Interior Door Unit - Single 1-3/4"'),
        createBlockItem("Interior Door Slab (Prepped)"),
        createBlockItem("Interior Attic Access"),
        createBlockItem("Interior Cased Opening"),
        createBlockItem("Interior Frame Only - Single"),
        createBlockItem("Interior Frame Only - Double"),
        createBlockItem('Interior Door Unit - Double 1-3/4"'),
    ]),
    createBlock("Width", [
        createBlockItem("3-0"),
        createBlockItem("2-10"),
        createBlockItem("2-8"),
        createBlockItem("2-5"),
        createBlockItem("2-4"),
        createBlockItem("2-0"),
        createBlockItem("1-8"),
        createBlockItem("1-6"),
        createBlockItem('2-10 "Special Order Only"'),
        createBlockItem('2-3 "Special Order Only"'),
        createBlockItem('1-10 "Special Order Only"'),
        createBlockItem('1-4 "Special Order Only"'),
        createBlockItem('1-2 "Special Order Only"'),
        createBlockItem('1-0 "Special Order Only'),
    ]),
    createBlock("Height", [
        createBlockItem("6-8"),
        createBlockItem("7-0"),
        createBlockItem("8-0"),
    ]),
    createBlock("Hand", [
        createBlockItem("[LH] Left Hand"),
        createBlockItem("[RH] Right Hand"),
        createBlockItem("Fixed Unit"),
    ]),
    createBlock("Bore", [
        createBlockItem("Single Bore"),
        createBlockItem("Double Bore"),
        createBlockItem("No Bore"),
        createBlockItem("Special Bore - sgl - Specify Location"),
        createBlockItem("Special Bore - Dbl - Specify Location"),
        createBlockItem("Center Bore"),
    ]),
    createBlock("Door Type", [
        createBlockItem("HC Molded"),
        createBlockItem("SC Molded"),
        createBlockItem("HC Flash"),
        createBlockItem("SC Flush"),
        createBlockItem("Wood Stile & Rail"),
    ]),
    createBlock("Door", [
        createBlockItem("2-6X6-8 HC 1PNL SHAKER (MADISON) 1-3/8 DOOR SLAB"),
    ]),
    createBlock("Jamb Size", [
        createBlockItem('4-5/8"'),
        createBlockItem('4-7/8"'),
        createBlockItem('5-1/4"'),
        createBlockItem('7-1/4"'),
        createBlockItem('9-1/4"'),
        createBlockItem('11-1/4"'),
    ]),
    createBlock("--Jamb Stop", [
        createBlockItem("PC PRIMED 7-0 WM 887 DR STOP"),
        createBlockItem("PC PRIMED 7-0 WM 916 DR STOP"),
    ]),
    createBlock("Rip Jamp", [
        createBlockItem("Do Not Rip Jamp"),
        createBlockItem("Rip Jam to Custom Size"),
    ]),
    createBlock("Hinge Finish", [
        createBlockItem("US15--Satin Nickel"),
        createBlockItem("US2D--Dull Brass"),
        createBlockItem("US26--Bright Chrome"),
        createBlockItem("US20B--Oil Rubbed Bronze"),
        createBlockItem("US19--Mattle Black"),
        createBlockItem("US3--Bright Brass"),
        createBlockItem("US5A--Antique Brass"),
        createBlockItem("USP--Primed"),
        // createBlockItem(''),
    ]),
    createBlock("Casing Y/N", [
        createBlockItem("Casing Same Both Sides"),
        createBlockItem("No Casing"),
    ]),
    // createBlock('Casing Side Choice',[
    //     createBlockItem('')
    // ]),
    // createBlock('Casing Species',[
    //     createBlockItem('')
    // ]),
    createBlock("Casing", [
        createBlockItem("PC 1x4 PRIMED S4S 8-6"),
        createBlockItem("PC 11/15x2-1/2-8-0 PRIMED S4S"),
        createBlockItem("PC 7 PRIMED 316 z 1/4 CSNG"),
        createBlockItem("PC 7 PRIMED 366 2 1/4 CSNG"),
        createBlockItem("PC 7 PRIMED 376 z 1/4 CSNG"),
        createBlockItem("PC 9-6 PRIMED WM 445 3 1/4 CSNG"),
        createBlockItem("PC 7-0 PRIMED WM473 CSNG S4S"),
    ]),
    createBlock("Casing 1X4 Setup", [
        createBlockItem("Butt Joint"),
        createBlockItem("Mitered"),
        createBlockItem("Butt Joint With Overhang"),
    ]),
    createBlock("Pallet Door", [
        createBlockItem("No Cutdown"),
        createBlockItem("Cutdown Height"),
    ]),
    createBlock("--Palletize Door", [
        createBlockItem("Do Not Palletize"),
        createBlockItem("Palletize Units"),
    ]),
    createBlock("House Package Tool", []),
];
function hpt(width, dim) {
    return {
        width,
        dim,
        key: width + "_" + dim.split("-")[0],
    };
}
export const housePackageToolTable = [
    hpt("1-6", '19-3/4" x 81-3/4"'),
    hpt("1-8", '21-3/4" x 81-3/4"'),
    hpt("2-0", '25-3/4" x 81-3/4"'),
    hpt("2-4", '29-3/4" x 81-3/4"'),
    hpt("2-6", '31-3/4" x 81-3/4"'),
    hpt("2-8", '33-3/4" x 81-3/4"'),
    hpt("2-10", '35-3/4" x 81-3/4"'),
    hpt("2-30", '37-3/4" x 81-3/4"'),
];
export const imgs = {
    doorTypes: {
        interior:
            "https://s3.us-east-2.amazonaws.com/dyke-site-assets/resources/doorparts/069ae0256235001595354987.jpg",
        exterior:
            "https://s3.us-east-2.amazonaws.com/dyke-site-assets/resources/doorparts/770d00022008001680008173.jpg",
        shelfItems:
            "https://s3.us-east-2.amazonaws.com/dyke-site-assets/resources/doorparts/900aa0675330001688671392.jpg",
    },
};

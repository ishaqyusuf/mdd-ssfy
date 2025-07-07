export function getWidthFromStep(door) {
    // function parseDoorInfo(door) {
    // Match width and PR values using regular expression
    const matches = door.match(/([\d-]+)\s*(?:\(PR\s*([\d-]+)[^\)]*\))?.*/);

    // Extract width and PR values from the matches
    const width = matches[2] || matches[1] || ""; // Use PR value if present, otherwise use width value
    const qty = matches[2] ? 2 : 1; // Quantity is 2 if PR is present, otherwise 1

    // Return the width and quantity as an object
    return { width, qty };
    // }
    // Example usage with the provided doors
    // const doors = [
    //     "5-0",
    //     "6-0 (PR 3-0)",
    //     "5-4 (PR 2-8)",
    //     "4-6 (PR 2-3 'Special Order Only')",
    // ];

    // for (const door of doors) {
    //     const { width, qty } = parseDoorInfo(door);
    //     console.log(`Width: ${width}, Quantity: ${qty}`);
    // }
}

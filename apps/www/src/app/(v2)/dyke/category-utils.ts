import { DykeShelfCategories } from "@/db";

const categories: DykeShelfCategories[] = [];
let nextCatId = 1;
export default {
    categories,
    generate,
    create,
    reset() {
        categories.splice(0);
        nextCatId = 1;
    },
};
let callCount = 0;
function generate(cats: string[]) {
    callCount++;
    // if (callCount > 2) return {};
    // console.log(cats);
    let categoryId: null | number = null;
    let parentCategoryId: null | number = null;
    const __cats: DykeShelfCategories[] = [];
    cats.map((title, index) => {
        const nCategoryId = index > 0 ? __cats[index - 1]?.id : null;
        // console.log([title, index, nCategoryId]);
        const newCat = create(
            title,
            nCategoryId,
            parentCategoryId,
            catType(index),
        );
        if (!newCat) return;
        if (index == 0) parentCategoryId = newCat?.id;
        if (index == cats.length - 1) categoryId = newCat?.id;
        __cats.push(newCat);
    });
    // console.log(categories);
    return {
        categoryId,
        parentCategoryId,
        categories: __cats,
    };
}
function catType(index) {
    return index == 0 ? "parent" : "child";
}
function create(name, categoryId, parentCategoryId, type: "parent" | "child") {
    let cat = findCatWithCatId(name, type, categoryId);
    // if (cat) return cat;
    if (!cat) {
        cat = {
            id: categories.length + 1,
            type,
            name,
            categoryId,
            parentCategoryId,
        } as any;
        categories.push(cat as any);
    }
    return cat;
}
function findCat(t, type) {
    if (t) {
        return categories.find((c) => c.name == t && c.type == type)?.id;
    }
    return null;
}
function findCatWithCatId(t, type, categoryId) {
    if (t) {
        const cat = categories.find(
            (c) => c.name == t && c.type == type && c.categoryId == categoryId,
        );
        try {
            return cat;
        } catch (error) {
            //
        }
    }
    return null;
}

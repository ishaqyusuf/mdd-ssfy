"use server";

import { prisma } from "@/db";

export async function getShelfProducts(parentCategoryId, categoryId) {
    const subCategoriesCount = await prisma.dykeShelfCategories.count({
        where: {
            // parentCategoryId,
            categoryId,
        },
    });
    // console.log(subCategoriesCount);
    const products = subCategoriesCount
        ? []
        : await prisma.dykeShelfProducts.findMany({
              where: {
                  categoryId,
                  //   parentCategoryId,
              },
          });
    // console.log(products.length);
    return { subCategoriesCount, products };
}

export async function _saveDykeShelfItemProduct(id, data) {
    const { categoryId, parentCategoryId, ...restData } = data;
    if (!id) {
        restData.category = {
            connect: {
                id: categoryId,
            },
        };
        if (parentCategoryId)
            restData.parentCategory = {
                connect: {
                    id: parentCategoryId,
                },
            };
    }
    const resp = id
        ? await prisma.dykeShelfProducts.update({
              where: {
                  id,
              },
              //   data: restData,
              data,
          })
        : await prisma.dykeShelfProducts.create({
              //   data: restData,
              data,
          });
    return resp;
}

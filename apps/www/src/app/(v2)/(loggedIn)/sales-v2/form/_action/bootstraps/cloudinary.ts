"use server";

import { prisma } from "@/db";
import { _dykeDoorsSvg } from "@/lib/data/dyke-doors-svg";
import { lastId } from "@/lib/nextId";
import { cldUploadFiles } from "@/lib/upload-file";

export async function cloudinaryBootstrap() {
    let res = await Promise.all(
        _dykeDoorsSvg.map(async (a) => {
            let cldImg;
            if (a.url) {
                const resp = await cldUploadFiles(a.url, "dyke");
                console.log(resp);
                cldImg = resp.secure_url.split("dyke/")[1];
            } else return a;
            return {
                ...a,
                cldImg,
            };
        })
    );
    return res;
    // const uploads = await cldUploadFiles(
    //     _dykeDoorsSvg.filter((s) => s.url)?.map((s) => s.url),
    //     "dyke"
    // );
    // return uploads;
}
export async function __dumpGallery() {
    const steps = await prisma.dykeStepProducts.findMany({
        where: {
            OR: [
                {
                    door: {
                        img: { not: null },
                    },
                },
                {
                    product: {
                        img: { not: null },
                    },
                },
            ],
        },
        select: {
            id: true,
            step: {
                select: {
                    title: true,
                },
            },
            door: {
                select: {
                    img: true,
                    title: true,
                    doorType: true,
                },
            },
            product: {
                select: {
                    img: true,
                    title: true,
                },
            },
        },
    });
    let gId = 0;
    let lastGTNId = 0;
    let galleryTagNames = [];
    function getGalleryName(galleryId, ...names) {
        return names.map((name) => {
            if (!name) return null;
            let e = galleryTagNames.find((g) => g.title === name);
            let _id = null;
            if (e) {
                _id = e.id;
                return {
                    galleryTag: {
                        galleryId,
                        tagId: _id,
                    },
                };
            } else {
                _id = ++lastGTNId;
                galleryTagNames.push({
                    id: _id,
                    title: name,
                });
                return {
                    galleryTag: {
                        galleryId,
                        tagId: _id,
                    },
                    tagName: {
                        id: _id,
                        title: name,
                    },
                };
            }
        });
    }
    let gForm = steps.map((s) => ({
        src: s.door?.img || s.product?.img,
        description: s?.door?.title || s?.product?.title,
        id: ++gId,
        _tag: getGalleryName(gId, s?.door?.doorType, s.step.title),
    }));
    return {
        galleryTagNames,
        gForm,
    };
    let lastGalleryId = await lastId(prisma.gallery);

    let galleries = await prisma.gallery.createMany({
        data: [],
        // data: (steps || []).map(s => {

        //     return {
        //         // src: s.door?.img || s.product?.img,
        //         tags

        //     }
        // })
    });
    return galleries;
}

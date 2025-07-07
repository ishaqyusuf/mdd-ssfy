"use server";
import { prisma } from "@/db";
import { convertToNumber } from "@/lib/use-number";
import {
    dotArray,
    generateRandomString,
    removeEmptyValues,
    toDotNotation,
} from "@/lib/utils";
import { HomeTemplateMeta, ICostChart } from "@/types/community";
import { InstallCostMeta, InstallCostSettings } from "@/types/settings";
import { promise } from "zod";
import { getSettingAction } from "../settings";
import { IJobMeta } from "@/types/hrm";
import homeDesign from "@/lib/data/home-design";

export async function _debugUnitsWithNoProjects() {
    const data = await prisma.homes.findMany({
        where: {},
        select: {
            id: true,
            modelName: true,
            projectId: true,
            createdAt: true,
        },
    });
    const projects = await prisma.projects.findMany({
        where: {
            deletedAt: null,
        },
    });
    let bloat = data.filter(
        (d) => !d.projectId || !projects.some((p) => p.id == d.projectId)
    );

    return [bloat.length, data.length];
    return data.length;
}
export async function upgradeCommunity() {
    const templates = await prisma.communityModels.findMany({});
    await Promise.all(
        templates?.map(async (v) => {
            let meta = (v.meta || {}) as any;
            let { overrides, design, data, ...rest } = meta;
            if (Array.isArray(overrides)) overrides = {};
            if (Array.isArray(design)) design = {};
            let _design = {};
            const dov = dotArray(overrides);
            const dd = dotArray(design);
            Object.entries(dov).map(([k, v]) => {
                if (v) {
                    _design[`${k}`] = {
                        c: true,
                        v: dd[k],
                    };
                    // _design[`${k}.c`] = true;
                    // _design[`${k}.v`] = dd[k];
                }
            });
            await prisma.communityModels.update({
                where: { id: v.id },
                data: {
                    meta: removeEmptyValues({
                        ...rest,
                        design: _transformDesign(_design),
                    }) as any,
                },
            });
        })
    );
}
export async function upgradeHomeTemplateDesign() {
    let fields: any = {};
    const templates = await prisma.homeTemplates.findMany({});
    const designs = homeDesign;
    const deb: any = [];
    const sql: string[] = [];
    await Promise.all(
        templates?.map(async (v, i) => {
            const design = designs[v.modelName as any];
            if (v.modelName == "4296 LH")
                deb.push({
                    v,
                    design: design,
                    leng: Object.keys(designs).length,
                });
            // if (i > 2) return;
            if (!design || Array.isArray(design)) return;
            // console.log("ARR");
            // deb.push();
            let meta: HomeTemplateMeta = (v.meta || {}) as any;
            let { ...rest } = meta as any;

            const dotObject = dotArray(design);
            Object.keys(dotObject).map((k) => (fields[k] = true));
            let _design = _transformDesign(dotObject);
            sql.push(
                `UPDATE HomeTemplates SET meta = JSON_SET(meta,'$.design','${JSON.stringify(
                    _design
                )}') WHERE modelName='${v.modelName}';`
            );
            return;
            // meta.design = _design;
            let newMeta = {
                design: _design,
                ...rest,
            };
            await prisma.homeTemplates.update({
                where: { id: v.id },
                data: {
                    meta: removeEmptyValues(newMeta) as any,
                },
            });
        })
    );
    return sql.join("\n");
    return deb;
    // return _transformDesign(fields);
}
export async function upgradeHomeTemplates() {
    let fields: any = {};
    const templates = await prisma.homeTemplates.findMany({});
    const sql: string[] = [];
    await Promise.all(
        templates?.map(async (v) => {
            let meta: HomeTemplateMeta = (v.meta || {}) as any;
            let {
                install_costs,
                install_costings,
                task_costs,
                design = {},
                ...rest
            } = meta as any;
            const dotObject = dotArray(design);
            Object.keys(dotObject).map((k) => (fields[k] = true));
            let _design = _transformDesign(dotObject);
            // meta.design = _design;
            let newMeta = {
                design: _design,
                // taskCosts: task_costs,
                installCosts:
                    install_costings?.map(({ _title, uid, costings }) => ({
                        title: _title,
                        uid,
                        costings: costings?.map(
                            ({ title, unitValue, max_qty, checked }) => ({
                                title,
                                cost: unitValue,
                                maxQty: checked ? max_qty : 0,
                            })
                        ),
                    })) || [],
            };
            await prisma.homeTemplates.update({
                where: { id: v.id },
                data: {
                    meta: removeEmptyValues(newMeta) as any,
                },
            });
        })
    );
    return _transformDesign(fields);
}
export async function upgradeCostCharts() {
    await Promise.all(
        (
            await prisma.costCharts.findMany({
                where: {
                    type: "task_costs",
                },
            })
        ).map(async (cs) => {
            const meta: any = cs.meta;
            const { tax, costs, last_sync } = meta;
            delete costs?.["0"];
            delete tax?.["0"];
            await prisma.costCharts.update({
                where: {
                    id: cs.id,
                },
                data: {
                    type: "task-costs",
                    meta: {
                        costs,
                        lastSync: last_sync,
                        tax,
                    },
                },
            });
        })
    );
}
export async function upgradeInstallCostToKeyValue() {
    const s: InstallCostSettings = await getSettingAction(
        "install-price-chart"
    );

    const list = s.meta.list.map((ls) => {
        if (ls.uid) return ls;
        ls.uid = generateRandomString(4);
        return ls;
    });
    await prisma.settings.update({
        where: {
            id: s.id,
        },
        data: {
            meta: {
                ...s.meta,
                list,
            } as any,
        },
    });
    await Promise.all(
        (
            await prisma.homeTemplates.findMany({})
        ).map(async (template) => {
            const tmeta: HomeTemplateMeta = template.meta as any;
            if (tmeta.installCosts?.length > 0) {
                const costings = tmeta.installCosts.map((ic) => {
                    const nCost = {};
                    const costings = ic.costings as any;
                    if (!Array.isArray(costings)) return null;
                    costings.map((c) => {
                        const uid = list.find((l) => l.title == c.title)?.uid;
                        if (Number(c.maxQty) > 0 && uid) nCost[uid] = c.maxQty;
                    });
                    ic.costings = nCost as any;
                    return ic;
                });
                if (costings)
                    await prisma.homeTemplates.update({
                        where: {
                            id: template.id,
                        },
                        data: {
                            meta: {
                                ...tmeta,
                                costings,
                            },
                        } as any,
                    });
            }
        })
    );
}
export async function upgradeJobCostData() {
    const settings: InstallCostSettings = (await getSettingAction(
        "install-price-chart"
    )) as any;
    const jobNotFound: any[] = [];
    await Promise.all(
        (
            await prisma.jobs.findMany({})
        ).map(async (k) => {
            // const { cost_data, ...meta }: IJobMeta = k.meta as any;
            // if (cost_data) {
            //   meta.costData = {};
            //   cost_data.map((cd) => {
            //     if (cd.title == "Addon") meta.addon = +cd.cost;
            //     else {
            //       let title = cd.title;
            //       if (title == "BALLCATCH DOOR") {
            //         if (cd.cost == 30) title = `${title} 6/8`;
            //         else title = `${title} 8/0`;
            //       }
            //       const uid = settings?.meta?.list?.find((f) => f.title == title);
            //       if (!uid)
            //         jobNotFound.push({
            //           title: cd.title,
            //           value: cd.qty,
            //           cost: cd.cost,
            //         });
            //       else
            //         meta.costData[uid.uid] = {
            //           qty: cd.qty,
            //           cost: cd.cost,
            //         };
            //     }
            //   });
            //   await prisma.jobs.update({
            //     where: {
            //       id: k.id,
            //     },
            //     data: {
            //       meta: meta as any,
            //     },
            //   });
            // }
        })
    );
    return [jobNotFound, settings.meta.list];
}
export async function convertModelInstallCost() {
    const templates = await prisma.homeTemplates.findMany({});
    const costs: ICostChart[] = [];
    await Promise.all(
        templates.map(async (template) => {
            const m: HomeTemplateMeta = template.meta || ({} as any);
            if (m.installCosts) {
                // await prisma.costCharts.create({
                //   data: {
                //     template: {
                //       connect: {
                //         id: template.id,
                //       },
                //     },
                //     type: 'install-cost',
                //     model: template.modelNo as string,
                //   },
                // });
            }
        })
    );
}
export async function linkHomeTemplateCosts() {
    const links: any = {};

    const templates = await prisma.homeTemplates.findMany({
        select: {
            id: true,
            modelName: true,
        },
    });
    const costs = await prisma.costCharts.findMany({
        select: {
            model: true,
            id: true,
            meta: true,
            endDate: true,
        },
        orderBy: {
            endDate: "desc",
        },
    });
    await Promise.all(
        templates.map(async (t) => {
            const _c = costs.filter(
                (c) =>
                    t.modelName?.toLocaleLowerCase() ==
                    c.model?.toLocaleLowerCase()
            );
            // .map((c) => c.id);
            if (_c?.length > 0) {
                await prisma.costCharts.updateMany({
                    where: {
                        id: {
                            in: _c.map((c) => c.id),
                        },
                    },
                    data: {
                        parentId: t.id,
                    },
                });
                let cid = _c[0];
                let id = cid?.id;
                let grob: any = {
                    id: null,
                    meta: null,
                };
                let ls = _c.slice(-1)[0];
                if (ls && !ls.endDate) {
                    grob.id = ls.id;
                    grob.meta = ls?.meta || {};
                } else {
                    grob.id = id;
                    grob.meta = cid?.meta || {};
                }
                function totalkValues(arg) {
                    let total = 0;
                    if (arg && typeof arg === "object")
                        Object.entries(arg).map(([k, v]) => {
                            if (k) total += convertToNumber(v);
                        });
                    return total;
                }
                if (grob.id) {
                    const bc = (grob.meta.subTotal = totalkValues(
                        grob.meta?.costs
                    ));
                    const tc = (grob.meta.totalTax = totalkValues(
                        grob.meta?.tax
                    ));
                    grob.meta.totalCost = bc + tc;
                    if (Array.isArray(grob.meta.costs)) grob.meta.costs = {};
                    if (Array.isArray(grob.meta.tax)) grob.meta.tax = {};
                    const { totalTask, total, ...met } = grob.meta || {};
                    await prisma.costCharts.update({
                        where: {
                            id: id,
                        },
                        data: {
                            current: true,
                            meta: met,
                        },
                    });
                }
            }
        })
    );
}
const camelCaseKey = (key) =>
    key.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());

function _transformDesign(object) {
    // return toDotNotation(object);
    let tr = {};
    Object.entries(object).map(([k, v]) => {
        const [k1, k2] = k.split(".").map(camelCaseKey) as any;
        if (k1 && k2) {
            if (!tr[k1]) tr[k1] = {};
            tr[k1][k2] = v;
        }
    });
    return tr;
}
function transformDesign(obj) {
    const camelCaseKey = (key) =>
        key.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
    //.replace(/\.([a-zA-Z])/g, (_, c) => c.toUpperCase());

    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
        const keys = key.split(".");
        let currentObj = newObj;

        for (const [index, camelKey] of keys.map(camelCaseKey).entries()) {
            if (index === keys.length - 1) {
                currentObj[camelKey] = value;
            } else {
                currentObj[camelKey] = currentObj[camelKey] || {};
                currentObj = currentObj[camelKey];
            }
        }
    }
    return newObj;
}
export async function upgradeInstallPriceChart() {
    const price = await prisma.posts.findFirst({
        where: {
            type: "install-price-chart",
        },
    });
    await prisma.settings.deleteMany({
        where: {
            type: "install-price-chart",
        },
    });

    let meta: InstallCostMeta = {
        list: ((price?.meta as any)?.list).map(({ id, title, unit_value }) => ({
            id,
            title,
            cost: +unit_value,
        })),
    };

    return await prisma.settings.create({
        data: {
            type: "install-price-chart",
            createdAt: new Date(),
            updatedAt: new Date(),
            meta: meta as any,
        },
    });
    // return price;
}


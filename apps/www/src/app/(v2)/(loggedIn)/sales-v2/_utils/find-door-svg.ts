import JsonSearch from "@/_v2/lib/json-search";
import {
    _dykeDoorsSvg2,
    doorSvgsById,
    dykeDoorsSvg,
} from "@/lib/data/dyke-doors-svg";

export function findDoorSvg(title, img) {
    if (img) return {};
    const s = new JsonSearch(_dykeDoorsSvg2, {
        sort: true,
        indices: {
            title: "title",
        },
    });

    // console.log("....");

    let res = s.queryWithScore(title, (item) => item);
    // return null;
    // console.log(res);
    //   return res;
    // console.log(res);

    const item = res[0]?.item;
    if (!item) return {};

    const resp = {
        cld: item.cldImg,
        svg: doorSvgsById[item.id],
        url: item.url,
    };
    // console.log(resp);

    return resp;
}

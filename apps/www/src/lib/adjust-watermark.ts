import { _useId } from "@/hooks/use-id";

export function adjustWatermark(orderIds: string[]) {
    const w = document.getElementById("waterMark");

    let pages = 0;
    orderIds.map((elementId) => {
        let pgHeight, invoiceHeight;
        pgHeight = 850;
        invoiceHeight = 950;
        const selector = (s) => `#s${elementId} ${s}`;
        const header = document.querySelector(selector("#topHeader"));
        const headerHeight = header?.clientHeight || 0;
        invoiceHeight -= headerHeight;
        const footer = document.querySelector(selector("#footer"));
        invoiceHeight -= footer?.clientHeight || 0;

        let totalLineHeight = 0;
        document
            .querySelectorAll(selector("table.main tbody  tr"))
            .forEach((e, i) => {
                if (e.id == "filler") {
                    // e.classList.remove('hidden');
                } else totalLineHeight += e.clientHeight;
                console.log(e.clientHeight);
            });
        const lp = totalLineHeight % invoiceHeight;
        const px = invoiceHeight - lp;
        const fl = document.querySelector(selector("div#filler"));
        let _pgs = Math.ceil(totalLineHeight / invoiceHeight);
        // console.log({
        //   totalLineHeight,
        //   invoiceHeight,
        //   px,
        //   _pgs,
        // });
        if (w)
            for (let i = 0; i < _pgs; i++) {
                const n = w.cloneNode(true) as HTMLElement;
                n.setAttribute("id", _useId("water"));
                n.classList.remove("hidden");
                const topPx = Math.ceil(
                    pgHeight * pages + headerHeight + invoiceHeight / 2
                );
                n.style.top = `${topPx}px`;
                w.after(n);
                pages++;
            }
        // if (fl) {
        //   const h = `${px}px`;
        //   //   fl.style.height = h;
        // }
    });
}

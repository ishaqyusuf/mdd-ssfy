// Local-only, synthetic UI harness. No application APIs or business data writes.
const result = await Bun.build({
	entrypoints: [
		"apps/dashboard/src/lib/table-row-activity/browser-harness.tsx",
	],
	target: "browser",
	define: {
		"process.env.NODE_ENV": JSON.stringify("development"),
		"process.env": JSON.stringify({ NODE_ENV: "development" }),
	},
});
if (!result.success)
	throw new AggregateError(result.logs, "Harness build failed");
const bundle = result.outputs[0]!;
const css = process.env.ROW_ACTIVITY_STYLESHEET ?? "";
const outdir = process.argv[process.argv.indexOf("--outdir") + 1];
if (!process.argv.includes("--outdir") || !outdir)
	throw new Error("Pass --outdir for the temporary fixture artifacts.");
await Bun.write(`${outdir}/harness.js`, bundle);
await Bun.write(
	`${outdir}/index.html`,
	`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Row feedback verification</title>${css ? `<link rel="stylesheet" href="${css}">` : ""}<style>body{font-family:system-ui;margin:24px}button{padding:8px 12px;border:1px solid #888;border-radius:6px;margin:4px}pre{white-space:pre-wrap}.fixture{height:240px;overflow:auto;position:relative}table{width:100%;position:relative}tr[data-row-key]{width:100%}td{min-width:160px}body.dark{background:#151515;color:white}</style></head><body><div id="root"></div><script type="module" src="./harness.js"></script></body></html>`,
);
console.log(`Built synthetic row feedback harness at ${outdir}/index.html`);

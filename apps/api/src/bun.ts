/* -----------------------------------------------------------------------------------------------
 * Community Based Bun Runtime
 * -----------------------------------------------------------------------------------------------*/

process.env.PRISMA_QUERY_ENGINE_LIBRARY ??= "/var/task/libquery_engine.so.node";

const appPromise = import(".").then(({ app }) => app);

export default {
	async fetch(req: Request) {
		const app = await appPromise;
		return app.fetch(req);
	},
};

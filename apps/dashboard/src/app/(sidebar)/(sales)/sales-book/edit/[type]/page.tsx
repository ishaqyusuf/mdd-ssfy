import PageShell from "@/components/page-shell";

export default async function Page(props) {
	await props.params;
	return <PageShell />;
}

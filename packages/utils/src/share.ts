interface Props {
	url: string;
	msg: string;
}
export async function share(props: Props) {
	let file: File | undefined;
	try {
		const blob = await fetch(props.url).then((r) => r.blob());
		file = new File([blob], "invoice.pdf", {
			type: "application/pdf",
		});
	} catch (error) {}
	try {
		if (navigator.share && file) {
			await navigator.share({
				title: "Invoice",
				text: props.msg,
				files: [file],
			});
			return;
		}
	} catch (error) {
		// A user cancelling the native share sheet is not an error. Fall back to
		// the explicit WhatsApp composer for browsers without a usable share API.
		if (error instanceof Error && error.name === "AbortError") return;
	}

	const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(props.msg)}`;
	const link = document.createElement("a");
	link.target = "_blank";
	link.href = whatsappUrl;
	link.click();
}

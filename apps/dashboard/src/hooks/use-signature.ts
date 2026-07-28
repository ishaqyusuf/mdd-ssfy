import type { BlobPath } from "@gnd/utils/constants";

interface Props {
	id: string;
	title: string;
}
export function useSignature({ id }: Props) {
	const saveSignature = async (_path: BlobPath, _title: string) => {
		const canvas = document.getElementById(id) as HTMLCanvasElement;
		return canvas?.toDataURL("image/png") || null;
	};
	return {
		id,
		saveSignature,
	};
}

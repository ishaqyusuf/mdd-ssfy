import { Icons } from "@gnd/ui/icons";
import { InputGroup } from "@gnd/ui/namespace";

interface Props {
	placeholder?: string;
	ariaLabel?: string;
	value: string;
	onChangeText: (text: string) => void;
}
export function SearchInput({
	placeholder,
	ariaLabel,
	value,
	onChangeText,
}: Props) {
	return (
		<InputGroup>
			<InputGroup.Addon>
				<Icons.Search className="size-4 text-muted-foreground" />
			</InputGroup.Addon>
			<InputGroup.Input
				aria-label={ariaLabel}
				value={value || ""}
				onChange={(e) => onChangeText(e.target.value)}
				placeholder={placeholder}
			/>
		</InputGroup>
	);
}

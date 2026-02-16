import { InputGroup } from "@gnd/ui/composite";
import { Search } from "lucide-react";

interface Props {
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
}
export function SearchInput({ placeholder, value, onChangeText }: Props) {
    return (
        <InputGroup>
            <InputGroup.Addon>
                <Search className="size-4 text-muted-foreground" />
            </InputGroup.Addon>
            <InputGroup.Input
                value={value || ""}
                onChange={(e) => onChangeText(e.target.value)}
                placeholder={placeholder}
            />
        </InputGroup>
    );
}


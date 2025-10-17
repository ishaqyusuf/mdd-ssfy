import { FieldError } from "react-hook-form";

export interface ControlValueAccessorProps<T> {
    value: T;
    onChange: (value: T) => void;
    error?: FieldError;
    ref?: any;
}

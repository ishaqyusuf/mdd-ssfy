import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 400): T {
	const [debouncedValue, setDebouncedValue] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedValue(value), delay);
		return () => clearTimeout(timer);
	}, [delay, value]);

	return debouncedValue;
}

import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { formatMoney } from "./use-number";
import JsonSearch from "@/_v2/lib/json-search";
import { slugModel } from "@gnd/utils";
import { FieldPath } from "react-hook-form";
import { dotObject } from "@/app-deps/(clean-code)/_common/utils/utils";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
export function randomNumber(digit = 1) {
	var add = 1,
		max = 12 - add; // 12 is the min safe number Math.random() can generate without it starting to pad the end with zeros.

	if (digit > max) {
		return randomNumber(max) + randomNumber(digit - max);
	}
	max = Math.pow(10, digit + add);
	var min = max / 10; // Math.pow(10, n) basically
	var number = Math.floor(Math.random() * (max - min + 1)) + min;

	return ("" + number).substring(add);
}
export function textValue<T extends object>(
	text: string,
	value?: string,
	extras: T = {} as T,
) {
	return { text, value: value || text, ...extras };
}
export function labelIdOptions<T, L extends FieldPath<T>, I extends keyof T>(
	list: T[],
	label: L,
	id: I,
) {
	if (!list?.length) return [];
	return list?.filter(Boolean).map((l) => {
		// if (typeof l == "string") return { label: l, id: String(l), data: l };
		const getValue = (path) => dotObject.pick(path, l);
		return {
			label: getValue(label),
			id: String(getValue(id)),
			data: l,
		};
	});
}
function removeEmptyValues(obj) {
	if (!obj) return obj;
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			if (obj[key] && typeof obj[key] === "object") {
				// Recurse into nested objects
				removeEmptyValues(obj[key]);
				if (Object.keys(obj[key]).length === 0) {
					delete obj[key]; // Delete the key if the nested object is empty after removal
				}
			} else if (
				obj[key] === null ||
				obj[key] === undefined ||
				obj[key] === ""
			) {
				delete obj[key]; // Delete keys with empty, null, or undefined values
			}
		}
	}
	return obj;
}
export function transformData<T>(data: T, update = false) {
	let date = new Date();
	Object.entries({
		createdAt: date,
		updatedAt: date,
	}).map(([k, v]) => {
		if (!update || (update && k != "createdAt")) {
			if (k == "createdAt" && data[k]) return;
			data[k] = date;
		}
	});
	let _data = data as any;
	let meta = _data?.meta;
	Object.entries(_data).map(([k, v]) => {
		if (v instanceof Date) {
			_data[k] = v.toISOString();
		}
	});
	if (meta) _data.meta = removeEmptyValues(meta);
	return _data as T;
}
export { slugModel };

export function sumArrayKeys<T>(
	array?: T[],
	keys: (keyof T | undefined)[] = undefined,
	subtract = false,
) {
	if (!array?.length) return array;
	let [first, ...others] = array;
	let ret: T = {} as any;
	keys?.map((k) => {
		ret[k] = sum(array, k) as any;
	});
	return ret;
}
export function sum<T>(array?: T[], key: keyof T | undefined = undefined) {
	if (!array) return 0;
	return (
		array
			.map((v) => (!key ? v : v?.[key]))
			.map((v) => (v ? Number(v) : null))
			.filter((v) => (v > 0 || v < 0) && !isNaN(v as any))
			.reduce((sum, val) => (sum || 0) + (val as number), 0) || 0
	);
}
export function toNumber(s) {
	s = Number(s);
	return isNaN(s) ? 0 : s;
}
export const formatCurrency = new Intl.NumberFormat("en-US", {
	style: "currency",
	currency: "USD", // Replace with your desired currency code
});
export function dotArray(obj, parentKey = "", removeEmptyArrays = false) {
	let result = {};
	if (!obj) obj = {};
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			const newKey = parentKey ? `${parentKey}.${key}` : key;

			if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
				const nested = dotArray(obj[key], newKey);
				result = { ...result, ...nested };
			} else {
				if (
					!(
						Array.isArray(obj[key]) &&
						obj[key]?.length == 0 &&
						removeEmptyArrays
					)
				)
					result[newKey] = obj[key];
			}
		}
	}

	return result;
}
export function addSpacesToCamelCase(input): string {
	return input.replace(/([a-z])([A-Z])/g, "$1 $2");
}
export function generateRandomString(length = 15) {
	const charset =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	let randomString = "";

	for (let i = 0; i < length; i++) {
		const randomIndex = Math.floor(Math.random() * charset.length);
		randomString += charset.charAt(randomIndex);
	}

	return randomString;
}
export function addPercentage(value, percentage) {
	return value + (value || 0) * ((percentage || 100) / 100);
}
export function percentageValue(value, percent) {
	if (!percent || !value) return 0;
	return formatMoney(((value || 0) * percent) / 100);
}
export function percent(score, total, def = 0) {
	if (!score || !total) return def;
	return Math.round((Number(score) / Number(total)) * 100);
}
export function getModelNumber(modelName) {
	return modelName
		?.split(" ")
		.filter((f) => !["lh", "rh", "unkn", "unkwn"].includes(f?.toLowerCase()))
		.join(" ");
}
export const uniqueBy = (data, key) => {
	const unique = [...new Set(data.map((item) => item[key]?.toLowerCase()))];

	return unique.map((s) => {
		const d = data.find((h) => h[key]?.toLowerCase() == s);
		return {
			...d,
		};
	});
};
// data.reduce((result, item) => {
//   const lowercaseCategory = item[key].trim().toLowerCase();
//   if (!result.some((x) => x?.[key] === lowercaseCategory)) {
//     result.push({ ...item, [key]: lowercaseCategory });
//   }

//   return result;
// }, []);
export function catchError(err: unknown) {
	return null;
	// if (err instanceof z.ZodError) {
	//     const errors = err.issues.map((issue) => {
	//         return issue.message;
	//     });
	//     return toast.error(errors.join("\n"));
	// } else if (err instanceof Error) {
	//     return toast.error((err as any).message);
	// } else {
	//     return toast.error("Something went wrong, please try again later.");
	// }
}
export function inToFt(_in) {
	let _ft = _in;
	const duo = _ft.split("x");
	if (duo.length == 2) {
		return `${inToFt(duo[0]?.trim())} x ${inToFt(duo[1]?.trim())}`;
	}
	try {
		_ft = +_in.split('"')?.[0]?.split("'")[0]?.split("in")?.[0];

		if (_ft > 0) {
			_ft = +_ft;
			const ft = Math.floor(_ft / 12);
			const rem = _ft % 12;

			return `${ft}-${rem}`;
		}
	} catch (e) {}
	return _in;
}
export function ftToIn(h) {
	const [ft, _in] = h
		?.split(" ")?.[0]
		?.split("-")
		?.map((s) => s?.trim())
		.filter(Boolean);
	return `${+_in + +ft * 12}in`;
}
export function safeFormText(t) {
	return t?.replaceAll(".", "_")?.replaceAll("'", "-")?.replaceAll('"', "-");
}

export function swap(array, indexA, indexB) {
	let tmp = array[indexA];
	array[indexA] = array[indexB];
	array[indexB] = tmp;
}
export function listFilter(items, query, fuzzy) {
	if (fuzzy) {
		// const jsEarch = require("search-array");
		const s = new JsonSearch(items || [], {
			sort: true,
		});
		let res = s.queryWithScore(query || "");
		return res;
	}
	const escapedText = !query
		? ""
		: query?.toString().replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");

	const pattern = new RegExp(escapedText, "i");
	let filteredOptions = items?.filter((option) => pattern.test(option.title));
	return uniqueBy(filteredOptions, "title");
}

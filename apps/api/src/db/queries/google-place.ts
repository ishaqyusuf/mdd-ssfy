import { z } from "zod";

type GooglePlaceDetails = {
	adrFormatAddress?: string;
	formattedAddress?: string;
	location?: { latitude?: number; longitude?: number };
	addressComponents?: Array<{
		types?: string[];
		longText?: string;
		shortText?: string;
	}>;
};

type GoogleAutocompleteSuggestion = {
	placePrediction?: {
		placeId?: string;
		text?: { text?: string };
		structuredFormat?: {
			mainText?: { text?: string };
			secondaryText?: { text?: string };
		};
	};
};

export const placeAutoCompleteSchema = z.object({
	q: z.string(),
	sessionToken: z.string().uuid().optional(),
});
export const placeSchema = z.object({
	placeId: z.string(),
});
export async function autocomplete(
	args: z.infer<typeof placeAutoCompleteSchema>,
) {
	const apiKey = process.env.PLACE_API as string;
}
export async function place(placeId: string, sessionToken?: string) {
	const apiKey = process.env.PLACE_API as string;
	// return {
	//   apiKey,
	//   placeId,
	// };

	if (!apiKey) throw new Error("Missing API Key");
	const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
	if (sessionToken) url.searchParams.set("sessionToken", sessionToken);
	try {
		const response = await fetch(url, {
			// method: "POST",
			headers: {
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask":
					// Include expected fields in the response
					"adrFormatAddress,shortFormattedAddress,formattedAddress,location,addressComponents",
				"Content-Type": "application/json",
			},
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = (await response.json()) as GooglePlaceDetails;
		const dataFinderRegx = (c: string) => {
			const regx = new RegExp(`<span class="${c}">([^<]+)<\/span>`);
			const match = String(data.adrFormatAddress || "").match(regx);
			return match ? match[1] : "";
		};
		const dataFinderAddressComponent = (
			type: "administrative_area_level_1",
			valueKey: "longText" | "shortText" = "longText",
		) => {
			// [].includes
			return data.addressComponents?.find((a) => a.types?.includes(type))?.[
				valueKey
			];
		};
		const address1 = dataFinderRegx("street-address");
		const address2 = "";
		const city = dataFinderRegx("locality");
		const region = dataFinderAddressComponent(
			"administrative_area_level_1",
			"longText",
		); //dataFinderRegx("region");
		const postalCode = dataFinderRegx("postal-code");
		const country = dataFinderRegx("country-name");
		const lat = Number(data.location?.latitude);
		const lng = Number(data.location?.longitude);

		const formattedAddress = data.formattedAddress;

		const formattedData = {
			address1,
			address2,
			formattedAddress,
			city,
			region,
			state: region,
			postalCode,
			country,
			lat,
			lng,
			placeId,
		};

		return {
			data: {
				address: formattedData,
				adrAddress: data.adrFormatAddress,
				raw: data,
			},
			error: null,
		};
	} catch (error) {
		console.error("Error fetching place details:", error);
		return {
			error,
			data: null,
		};
	}
}
export interface AddressType {
	address1: string;
	address2: string;
	formattedAddress: string;
	city: string;
	state?: string;
	region: string;
	postalCode: string;
	country: string;
	lat: number;
	lng: number;
	placeId: string;
}
export async function searchGooglePlace(
	ctx,
	args: z.infer<typeof placeAutoCompleteSchema>,
) {
	const apiKey = process.env.PLACE_API as string;
	if (!apiKey) throw new Error("Missing API Key");
	const query = args.q?.trim();
	if (!query) return [];
	const url = "https://places.googleapis.com/v1/places:autocomplete";
	const primaryTypes = [
		"street_address",
		"subpremise",
		"route",
		"street_number",
		"landmark",
	];
	//   try {
	const response = await fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Goog-Api-Key": apiKey,
		},
		body: JSON.stringify({
			input: query,
			sessionToken: args.sessionToken,
			includedPrimaryTypes: primaryTypes,
			includedRegionCodes: ["US"],
		}),
	});
	if (!response.ok) {
		const responseText = await response.text();
		console.error("Google Places autocomplete request failed", {
			status: response.status,
			body: responseText,
		});
		return [];
	}

	const data = (await response.json()) as {
		suggestions?: GoogleAutocompleteSuggestion[];
	};
	return data.suggestions || [];
	//   } catch (error) {
	// console.error("Error fetching Google Place API:", error);
	// throw new Error("Failed to fetch Google Place API", {}); // Er
	//   }
}

export async function searchStorefrontAddresses(input: {
	query: string;
	sessionToken: string;
}) {
	const suggestions = await searchGooglePlace(null, {
		q: input.query,
		sessionToken: input.sessionToken,
	});
	return (Array.isArray(suggestions) ? suggestions : [])
		.map((suggestion) => suggestion?.placePrediction)
		.filter(
			(
				prediction,
			): prediction is NonNullable<
				GoogleAutocompleteSuggestion["placePrediction"]
			> => Boolean(prediction),
		)
		.map((prediction) => ({
			placeId: String(prediction.placeId || "").trim(),
			text: String(prediction.text?.text || "").trim(),
			mainText: String(
				prediction.structuredFormat?.mainText?.text ||
					prediction.text?.text ||
					"",
			).trim(),
			secondaryText: String(
				prediction.structuredFormat?.secondaryText?.text || "",
			).trim(),
		}))
		.filter((prediction) => prediction.placeId && prediction.text);
}

export async function resolveStorefrontPlace(input: {
	placeId: string;
	sessionToken?: string;
}) {
	const result = await place(input.placeId, input.sessionToken);
	if (!result.data?.address) {
		throw new Error("Google could not resolve this delivery address.");
	}
	const address = result.data.address;
	return {
		placeId: input.placeId,
		formattedAddress: String(address.formattedAddress || "").trim(),
		address1: String(address.address1 || "").trim(),
		address2: String(address.address2 || "").trim(),
		city: String(address.city || "").trim(),
		state: String(address.state || "").trim(),
		postalCode: String(address.postalCode || "").trim(),
		country: String(address.country || "").trim(),
		lat: Number(address.lat),
		lng: Number(address.lng),
	};
}

export async function computeStorefrontDrivingRoute(input: {
	origin: { lat: number; lng: number };
	destination: { lat: number; lng: number };
}) {
	const apiKey = process.env.PLACE_API;
	if (!apiKey) throw new Error("Missing Google Maps API key.");
	const response = await fetch(
		"https://routes.googleapis.com/directions/v2:computeRoutes",
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
			},
			body: JSON.stringify({
				origin: {
					location: {
						latLng: {
							latitude: input.origin.lat,
							longitude: input.origin.lng,
						},
					},
				},
				destination: {
					location: {
						latLng: {
							latitude: input.destination.lat,
							longitude: input.destination.lng,
						},
					},
				},
				travelMode: "DRIVE",
				routingPreference: "TRAFFIC_AWARE",
				computeAlternativeRoutes: false,
				languageCode: "en-US",
				units: "IMPERIAL",
			}),
		},
	);
	if (!response.ok) {
		throw new Error(`Google Routes request failed (${response.status}).`);
	}
	const payload = (await response.json()) as {
		routes?: Array<{ distanceMeters?: number; duration?: string }>;
	};
	const route = payload.routes?.[0];
	const distanceMeters = Number(route?.distanceMeters);
	if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
		throw new Error("Google did not return a drivable route.");
	}
	return {
		oneWayDistanceMiles:
			Math.round((distanceMeters / 1609.344) * 1_000) / 1_000,
		duration: route?.duration || null,
		provider: "GOOGLE_ROUTES" as const,
	};
}

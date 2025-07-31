import { z } from "zod";

export const placeAutoCompleteSchema = z.object({
  q: z.string(),
});
export const placeSchema = z.object({
  placeId: z.string(),
});
export async function autocomplete(
  args: z.infer<typeof placeAutoCompleteSchema>
) {
  const apiKey = process.env.PLACE_API as string;
}
export async function place(placeId) {
  const apiKey = process.env.PLACE_API as string;
  if (!apiKey) throw new Error("Missing API Key");
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const response = await fetch(url, {
    method: "POST",
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

  const data: any = await response.json();
  const dataFinderRegx = (c: string) => {
    const regx = new RegExp(`<span class="${c}">([^<]+)<\/span>`);
    const match = data.adrFormatAddress.match(regx);
    return match ? match[1] : "";
  };

  const address1 = dataFinderRegx("street-address");
  const address2 = "";
  const city = dataFinderRegx("locality");
  const region = dataFinderRegx("region");
  const postalCode = dataFinderRegx("postal-code");
  const country = dataFinderRegx("country-name");
  const lat = data.location.latitude;
  const lng = data.location.longitude;

  const formattedAddress = data.formattedAddress;

  const formattedData: AddressType = {
    address1,
    address2,
    formattedAddress,
    city,
    region,
    postalCode,
    country,
    lat,
    lng,
  };

  return {
    address: formattedData,
    adrAddress: data.adrFormatAddress,
    raw: data,
  };
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
}
export async function searchGooglePlace(
  ctx,
  args: z.infer<typeof placeAutoCompleteSchema>
) {
  const apiKey = process.env.PLACE_API as string;
  if (!apiKey) throw new Error("Missing API Key");
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
      "X-goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      input: args.q,
      includedPrimaryTypes: primaryTypes,
      includedRegionCodes: ["US"],
    }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return (data as any).suggestions;
  //   } catch (error) {
  // console.error("Error fetching Google Place API:", error);
  // throw new Error("Failed to fetch Google Place API", {}); // Er
  //   }
}

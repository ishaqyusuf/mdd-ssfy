import { env } from "@/env.mjs";
import { v2 as _cloudinary } from "cloudinary";

// Configure Cloudinary with your credentials
_cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
});

export const cloudinary = _cloudinary;

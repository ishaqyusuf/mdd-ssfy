import { v2 as _cloudinary } from "cloudinary";

// Configure Cloudinary with your credentials
_cloudinary.config({
    cloud_name: process.envCLOUDINARY_CLOUD_NAME,
    api_key: process.envCLOUDINARY_API_KEY,
    api_secret: process.envCLOUDINARY_API_SECRET,
});

export const cloudinary = _cloudinary;

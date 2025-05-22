"use server";

// import cloudinary from "@cloudinary/react";
import { v2 as cloudinary } from "cloudinary";

const cloudinaryConfig = cloudinary.config({
    cloud_name: process.envCLOUDINARY_CLOUD_NAME,
    api_key: process.envCLOUDINARY_API_KEY,
    api_secret: process.envCLOUDINARY_API_SECRET,
    secure: true,
});

export async function getSignature(folder) {
    //  const timestamp = Math.round(new Date() / 1000);
    const timestamp = Math.round(new Date().getTime() / 1000);

    const signature = cloudinary.utils.api_sign_request(
        { timestamp, folder },
        cloudinaryConfig.api_secret as any,
    );

    return { timestamp, signature };
}
export async function saveToDatabase({ public_id, version, signature }) {
    // verify the data
    const expectedSignature = cloudinary.utils.api_sign_request(
        { public_id, version },
        cloudinaryConfig.api_secret as any,
    );

    if (expectedSignature === signature) {
        // safe to write to database
        console.log({ public_id });
    }
}

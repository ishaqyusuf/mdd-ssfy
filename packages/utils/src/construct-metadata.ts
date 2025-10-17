import { Metadata } from "next";

const prod = process.env.NODE_ENV == "production";
export function constructMetadata({
  title = `${process.env.NEXT_PUBLIC_APP_NAME} - Enterprice Management System`,
  description = `${process.env.NEXT_PUBLIC_APP_NAME}`,
  image = "https://assets.gndprodesk.com/thumbnail.png",
  icons = [
    {
      rel: "apple-touch-icon",
      sizes: "32x32",
      url: `/apple-touch-icon${prod ? ".png" : ".dev.jpg"}`,
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: `/favicon-32x32${prod ? ".png" : ".dev.jpg"}`,
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: `/favicon-16x16${prod ? ".png" : ".dev.jpg"}`,
    },
  ],
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string | null;
  icons?: Metadata["icons"];
  noIndex?: boolean;
} = {}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image && {
        images: [
          {
            url: image,
          },
        ],
      }),
    },
    twitter: {
      title,
      description,
      ...(image && {
        card: "summary_large_image",
        images: [image],
      }),
      creator: "@ishaaq_yusuf",
    },
    icons,
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

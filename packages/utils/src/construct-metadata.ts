// @ts-ignore
const prod = process.env.NODE_ENV == "production";
export function constructMetadata({
  // @ts-ignore
  title = `${process.env.NEXT_PUBLIC_APP_NAME} - Enterprice Management System`,
  // @ts-ignore
  description = `${process.env.NEXT_PUBLIC_APP_NAME}`,
  image = "https://assets.gndprodesk.com/thumbnail.png",
  icons = [
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: `/icons/apple-touch-icon${prod ? ".png" : ".dev.jpg"}`,
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      url: "/icons/favicon.svg",
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "32x32",
      url: `/icons/favicon-32x32${prod ? ".png" : ".dev.jpg"}`,
    },
    {
      rel: "icon",
      type: "image/png",
      sizes: "16x16",
      url: `/icons/favicon-16x16${prod ? ".png" : ".dev.jpg"}`,
    },
  ],
  noIndex = false,
}: {
  title?: string;
  description?: string;
  image?: string | null;
  icons?; //: Metadata["icons"];
  noIndex?: boolean;
} = {}): any {
  // } = {}): Metadata {
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
    // @ts-ignore
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // domains: [
    //   "gndmillwork.com",
    // ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

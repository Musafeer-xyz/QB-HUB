/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  // PDF rendering: keep the browser driver out of the webpack bundle.
  serverExternalPackages: ["playwright-core"],
};

export default nextConfig;

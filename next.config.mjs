/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  // PDF rendering: keep the browser drivers out of the webpack bundle.
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
};

export default nextConfig;

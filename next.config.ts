import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: lets other devices on the tailnet load the dev server's scripts.
  // Without this, pages render but nothing is clickable.
  allowedDevOrigins: ["100.73.23.66", "diegos-m3pro-macbook-pro-18022", "*.ts.net"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Geliştirme göstergesi ("N" düğmesi) mobil alt menünün üstüne biniyordu; kapalı.
  // Derleme ve çalışma hataları yine de gösterilir.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

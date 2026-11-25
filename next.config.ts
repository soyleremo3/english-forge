import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const baseConfig: NextConfig = {
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

/**
 * Bilgisayarın o anki yerel ağ IPv4 adresleri (ör. 192.168.1.23, 172.20.10.4).
 * Telefondan `npm run dev:lan` ile açılan geliştirme sunucusuna erişmek için.
 * Sunucu her başladığında yeniden hesaplanır: modem IP'yi değiştirse de elle güncelleme gerekmez.
 */
function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((ni) => ni !== undefined && ni.family === "IPv4" && !ni.internal)
    .map((ni) => ni!.address)
    .filter((ip) => !ip.startsWith("169.254."));
}

export default function config(phase: string): NextConfig {
  if (phase !== PHASE_DEVELOPMENT_SERVER) return baseConfig;
  // Yalnızca geliştirme sunucusunda: aynı ağdaki telefonun dev kaynaklarına erişmesine izin ver.
  return { ...baseConfig, allowedDevOrigins: lanAddresses() };
}

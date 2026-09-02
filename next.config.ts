import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hay un package-lock.json suelto en el directorio home que hace que
  // Turbopack infiera mal la raíz del workspace; se fija explícitamente.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;

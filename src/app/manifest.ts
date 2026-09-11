import type { MetadataRoute } from "next";

/** PWA básica (T15): instalable en el teléfono del barbero. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BarberDesk",
    short_name: "BarberDesk",
    description: "Tu agenda de barbería en el bolsillo",
    start_url: "/barber",
    display: "standalone",
    background_color: "#17191E",
    theme_color: "#1E3A5F",
    icons: [
      {
        src: "/logo-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

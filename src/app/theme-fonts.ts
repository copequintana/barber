import {
  Alfa_Slab_One,
  Archivo,
  Barlow,
  Barlow_Condensed,
  Courier_Prime,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Instrument_Sans,
  Instrument_Serif,
  League_Gothic,
  Libre_Franklin,
  Manrope,
  Rubik,
  Tilt_Neon,
  Ultra,
} from "next/font/google";

const leagueGothic = League_Gothic({
  variable: "--font-league-gothic",
  subsets: ["latin"],
  preload: false,
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  preload: false,
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  preload: false,
});

const alfaSlab = Alfa_Slab_One({
  variable: "--font-alfa-slab",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

const libreFranklin = Libre_Franklin({
  variable: "--font-libre-franklin",
  subsets: ["latin"],
  preload: false,
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  subsets: ["latin"],
  weight: ["400", "700"],
  preload: false,
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  preload: false,
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  preload: false,
});

const ultra = Ultra({
  variable: "--font-ultra",
  subsets: ["latin"],
  weight: "400",
  preload: false,
});

const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["latin"],
  preload: false,
});

const tiltNeon = Tilt_Neon({
  variable: "--font-tilt-neon",
  subsets: ["latin"],
  preload: false,
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  preload: false,
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["600", "800"],
  style: ["normal", "italic"],
  preload: false,
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  preload: false,
});

export const themeFontVariables = [
  leagueGothic,
  plexSans,
  plexMono,
  archivo,
  alfaSlab,
  libreFranklin,
  courierPrime,
  instrumentSerif,
  instrumentSans,
  ultra,
  rubik,
  tiltNeon,
  manrope,
  barlowCondensed,
  barlow,
]
  .map((font) => font.variable)
  .join(" ");

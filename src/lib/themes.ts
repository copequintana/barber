export type ThemeTraits = {
  hero: "tarjeta" | "letrero" | "bloque" | "centrado" | "marco" | "neon";
  priceList: "tarjetas" | "puntos" | "lineas";
  barbers: "tarjetas" | "lista";
  band: boolean;
};

export type ThemeDefinition = {
  id: string;
  name: string;
  description: string;
  accent: string;
  traits: ThemeTraits;
};

export const THEMES = [
  {
    id: "moderno",
    name: "Moderno",
    description:
      "Superficies claras, tarjetas suaves y una tipografía limpia. Combina con casi cualquier color de marca.",
    accent: "#2747d4",
    traits: { hero: "tarjeta", priceList: "tarjetas", barbers: "tarjetas", band: false },
  },
  {
    id: "clasica",
    name: "Barbería clásica",
    description:
      "Verde botella y latón, títulos de letrero y los precios como la lista colgada en la pared.",
    accent: "#1e4a37",
    traits: { hero: "letrero", priceList: "puntos", barbers: "lista", band: false },
  },
  {
    id: "asfalto",
    name: "Asfalto",
    description:
      "Concreto, negro y amarillo de señalización. Letra extendida, cero curvas y sombras duras: para la barbería de barrio con actitud.",
    accent: "#ffd000",
    traits: { hero: "bloque", priceList: "tarjetas", barbers: "tarjetas", band: true },
  },
  {
    id: "poste",
    name: "Poste",
    description:
      "La barbería americana de los 50: azul marino y rojo sobre papel, letra slab de rótulo, las franjas del poste y precios a máquina.",
    accent: "#c62835",
    traits: { hero: "letrero", priceList: "puntos", barbers: "lista", band: true },
  },
  {
    id: "galeria",
    name: "Galería",
    description:
      "Blanco, negro y aire. Serif itálica grande y líneas finas, como el catálogo de un estudio de autor.",
    accent: "#0f0f0f",
    traits: { hero: "centrado", priceList: "lineas", barbers: "lista", band: false },
  },
  {
    id: "loteria",
    name: "Lotería",
    description:
      "Rosa mexicano, turquesa y amarillo. Letra de madera gruesa y la barbería enmarcada como carta de lotería.",
    accent: "#e4007c",
    traits: { hero: "marco", priceList: "tarjetas", barbers: "tarjetas", band: false },
  },
  {
    id: "neon",
    name: "Neón",
    description:
      "Siempre de noche: el nombre brilla como letrero de neón, botones redondos y luz rosa y cian. Ignora el modo claro del visitante.",
    accent: "#ff3fa4",
    traits: { hero: "neon", priceList: "tarjetas", barbers: "lista", band: false },
  },
  {
    id: "cancha",
    name: "Cancha",
    description:
      "Verde jersey, franjas de uniforme y letra condensada itálica, como el dorsal de una camiseta. Para la barbería del equipo.",
    accent: "#00843d",
    traits: { hero: "bloque", priceList: "lineas", barbers: "tarjetas", band: false },
  },
] as const satisfies readonly ThemeDefinition[];

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "moderno";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

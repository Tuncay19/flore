import type { Flower } from "./data";

export type CartItem = Flower & { quantity: number };

export type View = "home" | "shop" | "favorites" | "about" | "contact" | "checkout";

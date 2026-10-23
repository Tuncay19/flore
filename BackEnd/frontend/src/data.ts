export type Product = {
  id: number;
  name: string;
  kind: "Buket" | "Bitki" | "Hədiyyə";
  price: number;
  color: string;
  emoji: string;
  description: string;
  mood: string;
  note?: string;
};

export const products: Product[] = [
  { id: 1, name: "Sakit ritm", kind: "Buket", price: 49, color: "#d6dbbf", emoji: "✿", description: "Lalə, skabioza və evkalipt", mood: "Sakit, amma unudulmaz", note: "Bu həftə" },
  { id: 2, name: "Bazar işığı", kind: "Buket", price: 38, color: "#f0b86f", emoji: "✺", description: "Gerbera və çöl gülləri", mood: "Günəşli bir bazar" },
  { id: 3, name: "Qırmızı otaq", kind: "Buket", price: 65, color: "#c9474b", emoji: "✹", description: "Bağ gülü və amarant", mood: "Cəsarətli etiraf" },
  { id: 4, name: "Köklən", kind: "Bitki", price: 29, color: "#91af91", emoji: "♧", description: "Saksıda yaşayan yaşıllıq", mood: "Evə nəfəs verin" },
  { id: 5, name: "Boş gün", kind: "Buket", price: 45, color: "#f1cf4c", emoji: "✽", description: "Günəbaxan və otlar", mood: "Plansız sevinc" },
  { id: 6, name: "Yumşaq xatirə", kind: "Hədiyyə", price: 55, color: "#d7c4df", emoji: "❋", description: "Gül, kart və mum", mood: "Yumşaq bir xatirə" },
];

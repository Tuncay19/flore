export type Product = { id: number; name: string; kind: string; price: number; color: string; emoji: string; description: string };

export const products: Product[] = [
  { id: 1, name: "Zərif sevgi", kind: "Buketi", price: 49, color: "#f4d4d8", emoji: "🌷", description: "Pion, lalə və evkalipt" },
  { id: 2, name: "Yaz işığı", kind: "Buketi", price: 38, color: "#f6dfad", emoji: "🌼", description: "Mövsümi çobanyastığı və gerbera" },
  { id: 3, name: "Romantik not", kind: "Buketi", price: 65, color: "#d83d58", emoji: "🌹", description: "Premium qızılgül kompozisiyası" },
  { id: 4, name: "Sakit səhər", kind: "Bitki", price: 29, color: "#b8cfbd", emoji: "🪴", description: "Ev üçün yaşıl saksı bitkisi" },
  { id: 5, name: "Günəşli gün", kind: "Buketi", price: 45, color: "#f1bf61", emoji: "🌻", description: "Günəbaxan və çöl gülləri" },
  { id: 6, name: "Ağ zəriflik", kind: "Buketi", price: 55, color: "#ebe8dd", emoji: "🤍", description: "Ağ gül və lisianthus" },
];

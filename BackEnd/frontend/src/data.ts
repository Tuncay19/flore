export type Product = {
  id: number; name: string; kind: "Buket" | "Bitki" | "Hediyye";
  price: number; color: string; emoji: string; description: string; mood: string; note?: string;
};

export const products: Product[] = [
  { id: 1, name: "Quiet riot", kind: "Buket", price: 49, color: "#d6dbbf", emoji: "✿", description: "Lale, scabiosa, evkalipt", mood: "Sakit, amma unudulmaz", note: "Bu hefte" },
  { id: 2, name: "Sunday noise", kind: "Buket", price: 38, color: "#f0b86f", emoji: "✺", description: "Gerbera ve celk guller", mood: "Gunesli bir bazar" },
  { id: 3, name: "Red room", kind: "Buket", price: 65, color: "#c9474b", emoji: "✹", description: "Bag gulu ve amarant", mood: "Cesaratli etiraf" },
  { id: 4, name: "Grounded", kind: "Bitki", price: 29, color: "#91af91", emoji: "♧", description: "Saksida yasayan yesillik", mood: "Eve nefes verin" },
  { id: 5, name: "Day off", kind: "Buket", price: 45, color: "#f1cf4c", emoji: "✽", description: "Gunebaxan ve otlar", mood: "Plansiz sevinc" },
  { id: 6, name: "Soft landing", kind: "Hediyye", price: 55, color: "#d7c4df", emoji: "❋", description: "Gul, kart ve mum", mood: "Yumsaq xatire" },
];

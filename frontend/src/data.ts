export type Color = "red" | "pink" | "white" | "yellow" | "orange" | "purple" | "blue";

// Filtr üçün rənglər. hex yalnız kiçik rəng nöqtəsi üçündür.
export const COLORS: { id: Color; hex: string }[] = [
  { id: "red", hex: "#c0262d" },
  { id: "pink", hex: "#e88aa8" },
  { id: "white", hex: "#f4f1ec" },
  { id: "yellow", hex: "#f0c93b" },
  { id: "orange", hex: "#ee8a3a" },
  { id: "purple", hex: "#7c4fa0" },
  { id: "blue", hex: "#4a6fb5" },
];

// colors: gülün əsas rəngləri. Şəkillərə baxıb lazım olsa özün düzəlt.
export type Flower = { id: number; name: string; price: number; image: string; colors: Color[] };

const image = (name: string) => `/images/flowers/${name}.jpg`;

export const flowers: Flower[] = [
  { id: 1, name: "Qızılgül", price: 4, image: image("qizilgul"), colors: ["red", "pink"] },
  { id: 2, name: "Lalə", price: 4, image: image("lale"), colors: ["red", "pink", "yellow"] },
  { id: 3, name: "Pion", price: 6, image: image("pion"), colors: ["pink", "white"] },
  { id: 4, name: "Eustoma", price: 8, image: image("eustoma"), colors: ["purple", "white"] },
  { id: 5, name: "Qladiolus", price: 7, image: image("qladiolus"), colors: ["pink", "orange"] },
  { id: 6, name: "Zambaq", price: 8, image: image("zambaq"), colors: ["white", "pink"] },
  { id: 7, name: "Yasəmən", price: 4, image: image("yasemen"), colors: ["white"] },
  { id: 8, name: "Gerbera", price: 5, image: image("gerbera"), colors: ["orange", "pink", "yellow"] },
  { id: 9, name: "Xrizantema", price: 9, image: image("xrizantema"), colors: ["white", "yellow"] },
  { id: 10, name: "İris", price: 5, image: image("iris"), colors: ["purple", "blue"] },
  { id: 11, name: "Hortensiya", price: 5, image: image("hortensiya"), colors: ["blue", "pink", "white"] },
  { id: 12, name: "Papatya", price: 5, image: image("papatya"), colors: ["white", "yellow"] },
  { id: 13, name: "Alstromeriya", price: 6, image: image("alstromeriya"), colors: ["pink", "orange"] },
  { id: 14, name: "Orxideya", price: 10, image: image("orxideya"), colors: ["purple", "white", "pink"] },
  { id: 15, name: "Gipsofila", price: 4, image: image("gipsofila"), colors: ["white"] },
];

export const MIN_PRICE = Math.min(...flowers.map((f) => f.price));
export const MAX_PRICE = Math.max(...flowers.map((f) => f.price));

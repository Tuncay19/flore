export type Flower = { id: number; name: string; price: number; image: string };

const image = (name: string) => `/images/flowers/${name}.jpg`;

export const flowers: Flower[] = [
  { id: 1, name: "Qızılgül", price: 4, image: image("qizilgul") },
  { id: 2, name: "Lalə", price: 4, image: image("lale") },
  { id: 3, name: "Pion", price: 6, image: image("pion") },
  { id: 4, name: "Eustoma", price: 8, image: image("eustoma") },
  { id: 5, name: "Qladiolus", price: 7, image: image("qladiolus") },
  { id: 6, name: "Zambaq", price: 8, image: image("zambaq") },
  { id: 7, name: "Yasəmən", price: 4, image: image("yasemen") },
  { id: 8, name: "Gerbera", price: 5, image: image("gerbera") },
  { id: 9, name: "Xrizantema", price: 9, image: image("xrizantema") },
  { id: 10, name: "İris", price: 5, image: image("iris") },
  { id: 11, name: "Hortensiya", price: 5, image: image("hortensiya") },
  { id: 12, name: "Papatya", price: 5, image: image("papatya") },
  { id: 13, name: "Alstromeriya", price: 6, image: image("alstromeriya") },
  { id: 14, name: "Orxideya", price: 10, image: image("orxideya") },
  { id: 15, name: "Gipsofila", price: 4, image: image("gipsofila") },
];

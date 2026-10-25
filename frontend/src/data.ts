export type Mood = "Romantik" | "Minimal" | "Zərif" | "Parlaq" | "Pastel" | "Klassik" | "Dramatik" | "Yumşaq";

export type Flower = {
  id: number;
  name: string;
  price: number;
  image: string;
  moods: Mood[];
  palette: string;
  story: string;
};

const image = (name: string) => `/images/flowers/${name}.jpg`;

export const moods: Mood[] = ["Romantik", "Minimal", "Zərif", "Parlaq", "Pastel", "Klassik", "Dramatik", "Yumşaq"];

export const flowers: Flower[] = [
  { id: 1, name: "Qızılgül", price: 4, image: image("qizilgul"), moods: ["Romantik", "Klassik", "Dramatik"], palette: "Çəhrayı", story: "Qızılgül bir çox mədəniyyətdə sevgi və qayğının ənənəvi rəmzi sayılır." },
  { id: 2, name: "Lalə", price: 4, image: image("lale"), moods: ["Minimal", "Parlaq", "Pastel"], palette: "Narıncı", story: "Lalə sadə forması və təmiz silueti ilə bahar əhvalı yaradır." },
  { id: 3, name: "Pion", price: 6, image: image("pion"), moods: ["Romantik", "Pastel", "Zərif"], palette: "Pudra çəhrayısı", story: "Pion dolğun ləçəklərinə görə bolluq və xoş niyyətlə əlaqələndirilir." },
  { id: 4, name: "Eustoma", price: 8, image: image("eustoma"), moods: ["Zərif", "Minimal", "Yumşaq"], palette: "Ağ", story: "Eustoma incə forması ilə sakit və zərif jestlər üçün seçilir." },
  { id: 5, name: "Qladiolus", price: 7, image: image("qladiolus"), moods: ["Dramatik", "Parlaq", "Klassik"], palette: "Çəhrayı", story: "Qladiolusun hündür, xəttvari forması kompozisiyaya ritm verir." },
  { id: 6, name: "Zambaq", price: 8, image: image("zambaq"), moods: ["Klassik", "Zərif", "Yumşaq"], palette: "Ağ", story: "Zambaq təmiz xətləri ilə klassik gül kompozisiyalarında tez-tez istifadə olunur." },
  { id: 7, name: "Yasəmən", price: 4, image: image("yasemen"), moods: ["Yumşaq", "Pastel", "Romantik"], palette: "Bənövşəyi", story: "Yasəmən bahar və nostalji hissi ilə bağlı ənənəvi assosiasiyalara malikdir." },
  { id: 8, name: "Gerbera", price: 5, image: image("gerbera"), moods: ["Parlaq", "Minimal", "Yumşaq"], palette: "Çəhrayı", story: "Gerberanın açıq forması enerjili və nikbin görünüş yaradır." },
  { id: 9, name: "Xrizantema", price: 9, image: image("xrizantema"), moods: ["Klassik", "Dramatik", "Parlaq"], palette: "Sarı", story: "Xrizantema müxtəlif mədəniyyətlərdə hörmət və qayğı ilə əlaqələndirilir." },
  { id: 10, name: "Iris", price: 5, image: image("iris"), moods: ["Zərif", "Dramatik", "Minimal"], palette: "Bənövşəyi", story: "Irisin memarlıqvari quruluşu daha ifadəli seçimlərə uyğun gəlir." },
  { id: 11, name: "Hortensiya", price: 5, image: image("hortensiya"), moods: ["Pastel", "Yumşaq", "Romantik"], palette: "Mavi-ağ", story: "Hortensiyanın çoxsaylı kiçik çiçəkləri kompozisiyaya yumşaq həcm verir." },
  { id: 12, name: "Papatya", price: 5, image: image("papatya"), moods: ["Minimal", "Yumşaq", "Parlaq"], palette: "Ağ-sarı", story: "Papatya sadəliyi və təbiiliyi ilə səmimi hədiyyələrə uyğundur." },
  { id: 13, name: "Alstromeriya", price: 6, image: image("alstromeriya"), moods: ["Parlaq", "Zərif", "Klassik"], palette: "Narıncı", story: "Alstromeriya uzunömürlü və rəngarəng görünüşü ilə fərqli seçimdir." },
  { id: 14, name: "Orxideya", price: 10, image: image("orxideya"), moods: ["Dramatik", "Zərif", "Klassik"], palette: "Krem", story: "Orxideya zərif silueti ilə daha seçilən, xüsusi jestlərdə istifadə olunur." },
  { id: 15, name: "Gipsofila", price: 4, image: image("gipsofila"), moods: ["Yumşaq", "Minimal", "Pastel"], palette: "Açıq çəhrayı", story: "Gipsofila yüngül teksturası ilə kompozisiyaya hava və balans qatır." },
];

export type Flower = { id: number; name: string; price: number; image: string };
const rose = "https://images.unsplash.com/photo-1565573349860-cbf26ef3f40f?auto=format&fit=crop&w=900&q=85";
const tulip = "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=85";
const lily = "https://images.unsplash.com/photo-1501973931234-5ac2964cd94a?auto=format&fit=crop&w=900&q=85";
const blossom = "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=85";
const garden = "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=900&q=85";
export const flowers: Flower[] = [
 {id:1,name:"Qızılgül",price:4,image:rose},{id:2,name:"Lalə",price:4,image:tulip},{id:3,name:"Pion",price:6,image:rose},{id:4,name:"Eustoma",price:8,image:blossom},{id:5,name:"Qladiolus",price:7,image:lily},{id:6,name:"Zambaq",price:8,image:lily},{id:7,name:"Yasəmən",price:4,image:blossom},{id:8,name:"Gerbera",price:5,image:garden},{id:9,name:"Xrizantema",price:9,image:garden},{id:10,name:"İris",price:5,image:blossom},{id:11,name:"Hortensiya",price:5,image:blossom},{id:12,name:"Papatya",price:5,image:garden},{id:13,name:"Alstromeriya",price:6,image:lily},{id:14,name:"Orxideya",price:10,image:lily},{id:15,name:"Gipsofila",price:4,image:blossom}
];

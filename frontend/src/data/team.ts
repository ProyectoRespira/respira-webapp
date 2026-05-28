import type { Image } from "./images";

import Gaby from "../assets/team/gaby_gaona.png";
import Fernanda from "../assets/team/fernanda_carles.png";
import Katya from "../assets/team/katya_vazquez.jpg";
import Clara from "../assets/team/clara_berendsen.png";
import Sam from "../assets/team/sam_riveros.jpeg";
import Bertha from "../assets/team/bertha_isasi.png";
import Alvaro from "../assets/team/alvaro_machuca.png";
import Koichi from "../assets/team/koichi_oguro.jpeg";

type TEAM_CARD = {
  name: string;
  title: string;
  image: Omit<Image, "alt">;
  imageClass?: string;
};

export const TEAM: TEAM_CARD[] = [
  {
    name: "Gabriela Gaona",
    title: "Product Owner",
    image: { path: Gaby },
    imageClass: "object-top",
  },
  {
    name: "Fernanda Carles",
    title: "Tech Lead",
    image: { path: Fernanda },
  },
  {
    name: "Katya Vazquez",
    title: "FullStack Developer",
    image: { path: Katya },
    imageClass: "object-top",
  },
  {
    name: "Koichi Oguro",
    title: "DevOps Engineer",
    image: { path: Koichi },
  },
  {
    name: "Sam Riveros",
    title: "Quality Assurance",
    image: { path: Sam },
  },
  {
    name: "Bertha Isasi",
    title: "Project Manager",
    image: { path: Bertha },
  },
  {
    name: "Álvaro Machuca",
    title: "Software Architect, Developer",
    image: { path: Alvaro },
  },
  {
    name: "Clara Berendsen",
    title: "Frontend Developer",
    image: { path: Clara },
  },
];

/**
 * Local images stored in src/assets
 */

export const images = {
  // Hero / Hero-adjacent
  heroMountain: "../assets/hero-mountain.jpg",
  villaAerial: "../assets/villa-aerial.jpg",
  mountainValley: "../assets/mountain-valley.jpg",
  natureScenic: "../assets/nature-scenic.jpg",
  landscapeWide: "../assets/landscape-wide.jpg",

  // Architecture & Interiors
  luxuryInterior: "../assets/tv.avif",
  hotelRoom: "../assets/hotel-room.jpg",

  // Pool & Resort
  poolResort: "../assets/pool-resort.jpg",

  // Food
  foodPlatter: "../assets/food-platter.jpg",
} as const;

export type ImageKey = keyof typeof images;
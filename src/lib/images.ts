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


  // Pool & Resort
  poolResort: "../assets/pool-resort.jpg",

  // Food
  foodPlatter: "../assets/food-platter.jpg",

  //honeymoon
  hotelRoom: "@app/assets/honeymoon.jpeg",


} as const;

export type ImageKey = keyof typeof images;
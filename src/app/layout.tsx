import type { Metadata } from "next";
import { Fjalla_One, Mea_Culpa } from "next/font/google";
import "./globals.css";
import LenisWrapper from "@/components/LenisWrapper";

const fjallaOne = Fjalla_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-fjalla-one",
});

const meaCulpa = Mea_Culpa({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mea-culpa",
});

export const metadata: Metadata = {
  title: "Royal Mansion Resort Villa | Pussallawa Luxury",
  description:
    "Experience luxury, tranquillity, breathtaking mountain views, and unforgettable private villa stays in the heart of Pussallawa, Sri Lanka.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fjallaOne.variable} ${meaCulpa.variable}`}>
      <body className="bg-background text-on-surface font-body-md overflow-x-hidden">
        <LenisWrapper>{children}</LenisWrapper>
      </body>
    </html>
  );
}
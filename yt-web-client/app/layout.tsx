import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./navbar/navbar";
import { Inter } from "next/font/google";


// Font Setup
const inter = Inter({
  subsets: ["latin"],
});


// Metadata for the application.
export const metadata: Metadata = {
  title: "youtube-clone-web-client",
  description: "youtube-clone-web-client built with Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
  <html lang="en">
    <body className={inter.className}>
      <NavBar />
      {children}
    </body>
  </html>
);
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SI-MANTAP 1.4 | BBPJN Sumsel",
  description: "Sistem Informasi Pemantauan Penanganan Jalan PPK 1.4 BBPJN Sumatera Selatan",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

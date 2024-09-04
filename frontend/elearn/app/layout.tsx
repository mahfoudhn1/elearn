import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/homecomponents/header";
import StoreProvider from "./ StoreProvider";
import Footer from './components/homecomponents/Footer';


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "رفعة",
  description: "أفضل مدرسة رقمية لتدريس في الجزائر",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className={inter.className}>
      <StoreProvider>
      <Header/>
         {children}
        <Footer />
        </StoreProvider>

      </body>

    </html>
  );
}

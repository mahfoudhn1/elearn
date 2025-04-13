import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/homecomponents/header";
import StoreProvider from "./ StoreProvider";
import Footer from './components/homecomponents/Footer';
import { WebSocketProvider } from "./contexts/notificationContext";

import GlobalNotifications from "./components/Globalnotifications";
import UserRoleWarper from "./components/userRole";
import Sidebar from "./components/dahsboardcomponents/sidebar";
import Navbar from "./components/dahsboardcomponents/navbar";
import Script from "next/script";
import { GoogleAnalytics } from '@next/third-parties/google'


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "رفعة",
    template:"%s - رفعة"
  },
  description: "أفضل مدرسة رقمية لتدريس في الجزائر",
  icons: {
    // Default favicon (all browsers)
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" }, // Legacy ICO
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" }, // Optional
      { url: "/favicon.svg", type: "image/svg+xml" }, // Scalable SVG
    ],
    // Apple devices (iOS)
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
    ],
  }
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
    <WebSocketProvider>
        <UserRoleWarper>
        <Header/>
        <div className="flex flex-row bg-white">
          <Sidebar/>
          <div className="w-full md:mr-6 overflow-hidden justify-center mx-auto flex-col">
            <Navbar/>
            {children}
          </div>
        </div>
          <GlobalNotifications />
          <Footer />
          </UserRoleWarper>
      </WebSocketProvider>

        </StoreProvider>
        <GoogleAnalytics gaId="G-NL31TK0S0M" />
        <Script src="https://meet.jit.si/external_api.js"/>

      </body>

    </html>
  );
}

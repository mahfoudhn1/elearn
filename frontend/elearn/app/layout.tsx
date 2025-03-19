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
    <WebSocketProvider>
        <UserRoleWarper>
        <Header/>
        <div className="flex flex-row bg-gray-light">
          <Sidebar/>
          <div className="w-full md:mr-6 justify-center mx-auto flex-col">
            <Navbar/>
            {children}
          </div>
        </div>
          <GlobalNotifications />
          <Footer />
          </UserRoleWarper>
      </WebSocketProvider>

        </StoreProvider>
        <script src="https://meet.jit.si/external_api.js"></script>

      </body>

    </html>
  );
}

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
          <Script
      id="fb-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '1198102671577176');
          fbq('track', 'PageView');
        `,
      }}/>
      <StoreProvider>
    <WebSocketProvider>
        <UserRoleWarper>
        <Header/>
        <div className="flex flex-row bg-white">
          <Sidebar/>
          <div className="w-full md:mr-6 overflow-hidden justify-center mx-auto flex-col">
            <Navbar/>
            {children}
            <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1198102671577176&ev=PageView&noscript=1"
          />
        </noscript>
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


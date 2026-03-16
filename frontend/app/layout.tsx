import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from './context/AuthContext';
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AssetHub", // I updated this for you!
  description: "Manage your inventory and assets",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* 1. Added flex, flex-col, and min-h-screen to make the body fill the screen */}
      <body className="bg-[#020617] text-slate-200 flex flex-col min-h-screen font-sans">
        <AuthProvider>
          
          <Navbar />
          
          {/* 2. Added flex-1 to force this container to push the footer down */}
          {/* 3. Changed pt-20 to pt-24 so it perfectly matches your Navbar's h-24 */}
          <main className="flex-1 flex flex-col pt-24">
            {children}
          </main>
          
          {/* Note: I moved the Footer inside the AuthProvider. 
              This is safer in case you ever want to hide the footer when a user is logged in! */}
          <Footer />

        </AuthProvider>
      </body>
    </html>
  );
}
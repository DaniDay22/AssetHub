import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from './context/AuthContext';
import Navbar from "./components/navbar";
import Footer from "./components/footer";
import PageWrapper from "./components/PageWrapper";
import { StoreProvider } from "./context/StoreContext";
import { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AssetHub", 
  description: "Manage your inventory and assets",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#020617] text-slate-200 flex flex-col min-h-screen font-sans">
        <AuthProvider>
          <StoreProvider>
          <Navbar />
          
          <PageWrapper>
            {children}
          </PageWrapper>
          
          <Footer />
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
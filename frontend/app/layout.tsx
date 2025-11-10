import type { Metadata } from "next";
import { Montserrat, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Toaster } from "react-hot-toast";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ortopedia CEMYDI",
  description: "Sistema de gestión de ortopedia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${montserrat.variable} ${inter.variable} antialiased flex flex-col min-h-screen`}
      >
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#FFFFFF",
              color: "#000000",
              borderRadius: "0.75rem",
              padding: "14px 18px",
              fontSize: "14px",
              fontWeight: "500",
              fontFamily: "var(--font-inter)",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              transition: "all 200ms ease-in-out",
            },
            success: {
              iconTheme: {
                primary: "#33CC33",
                secondary: "#FFFFFF",
              },
              style: {
                color: "#33CC33",
                border: "1px solid #33CC33",
              },
            },
            error: {
              iconTheme: {
                primary: "#EE0000",
                secondary: "#FFFFFF",
              },
              style: {
                color: "#EE0000",
                border: "1px solid #EE0000",
              },
            },
          }}
        />
      </body>
    </html>
  );
}

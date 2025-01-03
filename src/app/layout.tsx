// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../../Context/ThemeContext"; // Make sure the path is correct
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Analytics } from "@vercel/analytics/react"
export const metadata: Metadata = {
  title: "AvniPDF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <Header />
          {children} {/* This should render the page content */}
          <Analytics />
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}

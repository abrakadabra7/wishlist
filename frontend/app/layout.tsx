import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { Providers } from "@/components/providers/Providers";
import SetHtmlLang from "@/components/SetHtmlLang";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Real-time social wishlist",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="min-h-screen antialiased">
        <Providers>
          <SetHtmlLang />
          {children}
        </Providers>
      </body>
    </html>
  );
}

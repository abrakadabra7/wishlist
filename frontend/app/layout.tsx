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
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var v=localStorage.getItem('wishlist-theme');if(v==='dark'||(!v&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased bg-surface-50 text-surface-900 dark:bg-surface-900 dark:text-surface-100 transition-colors duration-[400ms] ease-in-out">
        <Providers>
          <SetHtmlLang />
          {children}
        </Providers>
      </body>
    </html>
  );
}

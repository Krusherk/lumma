import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { PrivyProviderWrapper } from "@/components/providers/privy-provider";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumma | Built on Arc",
  description: "Lumma combines Arc stablecoin utility with quests, points, and NFT rewards.",
};

const themeBootstrap = `
(() => {
  try {
    const storageKey = "lumma-theme";
    const saved = window.localStorage.getItem(storageKey);
    const theme = saved === "light" || saved === "dark"
      ? saved
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${manrope.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        <PrivyProviderWrapper>
          <ThemeToggle />
          {children}
        </PrivyProviderWrapper>
      </body>
    </html>
  );
}

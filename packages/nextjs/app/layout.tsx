import "@rainbow-me/rainbowkit/styles.css";
import { Inter, Manrope, Space_Grotesk } from "next/font/google";
import { DappWrapperWithProviders } from "~~/components/DappWrapperWithProviders";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-mono" });

export const metadata = {
  title: "Encora — FHE Knowledge Marketplace",
  description: "Buy and sell knowledge, privately. Powered by Zama fhEVM.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html suppressHydrationWarning lang="en" className={`dark ${inter.variable} ${manrope.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning className="bg-[#0d0d15] text-white antialiased min-h-screen">
        <ThemeProvider enableSystem>
          <DappWrapperWithProviders>{children}</DappWrapperWithProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}

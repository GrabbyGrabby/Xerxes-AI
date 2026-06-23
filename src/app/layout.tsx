import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Xerxes AI — Agentic Multimodal AI Workspace",
  description: "Experience premium multi-model LLM routing, Decentralized Pinata IPFS file tracking, and Sepolia Web3 token billing.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo.png", type: "image/png" }
    ],
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#FDF6F0] text-[#301A15] font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

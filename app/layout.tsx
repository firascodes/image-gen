import "./globals.css";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { Poppins } from "next/font/google";
import Image from "next/image";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata = {
  title: "Image Gen Dashboard",
  description: "Generate images with text or image prompts using OpenAI",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} font-sans`}>
      <body className="min-h-screen bg-slate-50">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}

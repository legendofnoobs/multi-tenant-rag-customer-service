import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Support Platform | Multi-Tenant RAG",
  description: "Next-gen AI customer support with RAG",
};

import { AlertProvider } from "@/components/AlertContext";
import { CustomAlert } from "@/components/CustomAlert";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AlertProvider>
          <CustomAlert />
          {children}
        </AlertProvider>
      </body>
    </html>
  );
}

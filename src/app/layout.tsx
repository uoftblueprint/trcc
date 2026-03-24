import type { Metadata } from "next";
import { Manrope } from "next/font/google";
// import { Geist, Geist_Mono } from "next/font/google";
import { UserProvider } from "@/lib/client/userContext";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "TRCC Dashboard",
  description: "TRCC volunteer management dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${manrope.variable} font-sans`}
        suppressHydrationWarning
      >
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}

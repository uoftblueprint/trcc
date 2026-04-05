import type { Metadata } from "next";
import { Manrope } from "next/font/google";
// import { Geist, Geist_Mono } from "next/font/google";
import { UserProvider } from "@/lib/client/userContext";
import { AppToaster } from "@/components/ui/AppToaster";
import { TopNavBar } from "@/components/ui/TopNavBar";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3000"
  ),
  title: {
    default: "TRCC Dashboard | Toronto Rape Crisis Centre",
    template: "%s | TRCC Dashboard",
  },
  applicationName: "TRCC Dashboard",
  icons: {
    icon: [{ url: "/trcc-logo.png", type: "image/png" }],
    shortcut: "/trcc-logo.png",
    apple: [{ url: "/trcc-logo.png", type: "image/png" }],
  },
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
        <UserProvider>
          <TopNavBar />
          {children}
          <AppToaster />
        </UserProvider>
      </body>
    </html>
  );
}

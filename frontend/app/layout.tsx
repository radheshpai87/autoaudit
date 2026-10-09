import type { Metadata } from "next";
import "./globals.css";
import { SmoothScrollProvider } from "../components/autoaudit/SmoothScroll";

export const metadata: Metadata = {
  title: "AutoAudit | Manufacturing quality, in focus",
  description: "A clear, real-time view of production quality and brake rotor inspection.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}

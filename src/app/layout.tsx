import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arise | Beyond Chat",
  description: "The next-generation communication platform. No paywalls. Blazing fast. Beautifully designed.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

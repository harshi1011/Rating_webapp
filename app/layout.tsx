import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MY NOT-SO-WEIRD 3 AM THOUGHTS",
  description:
    "Anonymous 3 AM thoughts — read, rate how weird they are 1–5, and see the community verdict. No login. Just overthinking.",
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

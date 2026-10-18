import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sanket — Healthcare operations intelligence",
  description: "Rehearse shortage response before it becomes an incident."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Taskroom | Learn full stack",
  description: "A beginner-friendly Next.js and Express task manager",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

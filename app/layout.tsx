import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host")?.replace(/[^a-zA-Z0-9.:-]/g, "") || "recoverflow.local";
  const protocol = requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https";
  const origin = `${protocol}://${host}`;
  const title = "RecoverFlow | AI payment recovery control plane";
  const description = "Turn payment failures into safe, explainable recovery journeys.";
  return {
    metadataBase: new URL(origin),
    title,
    description,
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: { title, description, type: "website", images: [{ url: `${origin}/og.png`, width: 1792, height: 1024, alt: "RecoverFlow payment recovery control plane" }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

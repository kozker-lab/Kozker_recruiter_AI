import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import AuthProvider from "@/providers/auth-provider";

export const metadata: Metadata = {
  title: "Kozker Recruiter AI - Enterprise ATS Hub",
  description: "Enterprise ATS powered by Machine Intelligence. High-density talent sourcing, JD auto-generation, skills matching, and custom screening questions.",
  icons: {
    icon: "/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-neutral-50 text-neutral-800 font-sans selection:bg-primary/20 antialiased flex flex-col">
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}


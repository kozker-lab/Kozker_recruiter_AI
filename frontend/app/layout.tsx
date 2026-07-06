import type { Metadata } from "next";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import AuthProvider from "@/providers/auth-provider";

export const metadata: Metadata = {
  title: "Kozker Recruiter AI - Enterprise ATS Hub",
  description: "Enterprise ATS powered by Machine Intelligence. High-density talent sourcing, JD auto-generation, skills matching, and custom screening questions.",
  icons: {
    icon: "/favicon.svg",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const theme = localStorage.getItem('kozker_pref_theme') || 'sunset';
            document.documentElement.setAttribute('data-theme', theme);
            const mode = localStorage.getItem('kozker_pref_mode') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
            document.documentElement.setAttribute('data-mode', mode);
          } catch (e) {}
        ` }} />
      </head>
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


import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Kozker Admin Console & Gateway',
  description: 'Multi-Tenant Master Admin Console, Governance Engine & Gateway Hub',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-800 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}

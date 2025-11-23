import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lekya Logistics Control',
  description: 'Live logistics operations control center'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}

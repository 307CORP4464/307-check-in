import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '307 Check-In System',
  description: 'Warehouse driver check-in system',
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

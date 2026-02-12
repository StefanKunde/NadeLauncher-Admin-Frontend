import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'NadePro Admin',
  description: 'Admin panel for NadePro CS2 Practice Tool',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#12121a',
              color: '#e8e8e8',
              border: '1px solid #2a2a3e',
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#12121a',
              },
            },
            error: {
              iconTheme: {
                primary: '#ff4444',
                secondary: '#12121a',
              },
            },
          }}
        />
      </body>
    </html>
  );
}

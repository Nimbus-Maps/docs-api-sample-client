import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nimbus Document Purchase API - Sample Client',
  description:
    'Sample web application demonstrating integration with the Nimbus Document Purchase API',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster richColors position="top-right" />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}

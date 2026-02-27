import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { BackgroundVideo } from '@/components/BackgroundVideo';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Poly-Wrath Markets',
  description: 'Autonomous AI agent trading Polymarket crypto short-term markets. Iron fists. Algorithmic precision.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans bg-gray-950 text-gray-100 antialiased`}>
        <Providers>
          <BackgroundVideo />
          {children}
        </Providers>
      </body>
    </html>
  );
}

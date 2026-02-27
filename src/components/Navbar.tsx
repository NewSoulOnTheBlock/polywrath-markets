'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/markets', label: 'Markets' },
  { href: '/history', label: 'History' },
  { href: '/settings', label: 'Settings' },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--card-border)] bg-[var(--card)]/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-tight">
              <img src="/polywrath-hero.png" alt="" className="w-8 h-8" />
              <span><span className="text-red-500">Poly</span>-Wrath Markets</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'text-[var(--muted)] hover:text-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <ConnectButton showBalance={true} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </nav>
  );
}

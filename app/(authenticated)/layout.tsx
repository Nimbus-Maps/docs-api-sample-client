'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { SessionInfo } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

async function fetchSession(): Promise<SessionInfo> {
  const res = await fetch('/api/auth/session');
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

async function logout() {
  const res = await fetch('/api/auth/logout', { method: 'POST' });
  if (!res.ok) throw new Error('Failed to logout');
}

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: session, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
    refetchInterval: 60000, // Refetch every minute
  });

  // Redirect to login if not authenticated
  if (!isLoading && !session?.isAuthenticated) {
    router.push('/login');
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to logout');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <h1 className="text-xl font-bold text-primary">Nimbus Docs API</h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {[
                  { href: '/dashboard', label: 'Dashboard' },
                  { href: '/orders', label: 'Orders' },
                  { href: '/webhooks', label: 'Webhooks' },
                  { href: '/verify', label: 'Verify Ownership' },
                ].map(({ href, label }) => {
                  const active = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        active
                          ? 'border-primary text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <Button onClick={handleLogout} variant="ghost" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
            <div className="flex items-center sm:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {[
                { href: '/dashboard', label: 'Dashboard' },
                { href: '/orders', label: 'Orders' },
                { href: '/webhooks', label: 'Webhooks' },
                { href: '/verify', label: 'Verify Ownership' },
              ].map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      active
                        ? 'border-primary text-primary bg-indigo-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="block w-full text-left pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}

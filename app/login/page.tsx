'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, ArrowRight } from 'lucide-react';
import type { SessionInfo } from '@/lib/types';

async function fetchSession(): Promise<SessionInfo> {
  const res = await fetch('/api/auth/session');
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: fetchSession,
  });
  const isClientCredentials = session?.authMode === 'client_credentials';

  const handleLogin = () => {
    window.location.href = isClientCredentials ? '/dashboard' : '/api/auth/login';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Nimbus Document Purchase API
          </CardTitle>
          <CardDescription className="text-center">Sample Client Application</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 flex gap-2">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              {isClientCredentials
                ? 'This app is configured to call the Nimbus Document Purchase API with Entra client credentials.'
                : 'Sign in with your Azure AD account to access the Nimbus Document Purchase API demo.'}
            </p>
          </div>

          <Button onClick={handleLogin} className="w-full" size="lg">
            {isClientCredentials ? (
              <ArrowRight className="w-5 h-5 mr-2" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 23 23" fill="currentColor">
                <path d="M0 0h10.933v10.933H0zm12.067 0H23v10.933H12.067zM0 12.067h10.933V23H0zm12.067 0H23V23H12.067z" />
              </svg>
            )}
            {isClientCredentials ? 'Continue to dashboard' : 'Sign in with Microsoft'}
          </Button>

          <div className="text-xs text-muted-foreground text-center space-y-1 pt-4 border-t">
            <p>
              {isClientCredentials
                ? 'This application demonstrates OAuth 2.0 client credentials'
                : 'This application demonstrates OAuth 2.0 authentication with PKCE'}
            </p>
            <p>and integration with the Nimbus Document Purchase API.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

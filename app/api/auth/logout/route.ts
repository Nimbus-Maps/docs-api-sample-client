import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { logError } from '@/lib/logger';

/**
 * POST /api/auth/logout
 * Clears the session and logs out the user
 */
export async function POST(_request: NextRequest) {
  try {
    const session = await getSession();

    // Clear all session data
    await session.destroy();

    return NextResponse.json({ success: true });
  } catch (error) {
    logError(error, 'Logout error');
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 });
  }
}

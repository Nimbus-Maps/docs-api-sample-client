import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { verifyOwnership } from '@/lib/api-client';
import { VerifyOwnershipRequest } from '@/lib/types';
import { logError } from '@/lib/logger';

/**
 * POST /api/verify-ownership
 * Verify if a person owns a property
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();

    const body: VerifyOwnershipRequest = await request.json();

    // Validate request body
    if (!body.title_number || !body.first_forename || !body.surname) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'title_number, first_forename, and surname are required',
          },
        },
        { status: 400 }
      );
    }

    const data = await verifyOwnership(session.accessToken!, body);

    return NextResponse.json(data);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Verify ownership error');

    if (e.message === 'Unauthorized' || e.message === 'Token expired') {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Please log in again' } },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: { code: e.code || 'INTERNAL_ERROR', message: e.message } },
      { status: e.status || 500 }
    );
  }
}

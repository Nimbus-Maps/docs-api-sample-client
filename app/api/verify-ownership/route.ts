import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { requireDocumentApiAuth } from '@/lib/document-api-auth';
import { verifyOwnership } from '@/lib/api-client';
import { logError } from '@/lib/logger';
import { parseVerifyOwnershipRequest } from '@/lib/verify-ownership-validation';

/**
 * POST /api/verify-ownership
 * Verify if a person owns a property
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireDocumentApiAuth();

    const body = parseVerifyOwnershipRequest(await request.json());

    const data = await verifyOwnership(auth.accessToken, body);

    return NextResponse.json(data);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Verify ownership error');

    if (error instanceof ZodError) {
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

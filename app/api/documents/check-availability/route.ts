import { NextRequest, NextResponse } from 'next/server';
import { requireDocumentApiAuth } from '@/lib/document-api-auth';
import { checkAvailability } from '@/lib/api-client';
import { logError } from '@/lib/logger';

/**
 * GET /api/documents/check-availability
 * Check document availability for a title
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireDocumentApiAuth();

    const searchParams = request.nextUrl.searchParams;
    const title_number = searchParams.get('title_number');
    const title_id = searchParams.get('title_id');

    if (!title_number && !title_id) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either title_number or title_id is required',
          },
        },
        { status: 400 }
      );
    }

    const data = await checkAvailability(auth.accessToken, {
      title_number: title_number || undefined,
      title_id: title_id || undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Check availability error');

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

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { downloadDocument } from '@/lib/api-client';
import { logError } from '@/lib/logger';

/**
 * GET /api/download/[documentId]
 * Download a document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await requireAuth();
    const { documentId } = await params;

    const data = await downloadDocument(session.accessToken!, documentId);

    // Convert base64 content to buffer
    const buffer = Buffer.from(data.content, 'base64');

    // Return PDF as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${data.metadata.filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Download error');

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

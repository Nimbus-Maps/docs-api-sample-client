import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { getOrderStatus } from '@/lib/api-client';
import { logError } from '@/lib/logger';

/**
 * GET /api/orders/[orderId]
 * Get order status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await requireAuth();
    const { orderId } = await params;

    const data = await getOrderStatus(session.accessToken!, orderId);

    return NextResponse.json(data);
  } catch (error) {
    const e = error as { message?: string; code?: string; status?: number };
    logError(error, 'Get order error');

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

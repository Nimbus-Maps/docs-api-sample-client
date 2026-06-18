'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { OrderStatusResponse, OrderDocument } from '@/lib/types';
import { formatDate, formatTokens } from '@/lib/utils';
import { getOrderHistory, removeOrderFromHistory } from '@/lib/order-history';
import type { OrderHistoryEntry } from '@/lib/order-history';
import { Download, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';

export default function OrdersPage() {
  const [orderId, setOrderId] = useState('');
  const [searchOrderId, setSearchOrderId] = useState('');
  const [history, setHistory] = useState<OrderHistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getOrderHistory());
  }, []);

  const {
    data: order,
    isLoading,
    refetch,
  } = useQuery<OrderStatusResponse>({
    queryKey: ['order', searchOrderId],
    queryFn: async () => {
      const res = await fetch(`/api/orders/${searchOrderId}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to fetch order');
      }
      return res.json();
    },
    enabled: !!searchOrderId,
    refetchInterval: (query) => {
      // Auto-refresh if order is still processing
      return query.state.data?.status === 'PROCESSING' ? 5000 : false;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) {
      toast.error('Please enter an order ID');
      return;
    }
    setSearchOrderId(orderId);
  };

  const loadOrder = (id: string) => {
    setOrderId(id);
    setSearchOrderId(id);
  };

  const handleRemove = (id: string) => {
    removeOrderFromHistory(id);
    setHistory(getOrderHistory());
  };

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/download/${documentId}`);
      if (!res.ok) {
        throw new Error('Failed to download document');
      }

      // Create download link
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${documentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Document downloaded successfully');
    } catch {
      toast.error('Failed to download document');
    }
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'destructive' | 'secondary' => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PROCESSING':
        return 'warning';
      case 'FAILED':
      case 'WEBHOOK_FAILED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Order Tracking</h1>
        <p className="text-muted-foreground mt-1">Track your document purchase orders</p>
      </div>

      {/* Recent Orders */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Click an order to load it</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((entry) => (
                <div
                  key={entry.orderId}
                  className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 cursor-pointer group"
                  onClick={() => loadOrder(entry.orderId)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm truncate">{entry.orderId}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.titleNumber}
                      {entry.customerReference && ` · ${entry.customerReference}`}
                      {' · '}
                      {formatDate(entry.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0 ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(entry.orderId);
                    }}
                    title="Remove from history"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle>Search Order</CardTitle>
          <CardDescription>Enter an order ID to view its status</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="order-id">Order ID</Label>
              <Input
                id="order-id"
                placeholder="e.g., 770e8400-e29b-41d4-a716-446655440002"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={isLoading}>
                <Search className="h-4 w-4 mr-2" />
                {isLoading ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Order Details */}
      {order && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Order Details</CardTitle>
                <CardDescription className="mt-2">Order ID: {order.order_id}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                {order.status === 'PROCESSING' && (
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Title Number</p>
                <p className="font-semibold">{order.documents[0]?.title_number ?? 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer Reference</p>
                <p className="font-semibold">{order.customer_reference || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tokens Charged</p>
                <p className="font-semibold">{formatTokens(order.total_tokens_charged)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-semibold">{formatDate(order.created_at)}</p>
              </div>
              {order.completed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="font-semibold">{formatDate(order.completed_at)}</p>
                </div>
              )}
            </div>

            {/* Documents */}
            {order.documents.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Documents</h4>
                <div className="space-y-2">
                  {order.documents.map((doc: OrderDocument) => (
                    <div
                      key={doc.document_id}
                      className="flex items-center justify-between p-3 border rounded"
                    >
                      <div>
                        <p className="font-medium">{doc.document_type}</p>
                        <p className="text-sm text-muted-foreground">Status: {doc.status}</p>
                        {doc.webhook_delivery_status && (
                          <Badge
                            className="mt-1"
                            variant={
                              doc.webhook_delivery_status === 'SUCCESS'
                                ? 'success'
                                : doc.webhook_delivery_status === 'PENDING'
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            Webhook: {doc.webhook_delivery_status}
                          </Badge>
                        )}
                      </div>
                      {(doc.status === 'COMPLETED' || doc.status === 'DELIVERED') && (
                        <Button size="sm" onClick={() => handleDownload(doc.document_id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {order.error_message && (
              <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
                <p className="text-sm font-semibold text-destructive">Error</p>
                <p className="text-sm text-destructive/90 mt-1">{order.error_message}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type {
  AvailabilityCheckResponse,
  DocumentInfo,
  PurchaseRequest,
  PurchaseResponse,
} from '@/lib/types';
import { formatTokens, formatDate } from '@/lib/utils';
import { addOrderToHistory } from '@/lib/order-history';
import { Search, ShoppingCart, Check, AlertCircle, Info, Download } from 'lucide-react';

function DocumentRow({
  doc,
  selected,
  onToggle,
  onDownload,
  contextNote,
}: {
  doc: DocumentInfo;
  selected: boolean;
  onToggle: () => void;
  onDownload: (documentId: string) => void;
  contextNote?: string;
}) {
  const selectable = doc.availability_code === 'IMMEDIATE' || doc.availability_code === 'BACKDATED';

  return (
    <div
      className={`flex items-start justify-between p-4 border rounded-lg ${
        selectable ? 'cursor-pointer hover:bg-gray-50' : 'opacity-75'
      }`}
      onClick={selectable ? onToggle : undefined}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <div className="mt-1">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                selected ? 'bg-primary border-primary' : 'border-gray-300'
              }`}
            >
              {selected && <Check className="h-3 w-3 text-white" />}
            </div>
          </div>
        )}
        <div>
          <h4 className="font-semibold">{doc.type}</h4>
          <p className="text-sm text-muted-foreground">{doc.availability}</p>
          {contextNote && <p className="text-xs text-muted-foreground mt-1">{contextNote}</p>}
          {(doc.previously_purchased || doc.document_id) && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {doc.previously_purchased && (
                <Badge variant="outline">
                  Previously purchased: {formatDate(doc.previously_purchased)}
                </Badge>
              )}
              {doc.document_id && (
                <button
                  className="inline-flex items-center gap-1 rounded-full border border-primary px-2.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(doc.document_id!);
                  }}
                >
                  <Download className="h-3 w-3" />
                  Re-download
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="text-right">
        {selectable ? (
          <p className="font-semibold">{formatTokens(doc.token_cost)}</p>
        ) : (
          <Badge variant="secondary">
            {doc.availability_code === 'MANUAL' ? 'Manual request required' : 'Not available'}
          </Badge>
        )}
        {doc.backdated && (
          <Badge variant="warning" className="mt-1">
            Backdated
          </Badge>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [titleNumber, setTitleNumber] = useState('');
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [customerRef, setCustomerRef] = useState('');
  const [lastPurchasedOrder, setLastPurchasedOrder] = useState<string | null>(null);

  const handleDownload = async (documentId: string) => {
    try {
      const res = await fetch(`/api/download/${documentId}`);
      if (!res.ok) {
        throw new Error('Failed to download document');
      }
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

  // Quick purchase form state
  const [quickTitleNumber, setQuickTitleNumber] = useState('');
  const [quickSelectedDocs, setQuickSelectedDocs] = useState<string[]>([]);
  const [quickCustomerRef, setQuickCustomerRef] = useState('');

  // Check availability query
  const {
    data: availability,
    isLoading: isCheckingAvailability,
    refetch: checkAvailability,
  } = useQuery<AvailabilityCheckResponse>({
    queryKey: ['availability', titleNumber],
    queryFn: async () => {
      const res = await fetch(`/api/documents/check-availability?title_number=${titleNumber}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to check availability');
      }
      return res.json();
    },
    enabled: false, // Only run on manual trigger
  });

  // Purchase mutation
  const purchaseMutation = useMutation<PurchaseResponse, Error, PurchaseRequest>({
    mutationFn: async (request) => {
      const res = await fetch('/api/documents/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to purchase documents');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Purchase successful! Order ID: ${data.order_id}`);
      setLastPurchasedOrder(data.order_id);
      addOrderToHistory({
        orderId: data.order_id,
        titleNumber: data.title_number,
        customerReference: customerRef || undefined,
        createdAt: new Date().toISOString(),
      });
      setSelectedDocs([]);
      setCustomerRef('');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Quick purchase mutation — goes straight to purchase without an availability check
  const quickPurchaseMutation = useMutation<PurchaseResponse, Error, PurchaseRequest>({
    mutationFn: async (request) => {
      const res = await fetch('/api/documents/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const error = await res.json();
        throw Object.assign(new Error(error.error?.message || 'Failed to purchase documents'), {
          status: res.status,
          details: error.error?.details,
        });
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Purchase successful! Order ID: ${data.order_id}`);
      setLastPurchasedOrder(data.order_id);
      addOrderToHistory({
        orderId: data.order_id,
        titleNumber: data.title_number,
        customerReference: quickCustomerRef || undefined,
        createdAt: new Date().toISOString(),
      });
      setQuickSelectedDocs([]);
      setQuickCustomerRef('');
      setQuickTitleNumber('');
    },
    onError: (
      error: Error & {
        status?: number;
        details?: { documents_in_progress?: Array<{ document_id: string; order_id: string }> };
      }
    ) => {
      if (error.status === 409 && error.details?.documents_in_progress?.length) {
        const inProgress = error.details.documents_in_progress
          .map((d) => `${d.document_id} (order ${d.order_id.slice(0, 8)}…)`)
          .join(', ');
        toast.error(`Already in progress: ${inProgress}`);
      } else {
        toast.error(error.message);
      }
    },
  });

  const handleCheckAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleNumber.trim()) {
      toast.error('Please enter a title number');
      return;
    }
    checkAvailability();
  };

  const handlePurchase = () => {
    if (selectedDocs.length === 0) {
      toast.error('Please select at least one document');
      return;
    }

    const docs = getSelectableDocuments();
    purchaseMutation.mutate({
      title_number: titleNumber,
      // 'register'/'title_plan' are sent as-is (see README purchase example); referred
      // documents have no such fixed slot name, so translate their positional key to type_code.
      documents: selectedDocs.map((key) =>
        key === 'register' || key === 'title_plan' ? key : (docs[key]?.type_code ?? key)
      ),
      customer_reference: customerRef || undefined,
    });
  };

  const toggleDocSelection = (docType: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docType) ? prev.filter((d) => d !== docType) : [...prev, docType]
    );
  };

  const toggleQuickDocSelection = (docType: string) => {
    setQuickSelectedDocs((prev) =>
      prev.includes(docType) ? prev.filter((d) => d !== docType) : [...prev, docType]
    );
  };

  const handleQuickPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitleNumber.trim()) {
      toast.error('Please enter a title number');
      return;
    }
    if (quickSelectedDocs.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    quickPurchaseMutation.mutate({
      title_number: quickTitleNumber,
      documents: quickSelectedDocs,
      customer_reference: quickCustomerRef || undefined,
    });
  };

  // Referred documents aren't uniquely identified by type_code (e.g. two separate
  // "Lease" entries can both refer to the same title), so each row gets a positional
  // key here and is translated back to its type_code only when building the purchase request.
  const referredDocKey = (index: number) => `referred-${index}`;

  const getSelectableDocuments = (): Record<string, DocumentInfo> => {
    if (!availability) return {};
    const docs: Record<string, DocumentInfo> = {};
    if (availability.data.register) docs.register = availability.data.register;
    if (availability.data.title_plan) docs.title_plan = availability.data.title_plan;
    availability.data.referred_to_documents.forEach((doc, index) => {
      docs[referredDocKey(index)] = doc;
    });
    return docs;
  };

  const calculateTotalCost = () => {
    const docs = getSelectableDocuments();
    return selectedDocs.reduce((total, key) => total + (docs[key]?.token_cost ?? 0), 0);
  };

  const hasInsufficientBalance =
    availability && calculateTotalCost() > availability.current_balance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Document Purchase Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Check availability and purchase Land Registry documents
        </p>
      </div>

      {/* Search Card */}
      <Card>
        <CardHeader>
          <CardTitle>Check Document Availability</CardTitle>
          <CardDescription>
            Enter a UK Land Registry title number (e.g., AB123456, BK383592)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckAvailability} className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="title-number">Title Number</Label>
                <Input
                  id="title-number"
                  placeholder="e.g., AB123456"
                  value={titleNumber}
                  onChange={(e) => setTitleNumber(e.target.value.toUpperCase())}
                  pattern="[A-Z]{1,3}[0-9]{1,7}"
                  className="uppercase"
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={isCheckingAvailability}>
                  <Search className="h-4 w-4 mr-2" />
                  {isCheckingAvailability ? 'Checking...' : 'Check Availability'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Quick Purchase Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Quick Purchase
          </CardTitle>
          <CardDescription>
            Purchase register and/or title plan documents directly, without checking availability
            first
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleQuickPurchase} className="space-y-4">
            <div>
              <Label htmlFor="quick-title-number">Title Number</Label>
              <Input
                id="quick-title-number"
                placeholder="e.g., AB123456"
                value={quickTitleNumber}
                onChange={(e) => setQuickTitleNumber(e.target.value.toUpperCase())}
                pattern="[A-Z]{1,3}[0-9]{1,7}"
                className="uppercase"
              />
            </div>

            <div>
              <Label>Documents</Label>
              <div className="mt-2 space-y-2">
                {[
                  { id: 'register', label: 'Title Register' },
                  { id: 'title_plan', label: 'Title Plan' },
                ].map(({ id, label }) => (
                  <div
                    key={id}
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleQuickDocSelection(id)}
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        quickSelectedDocs.includes(id)
                          ? 'bg-primary border-primary'
                          : 'border-gray-300'
                      }`}
                    >
                      {quickSelectedDocs.includes(id) && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="quick-customer-ref">Customer Reference (Optional)</Label>
              <Input
                id="quick-customer-ref"
                placeholder="Your internal reference"
                value={quickCustomerRef}
                onChange={(e) => setQuickCustomerRef(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Info className="h-4 w-4" />
                Token cost will be deducted at time of purchase
              </p>
              <Button
                type="submit"
                disabled={quickPurchaseMutation.isPending || quickSelectedDocs.length === 0}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {quickPurchaseMutation.isPending ? 'Purchasing...' : 'Purchase'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Availability Results */}
      {availability && (
        <>
          {/* Balance and Status */}
          <Card>
            <CardHeader>
              <CardTitle>Title: {availability.data.title_number}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge
                  variant={availability.data.title_status_code === 'VALID' ? 'success' : 'warning'}
                >
                  {availability.data.title_status_code}
                </Badge>
                {availability.data.title_status}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Balance</p>
                  <p className="text-2xl font-bold">{formatTokens(availability.current_balance)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Cost</p>
                  <p className="text-2xl font-bold">
                    {formatTokens(availability.total_token_cost_estimate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Available Documents */}
          <Card>
            <CardHeader>
              <CardTitle>Available Documents</CardTitle>
              <CardDescription>Select documents to purchase</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Register */}
              {availability.data.register && (
                <DocumentRow
                  doc={availability.data.register}
                  selected={selectedDocs.includes('register')}
                  onToggle={() => toggleDocSelection('register')}
                  onDownload={handleDownload}
                />
              )}

              {/* Title Plan */}
              {availability.data.title_plan && (
                <DocumentRow
                  doc={availability.data.title_plan}
                  selected={selectedDocs.includes('title_plan')}
                  onToggle={() => toggleDocSelection('title_plan')}
                  onDownload={handleDownload}
                />
              )}

              {/* Purchase Section */}
              {selectedDocs.length > 0 && (
                <div className="pt-4 border-t space-y-4">
                  <div>
                    <Label htmlFor="customer-ref">Customer Reference (Optional)</Label>
                    <Input
                      id="customer-ref"
                      placeholder="Your internal reference"
                      value={customerRef}
                      onChange={(e) => setCustomerRef(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                      <p className="text-xl font-bold">{formatTokens(calculateTotalCost())}</p>
                      {hasInsufficientBalance && (
                        <div className="flex items-center gap-1 text-destructive text-sm mt-1">
                          <AlertCircle className="h-4 w-4" />
                          Insufficient balance
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handlePurchase}
                      disabled={purchaseMutation.isPending || hasInsufficientBalance}
                      size="lg"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {purchaseMutation.isPending ? 'Purchasing...' : 'Purchase Selected'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Referred to in the Register */}
          {availability.data.referred_to_documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Documents Referred To in the Register</CardTitle>
                <CardDescription>
                  These documents are referenced by entries in the register. Some can be
                  purchased directly; others require a manual request.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {availability.data.referred_to_documents.map((doc, index) => {
                  const contextParts = [];
                  if (doc.filed_under) contextParts.push(`Filed under: ${doc.filed_under}`);
                  if (doc.entry_numbers?.length) {
                    contextParts.push(`Entry ${doc.entry_numbers.join(', ')}`);
                  }
                  const key = referredDocKey(index);
                  return (
                    <DocumentRow
                      key={key}
                      doc={doc}
                      selected={selectedDocs.includes(key)}
                      onToggle={() => toggleDocSelection(key)}
                      onDownload={handleDownload}
                      contextNote={contextParts.length ? contextParts.join(' • ') : undefined}
                    />
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Pending Applications */}
          {availability.data.pending_applications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-yellow-600" />
                  Pending Applications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availability.data.pending_applications.map((app, idx) => (
                    <div key={idx} className="p-3 border rounded text-sm">
                      <div className="flex justify-between">
                        <span className="font-semibold">{app.application_type_description}</span>
                        <Badge variant={app.expedited === 'true' ? 'warning' : 'secondary'}>
                          {app.expedited === 'true' ? 'Expedited' : 'Standard'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mt-1">{app.application_progress}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ref: {app.application_reference} • Priority: {app.priority_date}{' '}
                        {app.priority_time}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Last Purchase */}
      {lastPurchasedOrder && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-semibold">Purchase successful!</p>
                <p className="text-sm text-muted-foreground">Order ID: {lastPurchasedOrder}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

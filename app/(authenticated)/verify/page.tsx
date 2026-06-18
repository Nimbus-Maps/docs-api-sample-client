'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { VerifyOwnershipRequest, VerifyOwnershipResponse } from '@/lib/types';
import { formatTokens } from '@/lib/utils';
import { CheckCircle, XCircle, Users, Home } from 'lucide-react';
import { toast } from 'sonner';

export default function VerifyPage() {
  const [formData, setFormData] = useState<VerifyOwnershipRequest>({
    title_number: '',
    first_forename: '',
    middle_name: '',
    surname: '',
    customer_reference: '',
  });

  const verifyMutation = useMutation<VerifyOwnershipResponse, Error, VerifyOwnershipRequest>({
    mutationFn: async (request) => {
      const res = await fetch('/api/verify-ownership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to verify ownership');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Verification completed');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title_number || !formData.first_forename || !formData.surname) {
      toast.error('Please fill in all required fields');
      return;
    }
    verifyMutation.mutate(formData);
  };

  const handleChange = (field: keyof VerifyOwnershipRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getMatchBadgeVariant = (
    match: string | undefined
  ): 'success' | 'destructive' | 'secondary' => {
    if (!match) return 'secondary';
    return match === 'MATCH' ? 'success' : match === 'NO_MATCH' ? 'destructive' : 'secondary';
  };

  const getMatchResultColor = (
    result: string
  ): 'success' | 'warning' | 'destructive' | 'secondary' => {
    switch (result) {
      case 'SINGLE_MATCH':
        return 'success';
      case 'MULTIPLE_MATCHES':
        return 'warning';
      case 'NO_MATCHES':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Verify Ownership</h1>
        <p className="text-muted-foreground mt-1">
          Verify if a named person is the registered proprietor of a property
        </p>
      </div>

      {/* Verification Form */}
      <Card>
        <CardHeader>
          <CardTitle>Ownership Verification Form</CardTitle>
          <CardDescription>
            Enter the person's name and property title number (costs 1 token)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title-number">Title Number *</Label>
              <Input
                id="title-number"
                placeholder="e.g., BK126329"
                value={formData.title_number}
                onChange={(e) => handleChange('title_number', e.target.value.toUpperCase())}
                required
                className="uppercase"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first-forename">First Forename *</Label>
                <Input
                  id="first-forename"
                  placeholder="e.g., John"
                  value={formData.first_forename}
                  onChange={(e) => handleChange('first_forename', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="surname">Surname *</Label>
                <Input
                  id="surname"
                  placeholder="e.g., Smith"
                  value={formData.surname}
                  onChange={(e) => handleChange('surname', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="middle-name">Middle Name (Optional)</Label>
              <Input
                id="middle-name"
                placeholder="e.g., David"
                value={formData.middle_name}
                onChange={(e) => handleChange('middle_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="customer-ref">Customer Reference (Optional)</Label>
              <Input
                id="customer-ref"
                placeholder="Your internal reference"
                value={formData.customer_reference}
                onChange={(e) => handleChange('customer_reference', e.target.value)}
              />
            </div>

            <Button type="submit" disabled={verifyMutation.isPending} className="w-full">
              <Users className="h-4 w-4 mr-2" />
              {verifyMutation.isPending ? 'Verifying...' : 'Verify Ownership (1 token)'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Verification Results */}
      {verifyMutation.data && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Verification Results</CardTitle>
              <Badge variant={getMatchResultColor(verifyMutation.data.match_result)}>
                {verifyMutation.data.match_result.replace('_', ' ')}
              </Badge>
            </div>
            <CardDescription>
              Verification ID: {verifyMutation.data.verification_id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Match Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Surname Match</p>
                <Badge variant={getMatchBadgeVariant(verifyMutation.data.surname_match)}>
                  {verifyMutation.data.surname_match || 'N/A'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forename Match</p>
                <Badge variant={getMatchBadgeVariant(verifyMutation.data.forename_match)}>
                  {verifyMutation.data.forename_match || 'N/A'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Middle Name Match</p>
                <Badge variant={getMatchBadgeVariant(verifyMutation.data.middle_name_match)}>
                  {verifyMutation.data.middle_name_match || 'N/A'}
                </Badge>
              </div>
            </div>

            {/* Forename Match Details */}
            {verifyMutation.data.forename_match_details && (
              <div>
                <h4 className="font-semibold mb-2">Forename Match Quality</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2">
                    {verifyMutation.data.forename_match_details.forename_initial ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Initial Match</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {verifyMutation.data.forename_match_details.forename_sound ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Sound Match</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {verifyMutation.data.forename_match_details.forename_distance ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="text-sm">Distance Match</span>
                  </div>
                </div>
              </div>
            )}

            {/* Property Address */}
            {verifyMutation.data.property_address && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Property Address
                </h4>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">
                    {verifyMutation.data.property_address.building_number}{' '}
                    {verifyMutation.data.property_address.building_name}{' '}
                    {verifyMutation.data.property_address.street_name}
                  </p>
                  <p>{verifyMutation.data.property_address.city_name}</p>
                  <p>{verifyMutation.data.property_address.postcode}</p>
                  <div className="mt-2">
                    <Badge variant="outline" className="capitalize">
                      {verifyMutation.data.property_address.tenure}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {/* Match Information */}
            {verifyMutation.data.match_information && (
              <div>
                <h4 className="font-semibold mb-2">Match Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Ownership Type</p>
                    <p className="font-medium">
                      {verifyMutation.data.match_information.ownership_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Historical Match</p>
                    <p className="font-medium">
                      {verifyMutation.data.match_information.historical_match ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tokens Charged */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tokens Charged</p>
                  <p className="font-semibold">
                    {formatTokens(verifyMutation.data.tokens_charged)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">New Balance</p>
                  <p className="font-semibold">{formatTokens(verifyMutation.data.new_balance)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

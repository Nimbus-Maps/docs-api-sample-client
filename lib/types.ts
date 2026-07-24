/**
 * TypeScript types for Nimbus Document Purchase API
 * Based on OpenAPI specification
 */

// ============================================================================
// Document Availability Types
// ============================================================================

export interface DocumentInfo {
  type: string;
  type_code: string;
  availability: string;
  availability_code: 'IMMEDIATE' | 'BACKDATED' | 'NOT_AVAILABLE' | 'MANUAL';
  backdated?: boolean;
  token_cost: number;
  previously_purchased?: string | null;
  document_id?: string | null;
  entry_numbers?: string[];
  date?: string;
  filed_under?: string | null;
  plan_only?: boolean;
}

export interface PendingApplication {
  application_type: string;
  application_type_description: string;
  application_reference: string;
  priority_date: string;
  priority_time: string;
  application_progress: string;
  customer_reference: string;
  expedited: string;
  application_received_by: string;
  lodged_by: string;
}

export interface AvailabilityData {
  title_number: string;
  title_status: string;
  title_status_code: string;
  pending_applications: PendingApplication[];
  referred_to_documents: DocumentInfo[];
  register?: DocumentInfo;
  title_plan?: DocumentInfo;
}

export interface AvailabilityCheckResponse {
  data: AvailabilityData;
  total_token_cost_estimate: number;
  current_balance: number;
}

// ============================================================================
// Purchase Types
// ============================================================================

export interface ReferredDocumentPurchaseItem {
  type_code: string;
  date: string;
  filed_under: string;
}

export interface PurchaseRequest {
  title_number: string;
  documents?: string[];
  referred_documents?: ReferredDocumentPurchaseItem[];
  customer_reference?: string;
}

export interface PurchaseResponse {
  order_id: string;
  status: OrderStatus;
  title_number: string;
  documents_ordered: string[];
  referred_documents_ordered?: ReferredDocumentPurchaseItem[];
  total_tokens_charged: number;
  new_balance: number;
  estimated_delivery: string;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'WEBHOOK_FAILED';

export interface OrderDocument {
  document_id: string;
  document_type: string;
  status: string;
  title_number: string;
  webhook_delivery_status?: string;
  webhook_delivery_attempts?: number;
}

export interface OrderStatusResponse {
  order_id: string;
  status: OrderStatus;
  customer_reference?: string;
  documents: OrderDocument[];
  total_tokens_charged: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookSubscriptionRequest {
  webhook_url: string;
  webhook_secret?: string;
}

export interface WebhookSubscriptionResponse {
  subscription_id: string;
  webhook_url: string;
  secret: string;
}

export interface WebhookEventData {
  Reference: string;
  OrderId: string | null;
  TitleNumber: string;
  DocumentTypeId: string | null;
  DocumentDescription: string | null;
  PreviousStatus: number;
  NewStatus: number;
  StatusDescription: string;
  Message: string | null;
  DownloadUrl: string | null;
}

export interface WebhookPayload {
  EventId: string;
  EventType: string;
  Timestamp: string;
  Data: WebhookEventData;
}

export interface WebhookEvent {
  id: string;
  receivedAt: string;
  payload: WebhookPayload;
  signature: string;
  verified: boolean;
}

// ============================================================================
// Webhook Management Types
// ============================================================================

export interface WebhookAuditItem {
  id: number;
  event_id: string;
  subscription_id: string;
  endpoint_url: string | null;
  event_type: string | null;
  document_reference: string | null;
  title_number: string | null;
  document_status: number;
  document_status_description: string | null;
  attempt_number: number;
  http_status_code: number | null;
  is_success: boolean;
  error_message: string | null;
  attempted_at: string;
  duration_ms: number | null;
}

export interface WebhookAuditRequest {
  start_date?: string;
  end_date?: string;
  subscription_id?: string;
  document_reference?: string;
  page_number?: number;
  page_size?: number;
}

export interface WebhookAuditResponse {
  items: WebhookAuditItem[];
  total_count: number;
  page_number: number;
  page_size: number;
  total_pages: number;
}

export interface WebhookEventDetailsResponse {
  event_id: string;
  attempts: WebhookAuditItem[];
}

export interface WebhookStatisticsRequest {
  start_date: string;
  end_date: string;
}

export interface WebhookStatisticsResponse {
  total_attempts: number;
  successful_deliveries: number;
  failed_deliveries: number;
  success_rate: number;
  average_duration_ms: number;
}

// ============================================================================
// Ownership Verification Types
// ============================================================================

export interface VerifyOwnershipRequest {
  title_number: string;
  first_forename: string;
  middle_name?: string;
  surname: string;
  customer_reference?: string;
}

export interface PropertyAddress {
  building_number?: string;
  building_name?: string;
  street_name: string;
  city_name: string;
  postcode: string;
  tenure: string;
}

export interface ForenameMatchDetails {
  forename_initial: boolean;
  forename_sound: boolean;
  forename_distance: boolean;
}

export interface MatchInformation {
  historical_match: boolean;
  ownership_type: string;
}

export type MatchResult = 'SINGLE_MATCH' | 'MULTIPLE_MATCHES' | 'NO_MATCHES';
export type NameMatchResult = 'MATCH' | 'NO_MATCH' | 'NOT_SUPPLIED';

export interface VerifyOwnershipResponse {
  verification_id: string;
  title_number: string;
  match_result: MatchResult;
  property_address?: PropertyAddress;
  surname_match?: NameMatchResult;
  forename_match?: NameMatchResult;
  middle_name_match?: NameMatchResult;
  forename_match_details?: ForenameMatchDetails;
  match_information?: MatchInformation;
  tokens_charged: number;
  new_balance: number;
  verified_at: string;
}

// ============================================================================
// Download Types
// ============================================================================

export interface DocumentDownloadResponse {
  document_id: string;
  document_type_code: string;
  format: string;
  content: string;
  metadata: {
    filename: string;
    file_size_bytes: number;
  };
  downloaded_at: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponse {
  error: ApiError;
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionInfo {
  authMode: 'obo' | 'client_credentials';
  isAuthenticated: boolean;
  expiresAt?: number;
  hasWebhookSubscription: boolean;
  webhookSubscriptionId?: string;
}

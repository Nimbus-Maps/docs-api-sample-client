import { z } from 'zod';
import type { VerifyOwnershipRequest } from './types';

const requiredTrimmedString = z.string().trim().min(1);

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }

  return value;
}, z.string().trim().min(1).optional());

export const verifyOwnershipRequestSchema = z
  .object({
    title_number: requiredTrimmedString,
    first_forename: requiredTrimmedString,
    middle_name: optionalTrimmedString,
    surname: requiredTrimmedString,
    customer_reference: optionalTrimmedString,
  })
  .strict();

export function parseVerifyOwnershipRequest(value: unknown): VerifyOwnershipRequest {
  return verifyOwnershipRequestSchema.parse(value);
}

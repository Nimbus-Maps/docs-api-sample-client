import { ZodError } from 'zod';
import { parseVerifyOwnershipRequest } from './verify-ownership-validation';

describe('parseVerifyOwnershipRequest', () => {
  it('trims required and optional string fields', () => {
    const result = parseVerifyOwnershipRequest({
      title_number: ' BK126329 ',
      first_forename: ' John ',
      middle_name: ' David ',
      surname: ' Smith ',
      customer_reference: ' Ref-123 ',
    });

    expect(result).toEqual({
      title_number: 'BK126329',
      first_forename: 'John',
      middle_name: 'David',
      surname: 'Smith',
      customer_reference: 'Ref-123',
    });
  });

  it('removes blank optional fields', () => {
    const result = parseVerifyOwnershipRequest({
      title_number: 'BK126329',
      first_forename: 'John',
      middle_name: ' ',
      surname: 'Smith',
      customer_reference: '',
    });

    expect(result).toEqual({
      title_number: 'BK126329',
      first_forename: 'John',
      surname: 'Smith',
    });
  });

  it('rejects missing required fields', () => {
    expect(() =>
      parseVerifyOwnershipRequest({
        title_number: 'BK126329',
        first_forename: 'John',
      })
    ).toThrow(ZodError);
  });

  it('rejects unknown fields', () => {
    expect(() =>
      parseVerifyOwnershipRequest({
        title_number: 'BK126329',
        first_forename: 'John',
        surname: 'Smith',
        admin: true,
      })
    ).toThrow(ZodError);
  });
});

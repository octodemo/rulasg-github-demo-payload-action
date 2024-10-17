import vine, { errors } from '@vinejs/vine';
import { Infer, SchemaTypes } from '@vinejs/vine/types';

export async function validate<T extends SchemaTypes>(schema: T, data: string): Promise<Infer<T>> {
  try {
    const validator = vine.compile(schema);
    const result = await validator.validate(JSON.parse(data));
    return result;
  } catch (err: any) {
    if (err instanceof errors.E_VALIDATION_ERROR) {
      // Using SimpleErrorReporter means we have a messages array with the failures do a rough conversion for now
      const failures = err.messages.map((errorMessages: any) => {return errorMessages.message}).join('; ');
      throw new Error(`Validation of JSON payload failed: ${failures}.`);
    }

    // Rethrow the error
    throw err;
  }
}
'use server';
import { handleSubmission, type FormState } from '@northem/core/forms';

export async function submitForm(_prev: FormState | null, data: FormData): Promise<FormState> {
  return handleSubmission(data);
}

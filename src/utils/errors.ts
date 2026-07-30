/** Error utility for errors with an error code (for example, Firebase errors). */
export const isErrorWithCode = (
  error: unknown,
): error is Error & { code: string } => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code?: unknown }).code === 'string'
  );
};

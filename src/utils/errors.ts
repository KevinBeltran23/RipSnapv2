/** Error utility — type guard for errors with an error code (e.g. Firebase). */
export const isErrorWithCode = (
  error: unknown,
): error is Error & { code: string } => {
  return (
    error instanceof Error &&
    'code' in error &&
    typeof (error as any).code === 'string'
  );
};

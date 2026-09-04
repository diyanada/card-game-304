// Console-only client-side error logging (infrastructure-design.md Question 3:A).
export function logError(context: string, error: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[304-card-game] ${context}:`, error);
}

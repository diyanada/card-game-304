// BR-10: all client-caused failures respond 400 with { error: string }.
// Unexpected exceptions (not this class) are handled as 500 by errorHandler.ts (NFR Design Question 1:A).
export class ClientError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}

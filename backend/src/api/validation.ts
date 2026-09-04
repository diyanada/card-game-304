import { NextFunction, Request, Response } from "express";
import { z, ZodSchema } from "zod";
import { ClientError } from "./errors";

// NFR Design Question 2:B — zod schema validation per route.
export const playCardBodySchema = z.object({
  cardId: z.string().min(1, "cardId is required"),
});

export const selectTrumpBodySchema = z.object({
  suit: z.enum(["Spades", "Hearts", "Clubs", "Diamonds"], {
    errorMap: () => ({ message: "suit must be one of Spades, Hearts, Clubs, Diamonds" }),
  }),
});

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(new ClientError(result.error.issues.map((i) => i.message).join("; ")));
      return;
    }
    req.body = result.data;
    next();
  };
}

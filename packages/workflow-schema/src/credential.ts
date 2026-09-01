import { z } from "zod";

export const CredentialType = z.enum([
  "username_password",
  "email_password",
  "api_key",
  "token",
  "cookie_session",
  "custom",
]);
export type CredentialTypeType = z.infer<typeof CredentialType>;

// Fields accepted from the client when creating/editing a credential. The
// server encrypts `secret` (a JSON-stringified map of field->value) before
// persisting and never returns it in API responses.
export const CredentialInputSchema = z.object({
  name: z.string().min(1),
  type: CredentialType,
  fields: z.record(z.string(), z.string()),
});
export type CredentialInput = z.infer<typeof CredentialInputSchema>;

import { prisma } from "../db.js";
import { encryptSecret, decryptSecret } from "@flowpilot/shared";
import { env } from "../env.js";

export async function resolveCredentialFields(credentialId: string): Promise<Record<string, string> | undefined> {
  const row = await prisma.credential.findUnique({ where: { id: credentialId } });
  if (!row) return undefined;
  const json = decryptSecret(row.encryptedSecret, env.credentialEncryptionKey);
  return JSON.parse(json);
}

export function encryptFields(fields: Record<string, string>): string {
  return encryptSecret(JSON.stringify(fields), env.credentialEncryptionKey);
}

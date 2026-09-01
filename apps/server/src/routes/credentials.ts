import type { FastifyInstance } from "fastify";
import { CredentialInputSchema } from "@flowpilot/workflow-schema";
import { prisma } from "../db.js";
import { generateId } from "@flowpilot/shared";
import { encryptFields, resolveCredentialFields } from "../services/credentials.js";

export async function credentialRoutes(app: FastifyInstance) {
  app.get("/api/credentials", async (req) => {
    const rows = await prisma.credential.findMany({ where: { workspaceId: req.user!.workspaceId }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, fieldNames: JSON.parse(r.fieldNames || "[]"), createdAt: r.createdAt, updatedAt: r.updatedAt }));
  });

  app.post("/api/credentials", async (req, reply) => {
    const body = CredentialInputSchema.parse(req.body);
    const row = await prisma.credential.create({
      data: {
        id: generateId("cred"), workspaceId: req.user!.workspaceId, name: body.name, type: body.type,
        encryptedSecret: encryptFields(body.fields), fieldNames: JSON.stringify(Object.keys(body.fields)),
      },
    });
    return reply.code(201).send({ id: row.id, name: row.name, type: row.type, fieldNames: JSON.parse(row.fieldNames) });
  });

  app.put("/api/credentials/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.credential.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Credential not found." });
    const body = CredentialInputSchema.parse(req.body);
    const row = await prisma.credential.update({
      where: { id },
      data: { name: body.name, type: body.type, encryptedSecret: encryptFields(body.fields), fieldNames: JSON.stringify(Object.keys(body.fields)) },
    });
    return reply.send({ id: row.id, name: row.name, type: row.type, fieldNames: JSON.parse(row.fieldNames) });
  });

  app.delete("/api/credentials/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.credential.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Credential not found." });
    await prisma.credential.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // "Test" a credential: confirms it decrypts successfully without ever
  // returning the secret to the client. Full login verification would
  // require running a real browser workflow against the target site.
  app.post("/api/credentials/:id/test", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.credential.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Credential not found." });
    try {
      const fields = await resolveCredentialFields(id);
      return reply.send({ ok: true, fieldCount: fields ? Object.keys(fields).length : 0 });
    } catch (err) {
      return reply.code(500).send({ ok: false, error: "Failed to decrypt credential. Check CREDENTIAL_ENCRYPTION_KEY." });
    }
  });
}

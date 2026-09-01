import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { generateId } from "@flowpilot/shared";
import { deleteProfile } from "@flowpilot/browser-engine";
import { env } from "../env.js";
import { loginSessionManager } from "../services/loginSessionManager.js";

const CreateSchema = z.object({ name: z.string().min(1) });

export async function browserProfileRoutes(app: FastifyInstance) {
  app.get("/api/browser-profiles", async (req) => {
    const rows = await prisma.browserProfile.findMany({ where: { workspaceId: req.user!.workspaceId }, orderBy: { createdAt: "desc" } });
    return rows.map((r) => ({ id: r.id, name: r.name, createdAt: r.createdAt, lastUsedAt: r.lastUsedAt, loginSessionOpen: loginSessionManager.isOpen(r.dirName) }));
  });

  app.post("/api/browser-profiles", async (req, reply) => {
    const body = CreateSchema.parse(req.body);
    const dirName = generateId("profile");
    const row = await prisma.browserProfile.create({ data: { id: generateId("bp"), workspaceId: req.user!.workspaceId, name: body.name, dirName } });
    return reply.code(201).send({ id: row.id, name: row.name });
  });

  app.delete("/api/browser-profiles/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.browserProfile.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Browser profile not found." });
    await loginSessionManager.close(existing.dirName).catch(() => {});
    await deleteProfile(env.browserProfilesDir, existing.dirName);
    await prisma.browserProfile.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  app.post("/api/browser-profiles/:id/clear-session", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.browserProfile.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Browser profile not found." });
    await loginSessionManager.close(existing.dirName).catch(() => {});
    await deleteProfile(env.browserProfilesDir, existing.dirName);
    return reply.send({ ok: true });
  });

  app.post("/api/browser-profiles/:id/login-session", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.browserProfile.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Browser profile not found." });
    const body = (req.body ?? {}) as { url?: string };
    try {
      await loginSessionManager.open(existing.dirName, body.url);
    } catch (err) {
      return reply.code(409).send({ error: (err as Error).message });
    }
    await prisma.browserProfile.update({ where: { id }, data: { lastUsedAt: new Date() } });
    return reply.send({ ok: true });
  });

  app.post("/api/browser-profiles/:id/login-session/close", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.browserProfile.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Browser profile not found." });
    await loginSessionManager.close(existing.dirName);
    return reply.send({ ok: true });
  });
}

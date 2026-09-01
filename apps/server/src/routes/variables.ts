import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { generateId } from "@flowpilot/shared";

const VariableSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "date", "array", "object"]).default("string"),
  defaultValue: z.unknown().optional(),
  sensitive: z.boolean().default(false),
});

export async function variableRoutes(app: FastifyInstance) {
  app.get("/api/variables", async (req) => {
    const rows = await prisma.variable.findMany({ where: { workspaceId: req.user!.workspaceId }, orderBy: { name: "asc" } });
    return rows.map((r) => ({ id: r.id, name: r.name, type: r.type, sensitive: r.sensitive, defaultValue: r.sensitive ? undefined : safeParse(r.defaultValue) }));
  });

  app.post("/api/variables", async (req, reply) => {
    const body = VariableSchema.parse(req.body);
    const row = await prisma.variable.create({
      data: {
        id: generateId("var"), workspaceId: req.user!.workspaceId, name: body.name, type: body.type,
        sensitive: body.sensitive, defaultValue: body.defaultValue !== undefined ? JSON.stringify(body.defaultValue) : null,
      },
    });
    return reply.code(201).send({ id: row.id, name: row.name });
  });

  app.delete("/api/variables/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.variable.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Variable not found." });
    await prisma.variable.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}

function safeParse(value: string | null) {
  if (!value) return undefined;
  try { return JSON.parse(value); } catch { return value; }
}

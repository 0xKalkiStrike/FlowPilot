import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { generateId } from "@flowpilot/shared";

const CONNECTOR_CATALOG = [
  { type: "discord", name: "Discord", description: "Automate Discord through the normal web UI — no bot token required.", authMode: "browser" },
  { type: "github", name: "GitHub", description: "Automate repos, issues, and actions through the GitHub web UI.", authMode: "browser" },
  { type: "wordpress", name: "WordPress", description: "Automate posts and pages through the WordPress admin UI.", authMode: "browser" },
  { type: "woocommerce", name: "WooCommerce", description: "Automate store management through the WooCommerce admin UI.", authMode: "browser" },
  { type: "vercel", name: "Vercel", description: "Automate deployments through the Vercel dashboard.", authMode: "browser" },
  { type: "render", name: "Render", description: "Automate deployments through the Render dashboard.", authMode: "browser" },
  { type: "email", name: "Email", description: "Send email via an optional SMTP/API integration.", authMode: "api-optional" },
];

const ConnectorSchema = z.object({
  type: z.string().min(1), name: z.string().min(1), config: z.record(z.string(), z.string()).default({}), credentialId: z.string().optional(),
});

export async function connectorRoutes(app: FastifyInstance) {
  app.get("/api/connectors/catalog", async () => CONNECTOR_CATALOG);

  app.get("/api/connectors", async (req) => {
    const rows = await prisma.connector.findMany({ where: { workspaceId: req.user!.workspaceId } });
    return rows.map((r) => ({ id: r.id, type: r.type, name: r.name, config: JSON.parse(r.config || "{}"), credentialId: r.credentialId }));
  });

  app.post("/api/connectors", async (req, reply) => {
    const body = ConnectorSchema.parse(req.body);
    const row = await prisma.connector.create({
      data: { id: generateId("conn"), workspaceId: req.user!.workspaceId, type: body.type, name: body.name, config: JSON.stringify(body.config), credentialId: body.credentialId },
    });
    return reply.code(201).send({ id: row.id });
  });

  app.delete("/api/connectors/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const existing = await prisma.connector.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!existing) return reply.code(404).send({ error: "Connector not found." });
    await prisma.connector.delete({ where: { id } });
    return reply.send({ ok: true });
  });
}

import type { FastifyInstance } from "fastify";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { prisma } from "../db.js";
import { generateId } from "@flowpilot/shared";
import { env } from "../env.js";

function safeJoin(base: string, name: string): string {
  const cleaned = path.basename(name); // strip any path separators — no traversal
  return path.join(base, cleaned);
}

export async function fileRoutes(app: FastifyInstance) {
  app.get("/api/files", async (req) => {
    const query = req.query as { executionId?: string };
    const rows = await prisma.fileRecord.findMany({
      where: { workspaceId: req.user!.workspaceId, ...(query.executionId ? { executionId: query.executionId } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return rows.map((r) => ({ id: r.id, kind: r.kind, fileName: r.fileName, sizeBytes: r.sizeBytes, createdAt: r.createdAt, executionId: r.executionId }));
  });

  app.get("/api/files/:id/download", async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await prisma.fileRecord.findFirst({ where: { id, workspaceId: req.user!.workspaceId } });
    if (!row) return reply.code(404).send({ error: "File not found." });
    if (!fs.existsSync(row.filePath)) return reply.code(410).send({ error: "File no longer exists on disk." });
    reply.header("Content-Disposition", `attachment; filename="${row.fileName}"`);
    return reply.send(fs.createReadStream(row.filePath));
  });

  app.post("/api/files/upload", async (req, reply) => {
    const mp = await req.file({ limits: { fileSize: 50 * 1024 * 1024 } });
    if (!mp) return reply.code(400).send({ error: "No file provided." });
    await fsp.mkdir(env.uploadsDir, { recursive: true });
    const fileName = `${Date.now()}-${path.basename(mp.filename)}`;
    const dest = safeJoin(env.uploadsDir, fileName);
    const buffer = await mp.toBuffer();
    if (buffer.length > 50 * 1024 * 1024) return reply.code(413).send({ error: "File too large (50MB limit)." });
    await fsp.writeFile(dest, buffer);
    const row = await prisma.fileRecord.create({
      data: { id: generateId("file"), workspaceId: req.user!.workspaceId, kind: "upload", fileName, filePath: dest, sizeBytes: buffer.length },
    });
    return reply.code(201).send({ id: row.id, fileName: row.fileName, filePath: dest });
  });
}

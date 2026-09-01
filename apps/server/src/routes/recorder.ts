import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { recorderManager } from "../services/recorderManager.js";

const StartSchema = z.object({ startUrl: z.string().url().optional() });

export async function recorderRoutes(app: FastifyInstance) {
  app.post("/api/recorder/start", async (req, reply) => {
    const body = StartSchema.parse(req.body ?? {});
    try {
      const sessionId = await recorderManager.start(body.startUrl);
      return reply.code(201).send({ sessionId });
    } catch (err) {
      return reply.code(500).send({ error: `Failed to launch recorder browser: ${(err as Error).message}` });
    }
  });

  app.get("/api/recorder/:sessionId/status", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = recorderManager.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Recording session not found." });
    return reply.send(session.getStatus());
  });

  app.post("/api/recorder/:sessionId/pause", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = recorderManager.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Recording session not found." });
    session.pause();
    return reply.send({ ok: true });
  });

  app.post("/api/recorder/:sessionId/resume", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = recorderManager.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Recording session not found." });
    session.resume();
    return reply.send({ ok: true });
  });

  app.post("/api/recorder/:sessionId/undo", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    const session = recorderManager.get(sessionId);
    if (!session) return reply.code(404).send({ error: "Recording session not found." });
    session.undoLast();
    return reply.send({ ok: true });
  });

  app.post("/api/recorder/:sessionId/stop", async (req, reply) => {
    const { sessionId } = req.params as { sessionId: string };
    try {
      const result = await recorderManager.stop(sessionId);
      return reply.send(result);
    } catch (err) {
      return reply.code(404).send({ error: (err as Error).message });
    }
  });
}

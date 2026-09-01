import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "node:crypto";
import { prisma } from "../db.js";
import { hashPassword, verifyPassword, generateId } from "@flowpilot/shared";
import { signSession } from "../lib/auth.js";
import { env } from "../env.js";

const RegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  workspaceName: z.string().min(1).optional(),
});
const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

function setSessionCookies(reply: any, token: string) {
  const csrfToken = crypto.randomBytes(24).toString("hex");
  reply.setCookie(env.sessionCookieName, token, {
    httpOnly: true, sameSite: "lax", path: "/", secure: env.nodeEnv === "production", maxAge: 60 * 60 * 24 * 7,
  });
  reply.setCookie("flowpilot_csrf", csrfToken, {
    httpOnly: false, sameSite: "lax", path: "/", secure: env.nodeEnv === "production", maxAge: 60 * 60 * 24 * 7,
  });
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const body = RegisterSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (existing) return reply.code(409).send({ error: "An account with this email already exists." });

    const { hash, salt } = hashPassword(body.password);
    const user = await prisma.user.create({
      data: { id: generateId("user"), email: body.email.toLowerCase(), passwordHash: hash, passwordSalt: salt, name: body.name },
    });
    const workspace = await prisma.workspace.create({
      data: { id: generateId("ws"), name: body.workspaceName || `${body.name}'s Workspace`, ownerId: user.id },
    });

    const token = signSession({ userId: user.id, workspaceId: workspace.id, email: user.email });
    setSessionCookies(reply, token);
    return reply.code(201).send({ user: { id: user.id, name: user.name, email: user.email }, workspace: { id: workspace.id, name: workspace.name } });
  });

  app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const body = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !verifyPassword(body.password, user.passwordHash, user.passwordSalt)) {
      return reply.code(401).send({ error: "Invalid email or password." });
    }
    const workspace = await prisma.workspace.findFirst({ where: { ownerId: user.id } });
    if (!workspace) return reply.code(500).send({ error: "No workspace found for this account." });

    const token = signSession({ userId: user.id, workspaceId: workspace.id, email: user.email });
    setSessionCookies(reply, token);
    return reply.send({ user: { id: user.id, name: user.name, email: user.email }, workspace: { id: workspace.id, name: workspace.name } });
  });

  app.post("/api/auth/logout", async (req, reply) => {
    reply.clearCookie(env.sessionCookieName, { path: "/" });
    reply.clearCookie("flowpilot_csrf", { path: "/" });
    return reply.send({ ok: true });
  });

  app.get("/api/auth/me", async (req, reply) => {
    const token = req.cookies[env.sessionCookieName];
    if (!token) return reply.code(401).send({ error: "Not authenticated." });
    try {
      const { verifySession } = await import("../lib/auth.js");
      const session = verifySession(token);
      const user = await prisma.user.findUnique({ where: { id: session.userId } });
      const workspace = await prisma.workspace.findUnique({ where: { id: session.workspaceId } });
      if (!user || !workspace) return reply.code(401).send({ error: "Session invalid." });
      return reply.send({ user: { id: user.id, name: user.name, email: user.email }, workspace: { id: workspace.id, name: workspace.name } });
    } catch {
      return reply.code(401).send({ error: "Session expired or invalid." });
    }
  });
}

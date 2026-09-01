import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { verifySession, type SessionPayload } from "../lib/auth.js";
import { env } from "../env.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionPayload;
  }
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const PUBLIC_PATHS = ["/api/auth/register", "/api/auth/login", "/api/health"];
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    const token = req.cookies[env.sessionCookieName];
    if (!token) {
      reply.code(401).send({ error: "Not authenticated." });
      return;
    }
    try {
      req.user = verifySession(token);
    } catch {
      reply.code(401).send({ error: "Session expired or invalid." });
      return;
    }
  });

  fastify.addHook("preHandler", async (req, reply) => {
    if (!req.url.startsWith("/api/")) return;
    if (PUBLIC_PATHS.some((p) => req.url.startsWith(p))) return;
    if (req.url.startsWith("/api/auth/logout") || req.url.startsWith("/api/auth/me")) {
      // still requires auth below, but no CSRF check needed for GET/POST logout without side effects beyond session
    }
    await fastify.authenticate(req, reply);
    if (reply.sent) return;

    // Double-submit CSRF check for state-changing requests.
    if (MUTATING_METHODS.has(req.method)) {
      const csrfCookie = req.cookies["flowpilot_csrf"];
      const csrfHeader = req.headers["x-csrf-token"];
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        reply.code(403).send({ error: "CSRF token missing or invalid." });
      }
    }
  });
}

export default fp(authPlugin as any);

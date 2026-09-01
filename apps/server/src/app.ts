import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";

import authPluginModule from "./plugins/authPlugin.js";
import { authRoutes } from "./routes/auth.js";
import { workflowRoutes } from "./routes/workflows.js";
import { executionRoutes } from "./routes/executions.js";
import { scheduleRoutes } from "./routes/schedules.js";
import { credentialRoutes } from "./routes/credentials.js";
import { browserProfileRoutes } from "./routes/browserProfiles.js";
import { recorderRoutes } from "./routes/recorder.js";
import { templateRoutes } from "./routes/templates.js";
import { variableRoutes } from "./routes/variables.js";
import { connectorRoutes } from "./routes/connectors.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { fileRoutes } from "./routes/files.js";
import { nodeRegistryRoutes } from "./routes/nodeRegistry.js";
import { searchRoutes } from "./routes/search.js";

export async function buildApp() {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });
  await app.register(multipart);

  app.get("/api/health", async () => ({ ok: true, name: "FlowPilot", time: new Date().toISOString() }));

  await app.register(authPluginModule);

  await app.register(authRoutes);
  await app.register(workflowRoutes);
  await app.register(executionRoutes);
  await app.register(scheduleRoutes);
  await app.register(credentialRoutes);
  await app.register(browserProfileRoutes);
  await app.register(recorderRoutes);
  await app.register(templateRoutes);
  await app.register(variableRoutes);
  await app.register(connectorRoutes);
  await app.register(dashboardRoutes);
  await app.register(fileRoutes);
  await app.register(nodeRegistryRoutes);
  await app.register(searchRoutes);

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ZodError) {
      reply.code(400).send({ error: "Validation error.", details: err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`) });
      return;
    }
    app.log.error(err);
    const status = (err as any).statusCode ?? 500;
    reply.code(status).send({ error: status === 500 ? "Internal server error." : err.message });
  });

  return app;
}

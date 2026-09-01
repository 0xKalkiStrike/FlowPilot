import type { FastifyInstance } from "fastify";
import { listNodesByCategory } from "@flowpilot/workflow-schema";

export async function nodeRegistryRoutes(app: FastifyInstance) {
  app.get("/api/node-registry", async () => {
    const byCategory = listNodesByCategory();
    const result: Record<string, unknown[]> = {};
    for (const [category, defs] of Object.entries(byCategory)) {
      result[category] = defs.map((d) => ({
        type: d.type, label: d.label, description: d.description, icon: d.icon,
        requiresTarget: !!d.requiresTarget, supportsCredential: !!d.supportsCredential,
        isContainer: !!d.isContainer, outputs: d.outputs ?? [{ id: "out", label: "Next" }],
        implemented: d.implemented, defaultConfig: d.defaultConfig,
      }));
    }
    return result;
  });
}

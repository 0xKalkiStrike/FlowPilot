import { RecorderSession } from "@flowpilot/browser-engine";
import { generateId } from "@flowpilot/shared";
import { env } from "../env.js";

/** Tracks in-progress browser recording sessions by an opaque session id. */
class RecorderManager {
  private sessions = new Map<string, RecorderSession>();

  async start(startUrl?: string): Promise<string> {
    const sessionId = generateId("rec");
    const session = await RecorderSession.start({
      profilesBaseDir: env.browserProfilesDir,
      profileId: `recorder-${sessionId}`,
      startUrl,
    });
    this.sessions.set(sessionId, session);
    return sessionId;
  }

  get(sessionId: string): RecorderSession | undefined {
    return this.sessions.get(sessionId);
  }

  async stop(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error("Recording session not found. It may have already been stopped.");
    const result = await session.stop();
    this.sessions.delete(sessionId);
    return result;
  }

  discard(sessionId: string) {
    this.sessions.delete(sessionId);
  }
}

export const recorderManager = new RecorderManager();

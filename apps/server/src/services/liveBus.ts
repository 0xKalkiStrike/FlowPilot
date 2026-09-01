import { EventEmitter } from "node:events";
import type { ExecutionEvent } from "@flowpilot/workflow-schema";

/**
 * One EventEmitter per running execution, used to fan out live events to any
 * number of connected SSE clients (Runs page live view + execution screen).
 * Emitters are created on demand and cleaned up shortly after the execution
 * finishes so a late-connecting client can still catch the tail of events.
 */
class LiveBus {
  private emitters = new Map<string, EventEmitter>();

  get(executionId: string): EventEmitter {
    let emitter = this.emitters.get(executionId);
    if (!emitter) {
      emitter = new EventEmitter();
      emitter.setMaxListeners(50);
      this.emitters.set(executionId, emitter);
    }
    return emitter;
  }

  publish(event: ExecutionEvent) {
    this.get(event.executionId).emit("event", event);
  }

  cleanupSoon(executionId: string) {
    setTimeout(() => this.emitters.delete(executionId), 60_000);
  }
}

export const liveBus = new LiveBus();

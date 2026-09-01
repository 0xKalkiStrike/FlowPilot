import { useEffect, useRef } from "react";

export interface StreamHandlers {
  onLog?: (payload: any) => void;
  onStatus?: (payload: any) => void;
  onNodeStatus?: (payload: any) => void;
  onDone?: (payload: any) => void;
}

export function useExecutionStream(executionId: string | null, handlers: StreamHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!executionId) return;
    const es = new EventSource(`/api/executions/${executionId}/stream`);
    es.addEventListener("log", (e) => handlersRef.current.onLog?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("status", (e) => handlersRef.current.onStatus?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("node_status", (e) => handlersRef.current.onNodeStatus?.(JSON.parse((e as MessageEvent).data)));
    es.addEventListener("done", (e) => {
      handlersRef.current.onDone?.(JSON.parse((e as MessageEvent).data));
      es.close();
    });
    es.onerror = () => { /* browser auto-retries; server closes the stream itself when finished */ };
    return () => es.close();
  }, [executionId]);
}

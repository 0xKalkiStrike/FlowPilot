import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { ExecutionLog } from '../types/workflow.js';
import { wsClient } from '../lib/wsClient.js';

interface ExecutionState {
  activeExecutionId: string | null;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  activeNodeId: string | null;
  completedNodeIds: Set<string>;
  failedNodeId: string | null;
  logs: ExecutionLog[];
  screenshots: string[];
  humanVerificationReason: string | null;
  isModalOpen: boolean;
}

interface ExecutionContextType extends ExecutionState {
  startLiveExecution: (executionId: string) => void;
  closeModal: () => void;
  openModal: () => void;
  clearState: () => void;
  resumePausedExecution: () => Promise<void>;
  cancelActiveExecution: () => Promise<void>;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

export function ExecutionProvider({ children }: { children: React.ReactNode }) {
  const [activeExecutionId, setActiveExecutionId] = useState<string | null>(null);
  const [status, setStatus] = useState<ExecutionState['status']>('IDLE');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [completedNodeIds, setCompletedNodeIds] = useState<Set<string>>(new Set());
  const [failedNodeId, setFailedNodeId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [humanVerificationReason, setHumanVerificationReason] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Subscribe to persistent WebSocket client
  useEffect(() => {
    const unsubscribe = wsClient.subscribe((msg) => {
      switch (msg.type) {
        case 'EXECUTION_STARTED':
          setStatus('RUNNING');
          setCompletedNodeIds(new Set());
          setFailedNodeId(null);
          setLogs([]);
          setScreenshots([]);
          setHumanVerificationReason(null);
          break;

        case 'EXECUTION_NODE_START':
          setActiveNodeId(msg.payload.nodeId);
          break;

        case 'EXECUTION_NODE_SUCCESS':
          setActiveNodeId(null);
          setCompletedNodeIds((prev) => new Set([...prev, msg.payload.nodeId]));
          break;

        case 'EXECUTION_NODE_FAILED':
          setActiveNodeId(null);
          setFailedNodeId(msg.payload.nodeId);
          break;

        case 'EXECUTION_LOG':
          setLogs((prev) => [...prev, msg.payload]);
          break;

        case 'EXECUTION_SCREENSHOT':
          setScreenshots((prev) => [...prev, msg.payload.filename]);
          break;

        case 'EXECUTION_PAUSED':
          setStatus('PAUSED');
          setHumanVerificationReason(msg.payload.reason);
          break;

        case 'EXECUTION_RESUMED':
          setStatus('RUNNING');
          setHumanVerificationReason(null);
          break;

        case 'EXECUTION_COMPLETED':
          setStatus(msg.payload.status);
          setActiveNodeId(null);
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const startLiveExecution = (executionId: string) => {
    setActiveExecutionId(executionId);
    setStatus('RUNNING');
    setActiveNodeId(null);
    setCompletedNodeIds(new Set());
    setFailedNodeId(null);
    setLogs([]);
    setScreenshots([]);
    setHumanVerificationReason(null);
    setIsModalOpen(true);

    wsClient.send({
      type: 'SUBSCRIBE_EXECUTION',
      payload: { executionId }
    });
  };

  const resumePausedExecution = async () => {
    if (!activeExecutionId) return;
    try {
      await fetch(`/api/executions/${activeExecutionId}/resume`, { method: 'POST' });
    } catch (err) {
      console.error('Failed to resume execution:', err);
    }
  };

  const cancelActiveExecution = async () => {
    if (!activeExecutionId) return;
    try {
      await fetch(`/api/executions/${activeExecutionId}/cancel`, { method: 'POST' });
      setStatus('CANCELLED');
    } catch (err) {
      console.error('Failed to cancel execution:', err);
    }
  };

  const closeModal = () => setIsModalOpen(false);
  const openModal = () => setIsModalOpen(true);
  const clearState = () => {
    setActiveExecutionId(null);
    setStatus('IDLE');
    setActiveNodeId(null);
    setCompletedNodeIds(new Set());
    setFailedNodeId(null);
    setLogs([]);
    setScreenshots([]);
    setHumanVerificationReason(null);
  };

  return (
    <ExecutionContext.Provider
      value={{
        activeExecutionId,
        status,
        activeNodeId,
        completedNodeIds,
        failedNodeId,
        logs,
        screenshots,
        humanVerificationReason,
        isModalOpen,
        startLiveExecution,
        closeModal,
        openModal,
        clearState,
        resumePausedExecution,
        cancelActiveExecution
      }}
    >
      {children}
    </ExecutionContext.Provider>
  );
}

export function useExecution() {
  const context = useContext(ExecutionContext);
  if (!context) throw new Error('useExecution must be used within ExecutionProvider');
  return context;
}

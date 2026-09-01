import { chromium, BrowserContext, Page } from 'playwright';
import { profileService } from './profileService.js';
import { wsManager } from '../ws/wsManager.js';
import { v4 as uuidv4 } from 'uuid';

export interface RecordedAction {
  id: string;
  type: string; // 'browser_open_url' | 'interaction_click' | 'interaction_type_text' | 'form_dropdown' | 'form_checkbox'
  title: string;
  timestamp: number;
  data: Record<string, any>;
}

export interface ActiveRecordingSession {
  id: string;
  url: string;
  profileId: string;
  context: BrowserContext;
  page: Page;
  actions: RecordedAction[];
  isStopped: boolean;
}

export class RecorderService {
  private activeSessions: Map<string, ActiveRecordingSession> = new Map();

  public async startRecording(initialUrl: string = 'https://google.com', profileId: string = 'default'): Promise<{ recordingId: string }> {
    const recordingId = `rec_${uuidv4().substring(0, 8)}`;
    const profileDir = profileService.getProfileDir(profileId);

    let cleanUrl = initialUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      slowMo: 50,
      viewport: { width: 1280, height: 800 },
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--start-maximized'
      ]
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    const session: ActiveRecordingSession = {
      id: recordingId,
      url: cleanUrl,
      profileId,
      context,
      page,
      actions: [],
      isStopped: false
    };

    this.activeSessions.set(recordingId, session);

    // Initial navigation action
    const initAction: RecordedAction = {
      id: `act_${uuidv4().substring(0, 8)}`,
      type: 'browser_open_url',
      title: `Open ${cleanUrl}`,
      timestamp: Date.now(),
      data: {
        type: 'browser_open_url',
        label: `Open ${new URL(cleanUrl).hostname}`,
        url: cleanUrl,
        timeout: 30000,
        waitUntil: 'domcontentloaded'
      }
    };
    session.actions.push(initAction);

    // Inject recording hooks into page and any newly opened pages
    await this.setupPageListeners(session, page);
    context.on('page', (newPage) => {
      this.setupPageListeners(session, newPage).catch(console.error);
    });

    await page.goto(cleanUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});

    wsManager.broadcastToRecording(recordingId, 'RECORDING_STARTED', {
      recordingId,
      initialUrl: cleanUrl,
      actions: session.actions
    });

    return { recordingId };
  }

  private async setupPageListeners(session: ActiveRecordingSession, page: Page) {
    // Expose binding to receive recorded events from browser page
    await page.exposeFunction('__flowpilot_emit_action__', (rawAction: any) => {
      if (session.isStopped) return;

      const actionId = `act_${uuidv4().substring(0, 8)}`;
      let actionType = 'interaction_click';
      let title = 'Click Element';
      let nodeData: any = {};

      if (rawAction.eventType === 'click') {
        actionType = 'interaction_click';
        title = `Click ${rawAction.elementDescription || 'Element'}`;
        nodeData = {
          type: 'interaction_click',
          label: title,
          selector: rawAction.selector,
          timeout: 8000
        };
      } else if (rawAction.eventType === 'input' || rawAction.eventType === 'change') {
        if (rawAction.tagName === 'SELECT') {
          actionType = 'form_dropdown';
          title = `Select "${rawAction.value}"`;
          nodeData = {
            type: 'form_dropdown',
            label: title,
            value: rawAction.value,
            selector: rawAction.selector
          };
        } else if (rawAction.inputType === 'checkbox' || rawAction.inputType === 'radio') {
          actionType = 'form_checkbox';
          title = `${rawAction.checked ? 'Check' : 'Uncheck'} ${rawAction.elementDescription || 'box'}`;
          nodeData = {
            type: 'form_checkbox',
            label: title,
            checked: rawAction.checked,
            selector: rawAction.selector
          };
        } else if (rawAction.inputType === 'password') {
          actionType = 'form_password';
          title = 'Enter Password';
          nodeData = {
            type: 'form_password',
            label: title,
            password: rawAction.value,
            selector: rawAction.selector
          };
        } else {
          actionType = 'interaction_type_text';
          title = `Type "${rawAction.value.length > 20 ? rawAction.value.substring(0, 20) + '...' : rawAction.value}"`;
          nodeData = {
            type: 'interaction_type_text',
            label: title,
            text: rawAction.value,
            clearFirst: true,
            selector: rawAction.selector
          };
        }
      }

      const recorded: RecordedAction = {
        id: actionId,
        type: actionType,
        title,
        timestamp: Date.now(),
        data: nodeData
      };

      session.actions.push(recorded);
      wsManager.broadcastToRecording(session.id, 'RECORDED_ACTION', recorded);
    }).catch(() => {});

    // Inject client-side event listener script
    await page.addInitScript(() => {
      // Helper to extract resilient multi-strategy selector
      function getElementStrategies(el: HTMLElement) {
        const strategies: any = {};
        const testId = el.getAttribute('data-testid') || el.getAttribute('data-test') || el.getAttribute('data-qa');
        if (testId) strategies.testId = testId;

        const role = el.getAttribute('role') || (el.tagName === 'BUTTON' ? 'button' : el.tagName === 'A' ? 'link' : undefined);
        if (role) {
          strategies.role = role;
          const ariaLabel = el.getAttribute('aria-label') || el.innerText?.trim();
          if (ariaLabel) strategies.roleName = ariaLabel.substring(0, 30);
        }

        const label = el.getAttribute('aria-label') || (el as any).labels?.[0]?.innerText?.trim();
        if (label) strategies.label = label;

        const placeholder = el.getAttribute('placeholder');
        if (placeholder) strategies.placeholder = placeholder;

        if (el.innerText && el.innerText.trim().length > 0 && el.innerText.trim().length < 40) {
          strategies.text = el.innerText.trim();
        }

        // CSS fallback
        if (el.id) {
          strategies.css = `#${el.id}`;
        } else if (el.className && typeof el.className === 'string') {
          const classes = el.className.split(' ').filter(c => c && !c.includes(':') && !c.includes('/')).slice(0, 2).join('.');
          if (classes) strategies.css = `${el.tagName.toLowerCase()}.${classes}`;
        }

        return strategies;
      }

      function describeElement(el: HTMLElement): string {
        const text = el.innerText?.trim() || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.getAttribute('name') || el.id || el.tagName.toLowerCase();
        return text.length > 25 ? text.substring(0, 25) + '...' : text;
      }

      document.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (!target) return;
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).type !== 'submit' && (target as HTMLInputElement).type !== 'button') {
          return; // Ignore clicking into input boxes, will be captured on change/blur
        }
        const selector = getElementStrategies(target);
        (window as any).__flowpilot_emit_action__?.({
          eventType: 'click',
          tagName: target.tagName,
          elementDescription: describeElement(target),
          selector
        });
      }, true);

      document.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement | HTMLSelectElement;
        if (!target) return;
        const selector = getElementStrategies(target);
        (window as any).__flowpilot_emit_action__?.({
          eventType: 'change',
          tagName: target.tagName,
          inputType: (target as HTMLInputElement).type || 'text',
          value: target.value || '',
          checked: (target as HTMLInputElement).checked,
          elementDescription: describeElement(target),
          selector
        });
      }, true);
    });
  }

  public async stopRecording(recordingId: string): Promise<{ nodes: any[]; edges: any[] }> {
    const session = this.activeSessions.get(recordingId);
    if (!session) {
      throw new Error(`Recording session ${recordingId} not found`);
    }

    session.isStopped = true;
    try {
      await session.context.close();
    } catch {}

    this.activeSessions.delete(recordingId);

    // Convert recorded actions to React Flow nodes and edges
    const nodes: any[] = [];
    const edges: any[] = [];

    // Add manual trigger node at start
    const triggerId = 'node_trigger';
    nodes.push({
      id: triggerId,
      type: 'trigger_manual',
      position: { x: 250, y: 50 },
      data: {
        label: 'Manual Trigger',
        type: 'trigger_manual',
        description: 'Starts workflow on click'
      }
    });

    let prevNodeId = triggerId;
    let currentY = 180;

    session.actions.forEach((act, idx) => {
      const nodeId = `node_rec_${idx + 1}`;
      nodes.push({
        id: nodeId,
        type: act.type,
        position: { x: 250, y: currentY },
        data: {
          ...act.data,
          id: nodeId,
          title: act.title,
          label: act.title
        }
      });

      edges.push({
        id: `edge_${prevNodeId}_to_${nodeId}`,
        source: prevNodeId,
        target: nodeId,
        animated: true
      });

      prevNodeId = nodeId;
      currentY += 130;
    });

    return { nodes, edges };
  }
}

export const recorderService = new RecorderService();

import test from 'node:test';
import assert from 'node:assert';
import http from 'http';
import { db, initDatabase } from '../dist/server/db/database.js';
import { encrypt, decrypt } from '../dist/server/services/cryptoService.js';
import { VariableEngine } from '../dist/server/services/engine/variableEngine.js';
import { credentialService } from '../dist/server/services/credentialService.js';
import { schedulerService } from '../dist/server/services/schedulerService.js';
import { workflowEngine } from '../dist/server/services/engine/workflowEngine.js';

test('FlowPilot Core System Verification', async (t) => {
  initDatabase();

  await t.test('1. AES-256-GCM Credential Encryption & Decryption', () => {
    const rawSecret = 'super_secret_password_123!';
    const encrypted = encrypt(rawSecret);
    assert.notStrictEqual(encrypted, rawSecret);
    assert.ok(encrypted.includes(':'));

    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, rawSecret);

    // Test Credential Service
    const cred = credentialService.create({
      name: 'Test Secure Login',
      type: 'login',
      username_or_key: 'admin@flowpilot.dev',
      secret: rawSecret
    });

    assert.strictEqual(cred.name, 'Test Secure Login');
    assert.strictEqual(cred.masked_secret, '••••••••••••');

    const internal = credentialService.getDecryptedCredential(cred.id);
    assert.strictEqual(internal?.secret, rawSecret);
    assert.strictEqual(internal?.username_or_key, 'admin@flowpilot.dev');
  });

  await t.test('2. Variable Engine Token Resolution & Logic Conditions', () => {
    const contextVars = {
      user: { name: 'Alice', role: 'admin' },
      counter: 42
    };

    const resolved = VariableEngine.resolve('Hello {{user.name}}, your count is {{counter}}', contextVars);
    assert.strictEqual(resolved, 'Hello Alice, your count is 42');

    const builtInResolved = VariableEngine.resolve('Token: {{$today}}', {});
    assert.ok(builtInResolved.startsWith('Token: 20'));

    // Condition evaluation
    assert.strictEqual(VariableEngine.evaluateCondition('equals', 'active', 'active'), true);
    assert.strictEqual(VariableEngine.evaluateCondition('equals', 'active', 'inactive'), false);
    assert.strictEqual(VariableEngine.evaluateCondition('contains', 'FlowPilot Automation', 'pilot'), true);
    assert.strictEqual(VariableEngine.evaluateCondition('greaterThan', '10', '5'), true);
  });

  await t.test('3. Persistent Scheduler Engine', () => {
    schedulerService.init();
    const schedules = schedulerService.list();
    assert.ok(Array.isArray(schedules));
  });

  await t.test('4. End-to-End Real Playwright Browser Workflow Execution', async () => {
    // Insert a real test workflow
    const wfId = 'wf_test_e2e';
    const now = new Date().toISOString();

    const nodes = [
      {
        id: 'node_trigger',
        type: 'trigger_manual',
        data: { label: 'Manual Trigger' }
      },
      {
        id: 'node_open',
        type: 'browser_open_url',
        data: { label: 'Open Target', url: 'https://news.ycombinator.com', waitUntil: 'domcontentloaded' }
      },
      {
        id: 'node_extract',
        type: 'data_extract_text',
        data: { label: 'Extract Title', variableName: 'siteTitle', selector: { css: '.hnname > a' } }
      }
    ];

    const edges = [
      { id: 'e1-2', source: 'node_trigger', target: 'node_open' },
      { id: 'e2-3', source: 'node_open', target: 'node_extract' }
    ];

    db.prepare(`
      INSERT OR REPLACE INTO workflows (id, name, description, trigger_type, nodes_json, edges_json, variables_json, is_active, tags, created_at, updated_at)
      VALUES (?, 'E2E HackerNews Scraper', 'Tests real browser engine execution', 'manual', ?, ?, '{}', 1, '["Test"]', ?, ?)
    `).run(wfId, JSON.stringify(nodes), JSON.stringify(edges), now, now);

    // Execute workflow in headless Playwright
    const execId = await workflowEngine.executeWorkflow({
      workflowId: wfId,
      trigger: 'automated_test',
      headless: true,
      slowMo: 0
    });

    assert.ok(execId.startsWith('exec_'));

    // Wait for execution to complete in background
    let completed = false;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const row = db.prepare(`SELECT * FROM executions WHERE id = ?`).get(execId);
      if (row && (row.status === 'SUCCESS' || row.status === 'FAILED')) {
        completed = true;
        assert.strictEqual(row.status, 'SUCCESS', `Execution failed with error: ${row.error_message}`);
        const logs = JSON.parse(row.logs_json || '[]');
        assert.ok(logs.length > 0, 'Should have recorded execution logs');
        console.log(`✓ E2E Playwright Run Success in ${row.duration_ms}ms with ${logs.length} logs recorded.`);
        break;
      }
    }
    assert.ok(completed, 'Execution should finish within timeout');
  });
});

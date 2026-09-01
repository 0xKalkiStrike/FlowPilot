import { Router } from 'express';
import { db } from '../db/database.js';
import { workflowEngine } from '../services/engine/workflowEngine.js';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export const workflowRouter = Router();

const WorkflowSchema = z.object({
  name: z.string().min(1, 'Workflow name is required'),
  description: z.string().optional().default(''),
  trigger_type: z.string().optional().default('manual'),
  nodes: z.array(z.any()).default([]),
  edges: z.array(z.any()).default([]),
  variables: z.record(z.any()).default({}),
  tags: z.array(z.string()).default([])
});

// GET /api/workflows - List all workflows
workflowRouter.get('/', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM workflows ORDER BY updated_at DESC`).all() as any[];
    const workflows = rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      trigger_type: r.trigger_type,
      nodes: JSON.parse(r.nodes_json || '[]'),
      edges: JSON.parse(r.edges_json || '[]'),
      variables: JSON.parse(r.variables_json || '{}'),
      is_active: Boolean(r.is_active),
      tags: JSON.parse(r.tags || '[]'),
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
    res.json({ success: true, data: workflows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/workflows/:id - Get workflow by ID
workflowRouter.get('/:id', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM workflows WHERE id = ?`).get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    res.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        description: row.description,
        trigger_type: row.trigger_type,
        nodes: JSON.parse(row.nodes_json || '[]'),
        edges: JSON.parse(row.edges_json || '[]'),
        variables: JSON.parse(row.variables_json || '{}'),
        is_active: Boolean(row.is_active),
        tags: JSON.parse(row.tags || '[]'),
        created_at: row.created_at,
        updated_at: row.updated_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workflows - Create workflow
workflowRouter.post('/', (req, res) => {
  try {
    const parsed = WorkflowSchema.parse(req.body);
    const id = `wf_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO workflows (id, name, description, trigger_type, nodes_json, edges_json, variables_json, is_active, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(
      id,
      parsed.name,
      parsed.description,
      parsed.trigger_type,
      JSON.stringify(parsed.nodes),
      JSON.stringify(parsed.edges),
      JSON.stringify(parsed.variables),
      JSON.stringify(parsed.tags),
      now,
      now
    );

    res.status(201).json({ success: true, data: { id, ...parsed, is_active: true, created_at: now, updated_at: now } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/workflows/:id - Update workflow
workflowRouter.put('/:id', (req, res) => {
  try {
    const existing = db.prepare(`SELECT * FROM workflows WHERE id = ?`).get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const parsed = WorkflowSchema.partial().parse(req.body);
    const now = new Date().toISOString();

    const name = parsed.name !== undefined ? parsed.name : existing.name;
    const description = parsed.description !== undefined ? parsed.description : existing.description;
    const trigger_type = parsed.trigger_type !== undefined ? parsed.trigger_type : existing.trigger_type;
    const nodes_json = parsed.nodes !== undefined ? JSON.stringify(parsed.nodes) : existing.nodes_json;
    const edges_json = parsed.edges !== undefined ? JSON.stringify(parsed.edges) : existing.edges_json;
    const variables_json = parsed.variables !== undefined ? JSON.stringify(parsed.variables) : existing.variables_json;
    const tags = parsed.tags !== undefined ? JSON.stringify(parsed.tags) : existing.tags;

    // Create version snapshot
    const versionCount = (db.prepare(`SELECT COUNT(*) as count FROM workflow_versions WHERE workflow_id = ?`).get(req.params.id) as any).count || 0;
    db.prepare(`
      INSERT INTO workflow_versions (id, workflow_id, version_num, snapshot_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(`ver_${uuidv4().substring(0, 8)}`, req.params.id, versionCount + 1, JSON.stringify(existing), now);

    db.prepare(`
      UPDATE workflows
      SET name = ?, description = ?, trigger_type = ?, nodes_json = ?, edges_json = ?, variables_json = ?, tags = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description, trigger_type, nodes_json, edges_json, variables_json, tags, now, req.params.id);

    res.json({
      success: true,
      data: {
        id: req.params.id,
        name,
        description,
        trigger_type,
        nodes: JSON.parse(nodes_json),
        edges: JSON.parse(edges_json),
        variables: JSON.parse(variables_json),
        tags: JSON.parse(tags),
        updated_at: now
      }
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/workflows/:id - Delete workflow
workflowRouter.delete('/:id', (req, res) => {
  try {
    const result = db.prepare(`DELETE FROM workflows WHERE id = ?`).run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }
    res.json({ success: true, message: 'Workflow deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workflows/:id/duplicate - Duplicate workflow
workflowRouter.post('/:id/duplicate', (req, res) => {
  try {
    const existing = db.prepare(`SELECT * FROM workflows WHERE id = ?`).get(req.params.id) as any;
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const id = `wf_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const newName = `${existing.name} (Copy)`;

    db.prepare(`
      INSERT INTO workflows (id, name, description, trigger_type, nodes_json, edges_json, variables_json, is_active, tags, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `).run(id, newName, existing.description, existing.trigger_type, existing.nodes_json, existing.edges_json, existing.variables_json, existing.tags, now, now);

    res.status(201).json({ success: true, data: { id, name: newName } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workflows/import - Import workflow JSON
workflowRouter.post('/import', (req, res) => {
  try {
    const body = req.body;
    const name = body.name || 'Imported Workflow';
    const description = body.description || 'Imported via FlowPilot JSON';
    const nodes = Array.isArray(body.nodes) ? body.nodes : [];
    const edges = Array.isArray(body.edges) ? body.edges : [];
    const variables = body.variables || {};

    const id = `wf_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO workflows (id, name, description, trigger_type, nodes_json, edges_json, variables_json, is_active, tags, created_at, updated_at)
      VALUES (?, ?, ?, 'manual', ?, ?, ?, 1, '["Imported"]', ?, ?)
    `).run(id, name, description, JSON.stringify(nodes), JSON.stringify(edges), JSON.stringify(variables), now, now);

    res.status(201).json({ success: true, data: { id, name, nodes, edges, variables } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /api/workflows/:id/export - Export workflow JSON
workflowRouter.get('/:id/export', (req, res) => {
  try {
    const row = db.prepare(`SELECT * FROM workflows WHERE id = ?`).get(req.params.id) as any;
    if (!row) {
      return res.status(404).json({ success: false, error: 'Workflow not found' });
    }

    const exportPayload = {
      schemaVersion: '1.0',
      generator: 'FlowPilot Visual Automation Platform',
      exportedAt: new Date().toISOString(),
      id: row.id,
      name: row.name,
      description: row.description,
      trigger_type: row.trigger_type,
      nodes: JSON.parse(row.nodes_json || '[]'),
      edges: JSON.parse(row.edges_json || '[]'),
      variables: JSON.parse(row.variables_json || '{}'),
      tags: JSON.parse(row.tags || '[]')
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${row.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_flowpilot.json"`);
    res.json(exportPayload);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/workflows/test-node - Execute a single node in real-time
workflowRouter.post('/test-node', async (req, res) => {
  try {
    const { nodeType, nodeData, variables } = req.body;
    if (!nodeType) {
      return res.status(400).json({ success: false, error: 'nodeType is required' });
    }

    const result = await workflowEngine.testSingleNode(nodeType, nodeData || {}, variables || {});
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


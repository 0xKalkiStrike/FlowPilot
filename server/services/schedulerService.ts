import cron from 'node-cron';
import { db } from '../db/database.js';
import { workflowEngine } from './engine/workflowEngine.js';
import { v4 as uuidv4 } from 'uuid';

export interface ScheduleRecord {
  id: string;
  workflow_id: string;
  name: string;
  cron_expression: string;
  frequency: string;
  time: string;
  timezone: string;
  is_enabled: number;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SchedulerService {
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();

  public init() {
    console.log('Initializing persistent scheduler...');
    const schedules = db.prepare(`SELECT * FROM schedules WHERE is_enabled = 1`).all() as ScheduleRecord[];
    for (const sch of schedules) {
      this.registerCronJob(sch);
    }
    console.log(`✓ Loaded ${schedules.length} active schedule(s) from database`);
  }

  public list(): ScheduleRecord[] {
    return db.prepare(`
      SELECT s.*, w.name as workflow_name
      FROM schedules s
      LEFT JOIN workflows w ON s.workflow_id = w.id
      ORDER BY s.created_at DESC
    `).all() as ScheduleRecord[];
  }

  public create(data: {
    workflow_id: string;
    name: string;
    cron_expression?: string;
    frequency?: string;
    time?: string;
    timezone?: string;
  }): ScheduleRecord {
    const id = `sch_${uuidv4().substring(0, 8)}`;
    const now = new Date().toISOString();
    const frequency = data.frequency || 'daily';
    const time = data.time || '09:00';
    const timezone = data.timezone || 'UTC';

    let cronExp = data.cron_expression;
    if (!cronExp) {
      const [hour, minute] = time.split(':');
      if (frequency === 'daily') {
        cronExp = `${minute || 0} ${hour || 9} * * *`;
      } else if (frequency === 'weekly') {
        cronExp = `${minute || 0} ${hour || 9} * * 1`; // Mondays
      } else if (frequency === 'hourly') {
        cronExp = `0 * * * *`;
      } else {
        cronExp = `0 9 * * *`;
      }
    }

    db.prepare(`
      INSERT INTO schedules (id, workflow_id, name, cron_expression, frequency, time, timezone, is_enabled, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(id, data.workflow_id, data.name, cronExp, frequency, time, timezone, now, now);

    const record = db.prepare(`SELECT * FROM schedules WHERE id = ?`).get(id) as ScheduleRecord;
    this.registerCronJob(record);
    return record;
  }

  public toggleActive(id: string, is_enabled: boolean): ScheduleRecord | null {
    const existing = db.prepare(`SELECT * FROM schedules WHERE id = ?`).get(id) as ScheduleRecord | undefined;
    if (!existing) return null;

    const now = new Date().toISOString();
    db.prepare(`UPDATE schedules SET is_enabled = ?, updated_at = ? WHERE id = ?`).run(is_enabled ? 1 : 0, now, id);

    if (is_enabled) {
      this.registerCronJob({ ...existing, is_enabled: 1 });
    } else {
      this.unregisterCronJob(id);
    }

    return db.prepare(`SELECT * FROM schedules WHERE id = ?`).get(id) as ScheduleRecord;
  }

  public delete(id: string): boolean {
    this.unregisterCronJob(id);
    const res = db.prepare(`DELETE FROM schedules WHERE id = ?`).run(id);
    return res.changes > 0;
  }

  public async triggerNow(id: string): Promise<string> {
    const sch = db.prepare(`SELECT * FROM schedules WHERE id = ?`).get(id) as ScheduleRecord | undefined;
    if (!sch) throw new Error('Schedule not found');

    const execId = await workflowEngine.executeWorkflow({
      workflowId: sch.workflow_id,
      trigger: 'schedule_manual'
    });

    const now = new Date().toISOString();
    db.prepare(`UPDATE schedules SET last_run_at = ? WHERE id = ?`).run(now, id);
    return execId;
  }

  private registerCronJob(sch: ScheduleRecord) {
    this.unregisterCronJob(sch.id);
    if (!cron.validate(sch.cron_expression)) {
      console.warn(`Invalid cron expression for schedule ${sch.id}: ${sch.cron_expression}`);
      return;
    }

    try {
      const task = cron.schedule(sch.cron_expression, async () => {
        console.log(`⏰ Triggering scheduled workflow ${sch.workflow_id} (${sch.name})`);
        try {
          await workflowEngine.executeWorkflow({
            workflowId: sch.workflow_id,
            trigger: 'schedule'
          });
          const now = new Date().toISOString();
          db.prepare(`UPDATE schedules SET last_run_at = ? WHERE id = ?`).run(now, sch.id);
        } catch (err) {
          console.error(`Scheduled run error:`, err);
        }
      });
      this.activeJobs.set(sch.id, task);
    } catch (err) {
      console.error(`Failed to schedule cron job ${sch.id}:`, err);
    }
  }

  private unregisterCronJob(id: string) {
    const existing = this.activeJobs.get(id);
    if (existing) {
      existing.stop();
      this.activeJobs.delete(id);
    }
  }
}

export const schedulerService = new SchedulerService();

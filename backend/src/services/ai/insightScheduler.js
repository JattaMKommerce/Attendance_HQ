/**
 * Proactive HR Insight Scheduler (Phase 3C)
 *
 * Runs scheduled detection cycles across active organizations safely.
 *
 * Guarantees:
 * - Uses existing MySQL connection pool
 * - Bounded queries (LIMIT 100 on active organizations)
 * - Atomic concurrency guard (isRunning flag prevents overlapping executions)
 * - Tenant isolation (each organization is processed in an isolated try-catch)
 * - Safe error logging and non-crashing execution
 * - Clean start / stop API
 */

const db = require('../../config/db');
const insightDetectionService = require('./insightDetectionService');

class InsightScheduler {
  constructor() {
    this.isRunning = false;
    this.intervalHandle = null;
    // Default: Run every 30 minutes in production, or override via env
    this.intervalMs = parseInt(process.env.INSIGHT_DETECTION_INTERVAL_MS, 10) || (30 * 60 * 1000);
  }

  /**
   * Run a single detection cycle across all active organizations
   */
  async runCycle(options = {}) {
    if (this.isRunning) {
      console.warn('[InsightScheduler] Previous detection cycle is still executing locally. Skipping concurrent run.');
      return { skipped: true, reason: 'concurrency_lock' };
    }

    let lockConnection = null;
    let distributedLockAcquired = false;

    // Acquire MySQL distributed lock across multi-process or clustered environments
    try {
      lockConnection = await db.getConnection();
      const [lockRows] = await lockConnection.query(
        "SELECT GET_LOCK('hrms_insight_detection_lock', 0) AS acquired"
      );
      distributedLockAcquired = lockRows && lockRows[0] && lockRows[0].acquired === 1;

      if (!distributedLockAcquired) {
        console.warn('[InsightScheduler] Another process holds the MySQL distributed lock. Skipping concurrent run.');
        lockConnection.release();
        lockConnection = null;
        return { skipped: true, reason: 'concurrency_lock' };
      }
    } catch (lockErr) {
      console.error('[InsightScheduler] Error acquiring MySQL distributed lock:', lockErr.message);
      if (lockConnection) {
        lockConnection.release();
        lockConnection = null;
      }
      // If DB error during lock acquisition, avoid running to prevent collisions
      return { skipped: true, reason: 'lock_error', error: lockErr.message };
    }

    this.isRunning = true;
    const startTime = Date.now();
    const cycleResults = {
      started_at: new Date().toISOString(),
      organizations_processed: 0,
      total_created: 0,
      errors: []
    };

    try {
      // 1. Fetch active organizations using a bounded query
      const targetOrgId = options.organizationId || null;
      let orgs = [];

      if (targetOrgId) {
        const [targetRows] = await db.query(
          `SELECT id, name FROM organizations 
           WHERE id = ? AND deleted_at IS NULL 
           LIMIT 1`,
          [targetOrgId]
        );
        orgs = targetRows;
      } else {
        const [activeRows] = await db.query(
          `SELECT id, name FROM organizations 
           WHERE (status = 'active' OR status IS NULL) 
             AND deleted_at IS NULL 
           ORDER BY id ASC 
           LIMIT 100`
        );
        orgs = activeRows;
      }

      // 2. Process each organization with strict tenant error isolation
      for (const org of orgs) {
        try {
          const res = await insightDetectionService.runDetectionForOrganization(org.id);
          cycleResults.organizations_processed++;
          cycleResults.total_created += res.created;
        } catch (orgErr) {
          console.error(`[InsightScheduler] Error processing organization ${org.id} (${org.name}):`, orgErr.message);
          cycleResults.errors.push({
            organization_id: org.id,
            error: orgErr.message
          });
        }
      }

      const durationMs = Date.now() - startTime;
      console.log(`[InsightScheduler] Completed cycle in ${durationMs}ms. Orgs: ${cycleResults.organizations_processed}, New Insights: ${cycleResults.total_created}`);
    } catch (cycleErr) {
      console.error('[InsightScheduler] Fatal error in detection cycle:', cycleErr);
      cycleResults.errors.push({ error: cycleErr.message });
    } finally {
      this.isRunning = false;

      // Safely release the MySQL distributed lock
      if (lockConnection && distributedLockAcquired) {
        try {
          await lockConnection.query("SELECT RELEASE_LOCK('hrms_insight_detection_lock')");
        } catch (relErr) {
          console.error('[InsightScheduler] Error releasing MySQL distributed lock:', relErr.message);
        } finally {
          try {
            lockConnection.release();
          } catch (e) {
            // connection release fallback
          }
          lockConnection = null;
        }
      }
    }

    return cycleResults;
  }

  /**
   * Start the recurring scheduler
   */
  startScheduler() {
    if (this.intervalHandle) {
      console.log('[InsightScheduler] Scheduler already active.');
      return;
    }

    console.log(`[InsightScheduler] Starting insight detection scheduler (interval: ${this.intervalMs}ms)`);
    
    // Schedule recurring runs
    this.intervalHandle = setInterval(() => {
      this.runCycle().catch(err => {
        console.error('[InsightScheduler] Uncaught error in scheduled runCycle:', err);
      });
    }, this.intervalMs);

    // Run initial detection pass after 10 seconds of startup
    setTimeout(() => {
      this.runCycle().catch(err => {
        console.error('[InsightScheduler] Initial runCycle error:', err);
      });
    }, 10000);
  }

  /**
   * Stop the recurring scheduler (useful for testing or shutdown)
   */
  stopScheduler() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[InsightScheduler] Scheduler stopped.');
    }
  }
}

module.exports = new InsightScheduler();

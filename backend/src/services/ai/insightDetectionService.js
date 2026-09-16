/**
 * Proactive HR Insight Detection Service (Phase 3C)
 *
 * CRITICAL ARCHITECTURAL RULE:
 * The LLM must NEVER independently decide that an HR event happened.
 * Database queries and deterministic rules determine the facts.
 * Severity (INFO, WARNING, CRITICAL) is derived solely from business rules.
 *
 * Deduplication:
 * Deterministic dedup_key prevents duplicate rows for the same underlying event.
 * Dismissed insights are remembered and NEVER unexpectedly reappear.
 */

const db = require('../../config/db');

class InsightDetectionService {
  /**
   * Helper: compute ISO week string, e.g. "2026-W37"
   */
  getIsoWeekString(date = new Date()) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  }

  /**
   * Helper: compute YYYY-MM string
   */
  getMonthString(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  /**
   * Deterministically save or skip a detected insight.
   * Handles deduplication and preserves dismissed state.
   */
  async saveInsight(candidate) {
    const {
      organization_id,
      type,
      severity,
      target_entity_type,
      target_entity_id,
      department_id = null,
      title,
      summary,
      detailed_explanation,
      supporting_data,
      dedup_key
    } = candidate;

    if (!organization_id || !type || !dedup_key) {
      throw new Error('Missing required insight fields (organization_id, type, dedup_key)');
    }

    // Check if an insight with this dedup_key already exists for this tenant
    const [existing] = await db.query(
      `SELECT id, status, severity, dismissed_at, supporting_data 
       FROM ai_insights 
       WHERE organization_id = ? AND dedup_key = ?`,
      [organization_id, dedup_key]
    );

    if (existing.length > 0) {
      const current = existing[0];
      // Rule: Dismissed insights cannot unexpectedly reappear
      if (current.status === 'dismissed' || current.dismissed_at) {
        return {
          action: 'skipped_dismissed',
          id: current.id,
          message: 'Insight previously dismissed by user; will not reappear.'
        };
      }

      // Rule: Running detector again creates no duplicate insight unless materially changed
      return {
        action: 'skipped_duplicate',
        id: current.id,
        message: 'Insight already tracked.'
      };
    }

    // Insert new verified insight
    const [result] = await db.query(
      `INSERT INTO ai_insights (
        organization_id, insight_type, severity, 
        target_entity_type, target_entity_id, department_id,
        title, summary, detailed_explanation, supporting_data, 
        dedup_key, status, detected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unread', NOW())`,
      [
        organization_id,
        type,
        severity,
        target_entity_type,
        target_entity_id,
        department_id,
        title,
        summary,
        detailed_explanation,
        JSON.stringify(supporting_data || {}),
        dedup_key
      ]
    );

    return {
      action: 'created',
      id: result.insertId,
      title
    };
  }

  // ==========================================
  // 1. CONSECUTIVE_ABSENCE
  // Trigger when an employee has >= 3 consecutive absent working days.
  // ==========================================
  async detectConsecutiveAbsence(organizationId) {
    const candidates = [];
    const [records] = await db.query(
      `SELECT ar.employee_id, ar.date, ar.status, 
              e.first_name, e.last_name, e.department_id, 
              d.name AS department_name
       FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE ar.organization_id = ? 
         AND e.status IN ('active', 'probation')
         AND ar.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
       ORDER BY ar.employee_id ASC, ar.date ASC`,
      [organizationId]
    );

    // Group records by employee
    const empMap = new Map();
    for (const r of records) {
      if (!empMap.has(r.employee_id)) {
        empMap.set(r.employee_id, {
          id: r.employee_id,
          name: `${r.first_name} ${r.last_name}`,
          department_id: r.department_id,
          department_name: r.department_name,
          dates: []
        });
      }
      empMap.get(r.employee_id).dates.push(r);
    }

    for (const emp of empMap.values()) {
      let streak = 0;
      let streakStart = null;
      let streakEnd = null;

      for (const rec of emp.dates) {
        // Skip scheduled weekends/holidays so they don't break attendance streak
        if (rec.status === 'weekend' || rec.status === 'holiday') {
          continue;
        }

        if (rec.status === 'absent') {
          if (streak === 0) {
            streakStart = rec.date;
          }
          streak++;
          streakEnd = rec.date;
        } else {
          // If a streak of >= 3 was active before today's record, evaluate it
          if (streak >= 3) {
            const severity = streak >= 5 ? 'CRITICAL' : 'WARNING';
            const sDateStr = streakStart ? new Date(streakStart).toISOString().slice(0, 10) : '';
            const eDateStr = streakEnd ? new Date(streakEnd).toISOString().slice(0, 10) : '';
            candidates.push({
              organization_id: organizationId,
              type: 'CONSECUTIVE_ABSENCE',
              severity,
              target_entity_type: 'employee',
              target_entity_id: emp.id,
              department_id: emp.department_id,
              title: `Consecutive Absences: ${emp.name}`,
              summary: `${emp.name} has been absent for ${streak} consecutive working days (${sDateStr} to ${eDateStr}).`,
              detailed_explanation: `Deterministic HR rule: Employee ${emp.name} was absent for ${streak} consecutive working days from ${sDateStr} to ${eDateStr}, exceeding the 3-day policy threshold.`,
              supporting_data: {
                type: 'CONSECUTIVE_ABSENCE',
                employee_id: emp.id,
                employee_name: emp.name,
                department_id: emp.department_id,
                department_name: emp.department_name,
                consecutive_days: streak,
                start_date: sDateStr,
                end_date: eDateStr
              },
              dedup_key: `CONSECUTIVE_ABSENCE:${organizationId}:${emp.id}:${eDateStr}`
            });
          }
          streak = 0;
          streakStart = null;
          streakEnd = null;
        }
      }

      // Check remaining trailing streak
      if (streak >= 3) {
        const severity = streak >= 5 ? 'CRITICAL' : 'WARNING';
        const sDateStr = streakStart ? new Date(streakStart).toISOString().slice(0, 10) : '';
        const eDateStr = streakEnd ? new Date(streakEnd).toISOString().slice(0, 10) : '';
        candidates.push({
          organization_id: organizationId,
          type: 'CONSECUTIVE_ABSENCE',
          severity,
          target_entity_type: 'employee',
          target_entity_id: emp.id,
          department_id: emp.department_id,
          title: `Consecutive Absences: ${emp.name}`,
          summary: `${emp.name} has been absent for ${streak} consecutive working days (${sDateStr} to ${eDateStr}).`,
          detailed_explanation: `Deterministic HR rule: Employee ${emp.name} was absent for ${streak} consecutive working days from ${sDateStr} to ${eDateStr}, exceeding the 3-day policy threshold.`,
          supporting_data: {
            type: 'CONSECUTIVE_ABSENCE',
            employee_id: emp.id,
            employee_name: emp.name,
            department_id: emp.department_id,
            department_name: emp.department_name,
            consecutive_days: streak,
            start_date: sDateStr,
            end_date: eDateStr
          },
          dedup_key: `CONSECUTIVE_ABSENCE:${organizationId}:${emp.id}:${eDateStr}`
        });
      }
    }

    return candidates;
  }

  // ==========================================
  // 2. HIGH_ABSENTEEISM
  // Trigger when department absenteeism exceeds threshold (default 15%).
  // ==========================================
  async detectHighAbsenteeism(organizationId, threshold = 15) {
    const candidates = [];
    const currentMonth = this.getMonthString();

    const [rows] = await db.query(
      `SELECT e.department_id, d.name AS department_name,
              COUNT(*) AS total_records,
              SUM(CASE WHEN ar.status = 'absent' THEN 1 ELSE 0 END) AS absent_count
       FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       JOIN departments d ON e.department_id = d.id
       WHERE ar.organization_id = ?
         AND ar.date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
         AND ar.status NOT IN ('weekend', 'holiday')
       GROUP BY e.department_id, d.name
       HAVING total_records >= 5`,
      [organizationId]
    );

    for (const row of rows) {
      const total = Number(row.total_records) || 0;
      const absent = Number(row.absent_count) || 0;
      const rate = total > 0 ? Math.round((absent / total) * 100) : 0;

      if (rate >= threshold) {
        const severity = rate >= 25 ? 'CRITICAL' : 'WARNING';
        candidates.push({
          organization_id: organizationId,
          type: 'HIGH_ABSENTEEISM',
          severity,
          target_entity_type: 'department',
          target_entity_id: row.department_id,
          department_id: row.department_id,
          title: `High Absenteeism in ${row.department_name} (${rate}%)`,
          summary: `${row.department_name} department recorded ${rate}% absenteeism this month (${absent} absences out of ${total} shifts).`,
          detailed_explanation: `Deterministic HR rule: The absenteeism rate in ${row.department_name} reached ${rate}%, exceeding the configured alert threshold of ${threshold}%.`,
          supporting_data: {
            type: 'HIGH_ABSENTEEISM',
            department_id: row.department_id,
            department_name: row.department_name,
            absenteeism_rate: rate,
            absent_count: absent,
            total_records: total,
            period: currentMonth
          },
          dedup_key: `HIGH_ABSENTEEISM:${organizationId}:${row.department_id}:${currentMonth}`
        });
      }
    }

    return candidates;
  }

  // ==========================================
  // 3. LEAVE_UTILIZATION
  // Trigger when employee or department leave utilization exceeds threshold (e.g. 80% employee, 75% dept).
  // ==========================================
  async detectLeaveUtilization(organizationId, empThreshold = 80, deptThreshold = 75) {
    const candidates = [];
    const currentYear = new Date().getFullYear();

    // 3a. Employee level (checks individual leave categories and employee utilization)
    const [empRows] = await db.query(
      `SELECT lb.employee_id, lb.leave_type_id, lt.name AS leave_type_name,
              e.first_name, e.last_name, e.department_id, d.name AS department_name,
              lb.allocated, lb.carried_forward, lb.used
       FROM leave_balances lb
       JOIN employees e ON lb.employee_id = e.id
       LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE lb.organization_id = ? 
         AND lb.year = ?
         AND e.status IN ('active', 'probation')`,
      [organizationId, currentYear]
    );

    for (const row of empRows) {
      const allocated = (Number(row.allocated) || 0) + (Number(row.carried_forward) || 0);
      const used = Number(row.used) || 0;
      if (allocated > 0) {
        const rate = Math.round((used / allocated) * 100);
        if (rate >= empThreshold) {
          const severity = rate >= 95 ? 'CRITICAL' : 'WARNING';
          const empName = `${row.first_name} ${row.last_name}`;
          const leaveName = row.leave_type_name || 'Annual Leave';
          candidates.push({
            organization_id: organizationId,
            type: 'LEAVE_UTILIZATION',
            severity,
            target_entity_type: 'employee',
            target_entity_id: row.employee_id,
            department_id: row.department_id,
            title: `High Leave Utilization: ${empName} (${rate}%)`,
            summary: `${empName} has utilized ${rate}% of ${leaveName} balance (${used}/${allocated} days).`,
            detailed_explanation: `Deterministic HR rule: ${empName} has taken ${used} out of ${allocated} allocated ${leaveName} days in ${currentYear}, exceeding the ${empThreshold}% threshold.`,
            supporting_data: {
              type: 'LEAVE_UTILIZATION',
              entity_type: 'employee',
              employee_id: row.employee_id,
              employee_name: empName,
              leave_type_id: row.leave_type_id,
              leave_type_name: leaveName,
              department_id: row.department_id,
              department_name: row.department_name,
              allocated_days: allocated,
              used_days: used,
              utilization_rate: rate,
              year: currentYear
            },
            dedup_key: `LEAVE_UTILIZATION:${organizationId}:employee:${row.employee_id}:${row.leave_type_id || 'total'}:${currentYear}`
          });
        }
      }
    }


    // 3b. Department level
    const [deptRows] = await db.query(
      `SELECT e.department_id, d.name AS department_name,
              SUM(lb.allocated + lb.carried_forward) AS total_allocated,
              SUM(lb.used) AS total_used
       FROM leave_balances lb
       JOIN employees e ON lb.employee_id = e.id
       JOIN departments d ON e.department_id = d.id
       WHERE lb.organization_id = ? 
         AND lb.year = ?
         AND e.status IN ('active', 'probation')
       GROUP BY e.department_id, d.name
       HAVING total_allocated >= 10`,
      [organizationId, currentYear]
    );

    for (const row of deptRows) {
      const allocated = Number(row.total_allocated) || 0;
      const used = Number(row.total_used) || 0;
      if (allocated > 0) {
        const rate = Math.round((used / allocated) * 100);
        if (rate >= deptThreshold) {
          const severity = rate >= 90 ? 'CRITICAL' : 'WARNING';
          candidates.push({
            organization_id: organizationId,
            type: 'LEAVE_UTILIZATION',
            severity,
            target_entity_type: 'department',
            target_entity_id: row.department_id,
            department_id: row.department_id,
            title: `High Department Leave Utilization: ${row.department_name} (${rate}%)`,
            summary: `${row.department_name} department has consumed ${rate}% of aggregate annual leave pool (${used}/${allocated} days).`,
            detailed_explanation: `Deterministic HR rule: Aggregated leave usage across ${row.department_name} reached ${rate}% (${used}/${allocated} days), exceeding the department threshold of ${deptThreshold}%.`,
            supporting_data: {
              type: 'LEAVE_UTILIZATION',
              entity_type: 'department',
              department_id: row.department_id,
              department_name: row.department_name,
              allocated_days: allocated,
              used_days: used,
              utilization_rate: rate,
              year: currentYear
            },
            dedup_key: `LEAVE_UTILIZATION:${organizationId}:department:${row.department_id}:${currentYear}`
          });
        }
      }
    }

    return candidates;
  }

  // ==========================================
  // 4. ONBOARDING_OVERDUE
  // Trigger when onboarding tasks/documents remain incomplete beyond due date.
  // ==========================================
  async detectOnboardingOverdue(organizationId) {
    const candidates = [];
    const [rows] = await db.query(
      `SELECT t.id AS task_id, t.title AS task_title, t.due_date, t.task_type,
              o.id AS onboarding_id, o.employee_id, 
              e.first_name, e.last_name, e.department_id, 
              d.name AS department_name,
              DATEDIFF(CURDATE(), t.due_date) AS days_overdue
       FROM employee_onboarding_tasks t
       JOIN employee_onboarding o ON t.employee_onboarding_id = o.id
       JOIN employees e ON o.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE t.organization_id = ?
         AND t.status = 'pending'
         AND t.due_date < CURDATE()
       ORDER BY days_overdue DESC`,
      [organizationId]
    );

    for (const row of rows) {
      const days = Number(row.days_overdue) || 0;
      const severity = days > 7 ? 'CRITICAL' : 'WARNING';
      const empName = `${row.first_name} ${row.last_name}`;
      const dueDateStr = row.due_date ? new Date(row.due_date).toISOString().slice(0, 10) : '';

      candidates.push({
        organization_id: organizationId,
        type: 'ONBOARDING_OVERDUE',
        severity,
        target_entity_type: 'employee',
        target_entity_id: row.employee_id,
        department_id: row.department_id,
        title: `Overdue Onboarding Task: ${row.task_title}`,
        summary: `Task "${row.task_title}" for ${empName} is overdue by ${days} day(s) (due ${dueDateStr}).`,
        detailed_explanation: `Deterministic HR rule: Onboarding task "${row.task_title}" assigned to ${empName} was due on ${dueDateStr} and remains incomplete after ${days} days.`,
        supporting_data: {
          type: 'ONBOARDING_OVERDUE',
          task_id: row.task_id,
          task_title: row.task_title,
          employee_id: row.employee_id,
          employee_name: empName,
          department_id: row.department_id,
          department_name: row.department_name,
          due_date: dueDateStr,
          days_overdue: days
        },
        dedup_key: `ONBOARDING_OVERDUE:${organizationId}:${row.task_id}`
      });
    }

    return candidates;
  }

  // ==========================================
  // 5. MISSING_DOCUMENTS
  // Detect employees with required onboarding documents missing.
  // ==========================================
  async detectMissingDocuments(organizationId) {
    const candidates = [];
    const [rows] = await db.query(
      `SELECT e.id AS employee_id, e.first_name, e.last_name, e.employee_code, 
              e.joining_date, e.department_id, d.name AS department_name,
              e.resume_url,
              COUNT(doc.id) AS doc_count,
              DATEDIFF(CURDATE(), e.joining_date) AS days_since_joining
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       LEFT JOIN documents doc ON e.id = doc.employee_id AND doc.status = 'active'
       WHERE e.organization_id = ?
         AND e.status IN ('active', 'probation')
         AND e.joining_date <= DATE_SUB(CURDATE(), INTERVAL 3 DAY)
       GROUP BY e.id, e.first_name, e.last_name, e.employee_code, e.joining_date, e.department_id, d.name, e.resume_url
       HAVING doc_count = 0 AND (e.resume_url IS NULL OR e.resume_url = '')`,
      [organizationId]
    );

    for (const row of rows) {
      const days = Number(row.days_since_joining) || 0;
      const severity = days >= 14 ? 'WARNING' : 'INFO';
      const empName = `${row.first_name} ${row.last_name}`;
      const joinDateStr = row.joining_date ? new Date(row.joining_date).toISOString().slice(0, 10) : '';

      candidates.push({
        organization_id: organizationId,
        type: 'MISSING_DOCUMENTS',
        severity,
        target_entity_type: 'employee',
        target_entity_id: row.employee_id,
        department_id: row.department_id,
        title: `Missing Documents: ${empName}`,
        summary: `${empName} has not submitted required onboarding documents after ${days} days of joining.`,
        detailed_explanation: `Deterministic HR rule: Employee ${empName} joined on ${joinDateStr} (${days} days ago) and does not have any active documents or resume on record.`,
        supporting_data: {
          type: 'MISSING_DOCUMENTS',
          employee_id: row.employee_id,
          employee_name: empName,
          department_id: row.department_id,
          department_name: row.department_name,
          joining_date: joinDateStr,
          days_since_joining: days
        },
        dedup_key: `MISSING_DOCUMENTS:${organizationId}:${row.employee_id}`
      });
    }

    return candidates;
  }

  // ==========================================
  // 6. ATTENDANCE_TREND
  // Detect sustained decline in department attendance (comparing past 7 days to prior 7 days).
  // ==========================================
  async detectAttendanceTrend(organizationId) {
    const candidates = [];
    const weekKey = this.getIsoWeekString();

    const [rows] = await db.query(
      `SELECT e.department_id, d.name AS department_name,
              SUM(CASE WHEN ar.date BETWEEN DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND DATE_SUB(CURDATE(), INTERVAL 8 DAY) THEN 1 ELSE 0 END) AS p1_total,
              SUM(CASE WHEN ar.date BETWEEN DATE_SUB(CURDATE(), INTERVAL 14 DAY) AND DATE_SUB(CURDATE(), INTERVAL 8 DAY) AND ar.status IN ('present', 'wfh') THEN 1 ELSE 0 END) AS p1_present,
              SUM(CASE WHEN ar.date BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND DATE_SUB(CURDATE(), INTERVAL 1 DAY) THEN 1 ELSE 0 END) AS p2_total,
              SUM(CASE WHEN ar.date BETWEEN DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND ar.status IN ('present', 'wfh') THEN 1 ELSE 0 END) AS p2_present
       FROM attendance_records ar
       JOIN employees e ON ar.employee_id = e.id
       JOIN departments d ON e.department_id = d.id
       WHERE ar.organization_id = ?
         AND ar.date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
         AND ar.status NOT IN ('weekend', 'holiday')
       GROUP BY e.department_id, d.name
       HAVING p1_total >= 5 AND p2_total >= 5`,
      [organizationId]
    );

    for (const row of rows) {
      const p1Total = Number(row.p1_total) || 0;
      const p1Pres = Number(row.p1_present) || 0;
      const p2Total = Number(row.p2_total) || 0;
      const p2Pres = Number(row.p2_present) || 0;

      const rate1 = p1Total > 0 ? (p1Pres / p1Total) * 100 : 0;
      const rate2 = p2Total > 0 ? (p2Pres / p2Total) * 100 : 0;
      const drop = Math.round(rate1 - rate2);

      // Trigger if attendance dropped by 10 percentage points or more
      if (drop >= 10) {
        const severity = drop >= 20 ? 'WARNING' : 'INFO';
        candidates.push({
          organization_id: organizationId,
          type: 'ATTENDANCE_TREND',
          severity,
          target_entity_type: 'department',
          target_entity_id: row.department_id,
          department_id: row.department_id,
          title: `Attendance Decline in ${row.department_name} (-${drop}%)`,
          summary: `Attendance in ${row.department_name} fell by ${drop}% (from ${Math.round(rate1)}% to ${Math.round(rate2)}%) over the past 7 days.`,
          detailed_explanation: `Deterministic HR rule: Department ${row.department_name} experienced a sustained attendance drop of ${drop} percentage points between consecutive 7-day monitoring windows.`,
          supporting_data: {
            type: 'ATTENDANCE_TREND',
            department_id: row.department_id,
            department_name: row.department_name,
            previous_rate: Math.round(rate1),
            current_rate: Math.round(rate2),
            drop_percentage: drop,
            week: weekKey
          },
          dedup_key: `ATTENDANCE_TREND:${organizationId}:${row.department_id}:${weekKey}`
        });
      }
    }

    return candidates;
  }

  // ==========================================
  // 7. NEW_JOINERS
  // Generate periodic summary of employees who joined recently (last 7 days).
  // ==========================================
  async detectNewJoiners(organizationId) {
    const candidates = [];
    const weekKey = this.getIsoWeekString();

    const [joiners] = await db.query(
      `SELECT e.id, e.first_name, e.last_name, e.employee_code, 
              e.joining_date, e.department_id, d.name AS department_name
       FROM employees e
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE e.organization_id = ?
         AND e.status IN ('active', 'probation')
         AND e.joining_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         AND e.joining_date <= CURDATE()
       ORDER BY e.joining_date DESC`,
      [organizationId]
    );

    if (joiners.length > 0) {
      const names = joiners.map(j => `${j.first_name} ${j.last_name}`).join(', ');
      candidates.push({
        organization_id: organizationId,
        type: 'NEW_JOINERS',
        severity: 'INFO',
        target_entity_type: 'organization',
        target_entity_id: organizationId,
        department_id: null,
        title: `Recent Joiners: ${joiners.length} New Team Member(s)`,
        summary: `${joiners.length} new employee(s) joined in the last 7 days: ${names}.`,
        detailed_explanation: `Deterministic HR rule: Periodic new joiner summary for ${weekKey}. A total of ${joiners.length} employee(s) onboarded recently.`,
        supporting_data: {
          type: 'NEW_JOINERS',
          count: joiners.length,
          week: weekKey,
          employees: joiners.map(j => ({
            id: j.id,
            name: `${j.first_name} ${j.last_name}`,
            department: j.department_name || 'Unassigned',
            joining_date: j.joining_date ? new Date(j.joining_date).toISOString().slice(0, 10) : ''
          }))
        },
        dedup_key: `NEW_JOINERS:${organizationId}:${weekKey}`
      });
    }

    return candidates;
  }

  // ==========================================
  // 8. HEADCOUNT_CHANGE
  // Detect meaningful department headcount changes over past 30 days.
  // ==========================================
  async detectHeadcountChange(organizationId) {
    const candidates = [];
    const monthKey = this.getMonthString();

    const [rows] = await db.query(
      `SELECT d.id AS department_id, d.name AS department_name,
              COUNT(CASE WHEN e.status IN ('active', 'probation') THEN 1 END) AS active_count,
              COUNT(CASE WHEN e.joining_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) AS recent_joins,
              COUNT(CASE WHEN e.status IN ('terminated', 'resigned') AND e.updated_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) AS recent_exits
       FROM departments d
       LEFT JOIN employees e ON d.id = e.department_id AND e.organization_id = d.organization_id
       WHERE d.organization_id = ? AND d.deleted_at IS NULL
       GROUP BY d.id, d.name`,
      [organizationId]
    );

    for (const row of rows) {
      const joins = Number(row.recent_joins) || 0;
      const exits = Number(row.recent_exits) || 0;
      const active = Number(row.active_count) || 0;
      const net = joins - exits;

      // Meaningful change: net change >= 2 or net change represents >= 20% of department
      const isMeaningfulCount = Math.abs(net) >= 2;
      const isMeaningfulPercent = active > 0 && (Math.abs(net) / active) >= 0.20;

      if (isMeaningfulCount || isMeaningfulPercent) {
        const severity = Math.abs(net) >= 3 ? 'WARNING' : 'INFO';
        const sign = net > 0 ? '+' : '';
        candidates.push({
          organization_id: organizationId,
          type: 'HEADCOUNT_CHANGE',
          severity,
          target_entity_type: 'department',
          target_entity_id: row.department_id,
          department_id: row.department_id,
          title: `Headcount Shift in ${row.department_name} (${sign}${net})`,
          summary: `${row.department_name} department had a net headcount shift of ${sign}${net} (${joins} joined, ${exits} departed) in the past 30 days.`,
          detailed_explanation: `Deterministic HR rule: Headcount shift detected in ${row.department_name}. Currently ${active} active members. Last 30 days: +${joins} joins, -${exits} exits.`,
          supporting_data: {
            type: 'HEADCOUNT_CHANGE',
            department_id: row.department_id,
            department_name: row.department_name,
            current_headcount: active,
            recent_joins: joins,
            recent_exits: exits,
            net_change: net,
            month: monthKey
          },
          dedup_key: `HEADCOUNT_CHANGE:${organizationId}:${row.department_id}:${monthKey}`
        });
      }
    }

    return candidates;
  }

  /**
   * Run full detection suite for a single organization.
   * Deterministically applies all 8 business rules and saves new insights.
   */
  async runDetectionForOrganization(organizationId) {
    if (!organizationId) {
      throw new Error('organization_id is required');
    }

    const allCandidates = [];

    // Run all 8 detectors safely
    try {
      const c1 = await this.detectConsecutiveAbsence(organizationId);
      allCandidates.push(...c1);
    } catch (e) {
      console.error(`[InsightDetection] consecutive absence failed for org ${organizationId}:`, e.message);
    }

    try {
      const c2 = await this.detectHighAbsenteeism(organizationId);
      allCandidates.push(...c2);
    } catch (e) {
      console.error(`[InsightDetection] high absenteeism failed for org ${organizationId}:`, e.message);
    }

    try {
      const c3 = await this.detectLeaveUtilization(organizationId);
      allCandidates.push(...c3);
    } catch (e) {
      console.error(`[InsightDetection] leave utilization failed for org ${organizationId}:`, e.message);
    }

    try {
      const c4 = await this.detectOnboardingOverdue(organizationId);
      allCandidates.push(...c4);
    } catch (e) {
      console.error(`[InsightDetection] onboarding overdue failed for org ${organizationId}:`, e.message);
    }

    try {
      const c5 = await this.detectMissingDocuments(organizationId);
      allCandidates.push(...c5);
    } catch (e) {
      console.error(`[InsightDetection] missing documents failed for org ${organizationId}:`, e.message);
    }

    try {
      const c6 = await this.detectAttendanceTrend(organizationId);
      allCandidates.push(...c6);
    } catch (e) {
      console.error(`[InsightDetection] attendance trend failed for org ${organizationId}:`, e.message);
    }

    try {
      const c7 = await this.detectNewJoiners(organizationId);
      allCandidates.push(...c7);
    } catch (e) {
      console.error(`[InsightDetection] new joiners failed for org ${organizationId}:`, e.message);
    }

    try {
      const c8 = await this.detectHeadcountChange(organizationId);
      allCandidates.push(...c8);
    } catch (e) {
      console.error(`[InsightDetection] headcount change failed for org ${organizationId}:`, e.message);
    }

    // Process deduplication and persist
    const results = {
      total_detected: allCandidates.length,
      created: 0,
      skipped_duplicate: 0,
      skipped_dismissed: 0,
      insights: []
    };

    for (const candidate of allCandidates) {
      const saveRes = await this.saveInsight(candidate);
      if (saveRes.action === 'created') {
        results.created++;
      } else if (saveRes.action === 'skipped_duplicate') {
        results.skipped_duplicate++;
      } else if (saveRes.action === 'skipped_dismissed') {
        results.skipped_dismissed++;
      }
      results.insights.push({
        type: candidate.type,
        title: candidate.title,
        severity: candidate.severity,
        action: saveRes.action,
        id: saveRes.id
      });
    }

    return results;
  }
}

module.exports = new InsightDetectionService();

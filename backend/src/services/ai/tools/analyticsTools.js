/**
 * Deterministic Organizational Analytics Backend Tools (Phase 3B)
 * 
 * Strict Architecture Rules:
 * 1. AI interprets natural language into parameters; backend executes strictly defined SQL.
 * 2. AI NEVER generates or executes arbitrary SQL.
 * 3. organization_id is strictly derived from authenticated server context.
 * 4. Date ranges are validated (startDate <= endDate).
 * 5. Ambiguous entities prompt for clarification instead of guessing.
 * 6. Numbers, percentages, and winners come directly from MySQL calculations, not LLM hallucinations.
 */

const db = require('../../../config/db');
const { resolveDate, validateDateRange, formatDate } = require('../dateResolver');
const { resolveDepartment } = require('../entityResolver');

/**
 * 1. Compare attendance and absenteeism between two departments over a period.
 * 
 * Example: "Compare IT and Sales attendance for Q3."
 */
async function compareDepartmentAttendance(organizationId, params = {}, resolvedData = {}) {
  let dept1 = resolvedData.department1;
  let dept2 = resolvedData.department2;

  // Resolve dept1 if string
  if (!dept1 && params.department1) {
    const res1 = await resolveDepartment(organizationId, params.department1);
    if (!res1.resolved) {
      return {
        success: false,
        status: 400,
        isAmbiguous: res1.isAmbiguous || false,
        candidates: res1.matches || [],
        message: res1.reason
      };
    }
    dept1 = res1.department;
  }

  // Resolve dept2 if string
  if (!dept2 && params.department2) {
    const res2 = await resolveDepartment(organizationId, params.department2);
    if (!res2.resolved) {
      return {
        success: false,
        status: 400,
        isAmbiguous: res2.isAmbiguous || false,
        candidates: res2.matches || [],
        message: res2.reason
      };
    }
    dept2 = res2.department;
  }

  if (!dept1 || !dept2) {
    return {
      success: false,
      status: 400,
      message: 'Please specify two departments to compare (e.g. "Compare IT and Sales attendance for Q3").'
    };
  }

  if (dept1.id === dept2.id) {
    return {
      success: false,
      status: 400,
      message: 'Please specify two different departments to compare.'
    };
  }

  // Date range resolution
  const dateInfo = resolvedData.dates || resolveDate(params.period || params.rawText || 'this quarter');
  const startDate = params.startDate || dateInfo.startDate || dateInfo.date;
  const endDate = params.endDate || dateInfo.endDate || dateInfo.date;

  const dateValidation = validateDateRange(startDate, endDate);
  if (!dateValidation.valid) {
    return { success: false, status: 400, message: dateValidation.reason };
  }

  // Helper to query metrics for one department
  async function getDeptMetrics(dept) {
    const [rows] = await db.query(
      `SELECT 
         COUNT(a.id) as total_records,
         SUM(CASE WHEN a.status IN ('present', 'wfh') THEN 1 WHEN a.status = 'half_day' THEN 0.5 ELSE 0 END) as present_days,
         SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
         SUM(CASE WHEN a.status = 'half_day' THEN 1 ELSE 0 END) as half_day_count,
         SUM(CASE WHEN a.late_minutes > 0 THEN 1 ELSE 0 END) as late_count
       FROM attendance_records a
       JOIN employees e ON a.employee_id = e.id
       WHERE a.organization_id = ? 
         AND e.department_id = ?
         AND a.date BETWEEN ? AND ?
         AND e.deleted_at IS NULL`,
      [organizationId, dept.id, startDate, endDate]
    );

    const total = rows[0]?.total_records || 0;
    const present = Number(rows[0]?.present_days || 0);
    const absent = Number(rows[0]?.absent_days || 0);
    const halfDay = Number(rows[0]?.half_day_count || 0);
    const late = Number(rows[0]?.late_count || 0);

    const attendanceRate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;
    const absentRate = total > 0 ? Number(((absent / total) * 100).toFixed(1)) : 0;

    return {
      departmentId: dept.id,
      name: dept.name,
      totalRecords: total,
      presentDays: present,
      absentDays: absent,
      halfDays: halfDay,
      lateCount: late,
      attendanceRate,
      absentRate
    };
  }

  const m1 = await getDeptMetrics(dept1);
  const m2 = await getDeptMetrics(dept2);

  // Compute winner & margin
  let winner = null;
  let winnerText = '';
  const diff = Number(Math.abs(m1.attendanceRate - m2.attendanceRate).toFixed(1));

  if (m1.attendanceRate > m2.attendanceRate) {
    winner = { name: m1.name, margin: diff, metric: 'attendance rate' };
    winnerText = `Winner: ${m1.name} by ${diff} percentage points.`;
  } else if (m2.attendanceRate > m1.attendanceRate) {
    winner = { name: m2.name, margin: diff, metric: 'attendance rate' };
    winnerText = `Winner: ${m2.name} by ${diff} percentage points.`;
  } else {
    winner = { name: 'Tie', margin: 0, metric: 'attendance rate' };
    winnerText = 'Both departments had an identical attendance rate.';
  }

  const periodLabel = dateInfo.periodName || `${startDate} to ${endDate}`;

  const message = `${m1.name}
Attendance: ${m1.attendanceRate}%
Absent: ${m1.absentRate}%

${m2.name}
Attendance: ${m2.attendanceRate}%
Absent: ${m2.absentRate}%

${winnerText}`;

  return {
    success: true,
    message,
    data: {
      analytics: {
        analyticsType: 'comparison',
        title: `Attendance Comparison: ${m1.name} vs ${m2.name}`,
        period: periodLabel,
        startDate,
        endDate,
        departments: [m1, m2],
        winner,
        summary: `${m1.name} (${m1.attendanceRate}% attendance, ${m1.absentRate}% absent) vs ${m2.name} (${m2.attendanceRate}% attendance, ${m2.absentRate}% absent). ${winnerText}`
      }
    }
  };
}

/**
 * 2. Absenteeism rate across departments, identifying the department with highest absenteeism.
 * 
 * Example: "Which department has the highest absenteeism this month?"
 */
async function getAbsenteeismRate(organizationId, params = {}, resolvedData = {}) {
  const dateInfo = resolvedData.dates || resolveDate(params.period || params.rawText || 'this month');
  const startDate = params.startDate || dateInfo.startDate || dateInfo.date;
  const endDate = params.endDate || dateInfo.endDate || dateInfo.date;

  const dateValidation = validateDateRange(startDate, endDate);
  if (!dateValidation.valid) {
    return { success: false, status: 400, message: dateValidation.reason };
  }

  const [rows] = await db.query(
    `SELECT 
       d.id as department_id,
       d.name as department_name,
       COUNT(a.id) as total_records,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days,
       SUM(CASE WHEN a.status IN ('present', 'wfh') THEN 1 WHEN a.status = 'half_day' THEN 0.5 ELSE 0 END) as present_days
     FROM departments d
     JOIN employees e ON e.department_id = d.id AND e.organization_id = ? AND e.deleted_at IS NULL
     JOIN attendance_records a ON a.employee_id = e.id AND a.organization_id = ? AND a.date BETWEEN ? AND ?
     WHERE d.organization_id = ? AND d.deleted_at IS NULL
     GROUP BY d.id, d.name
     HAVING total_records > 0
     ORDER BY (absent_days / total_records) DESC`,
    [organizationId, organizationId, startDate, endDate, organizationId]
  );

  const periodLabel = dateInfo.periodName || `${startDate} to ${endDate}`;

  if (rows.length === 0) {
    return {
      success: true,
      message: `No attendance records found for ${periodLabel} across departments.`,
      data: {
        analytics: {
          analyticsType: 'ranked_list',
          title: 'Department Absenteeism Rates',
          period: periodLabel,
          items: []
        }
      }
    };
  }

  const items = rows.map(r => {
    const total = Number(r.total_records);
    const absent = Number(r.absent_days);
    const present = Number(r.present_days);
    const absentRate = total > 0 ? Number(((absent / total) * 100).toFixed(1)) : 0;
    const attendanceRate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;
    return {
      departmentId: r.department_id,
      departmentName: r.department_name,
      totalRecords: total,
      absentDays: absent,
      presentDays: present,
      absentRate,
      attendanceRate
    };
  });

  const topDept = items[0];

  // Overall organization rate
  const totalOrgRecords = items.reduce((acc, cur) => acc + cur.totalRecords, 0);
  const totalOrgAbsent = items.reduce((acc, cur) => acc + cur.absentDays, 0);
  const orgAbsentRate = totalOrgRecords > 0 ? Number(((totalOrgAbsent / totalOrgRecords) * 100).toFixed(1)) : 0;

  const rankedLines = items
    .slice(0, 5)
    .map((item, idx) => `${idx + 1}. **${item.departmentName}**: ${item.absentRate}% absent (${item.absentDays} of ${item.totalRecords} days)`)
    .join('\n');

  const message = `The department with the highest absenteeism for **${periodLabel}** is **${topDept.departmentName}** with an absenteeism rate of **${topDept.absentRate}%** (${topDept.absentDays} absent days out of ${topDept.totalRecords} total scheduled days).

**Department Rankings**:
${rankedLines}

*Overall organization absenteeism rate: ${orgAbsentRate}%*`;

  return {
    success: true,
    message,
    data: {
      analytics: {
        analyticsType: 'ranked_list',
        title: 'Department Absenteeism Rates',
        period: periodLabel,
        highestDepartment: topDept,
        overallAbsentRate: orgAbsentRate,
        items
      }
    }
  };
}

/**
 * 3. Leave utilization for employees or departments exceeding a specified threshold.
 * 
 * Example: "Which employees have used more than 50% of their leave balance?"
 * Example: "Which departments have high leave utilization?"
 */
async function getLeaveUtilization(organizationId, params = {}, resolvedData = {}) {
  const threshold = params.thresholdPercent !== undefined ? Number(params.thresholdPercent) : 50;
  const year = params.year || new Date().getFullYear();
  const isDeptGrouping = params.groupBy === 'department' || (params.rawText && params.rawText.toLowerCase().includes('departments'));

  if (isDeptGrouping) {
    const [deptRows] = await db.query(
      `SELECT 
         d.id as department_id,
         d.name as department_name,
         COUNT(DISTINCT e.id) as employee_count,
         SUM(lb.allocated) as total_allocated,
         SUM(lb.used) as total_used,
         SUM(lb.carried_forward) as total_carried,
         (SUM(lb.allocated) + SUM(lb.carried_forward)) as total_available,
         ROUND((SUM(lb.used) / NULLIF(SUM(lb.allocated) + SUM(lb.carried_forward), 0)) * 100, 1) as utilization_rate
       FROM departments d
       JOIN employees e ON e.department_id = d.id AND e.organization_id = ? AND e.deleted_at IS NULL AND e.status = 'active'
       JOIN leave_balances lb ON lb.employee_id = e.id AND lb.organization_id = ? AND lb.year = ?
       WHERE d.organization_id = ? AND d.deleted_at IS NULL
       GROUP BY d.id, d.name
       HAVING utilization_rate >= ?
       ORDER BY utilization_rate DESC`,
      [organizationId, organizationId, year, organizationId, threshold]
    );

    if (deptRows.length === 0) {
      return {
        success: true,
        message: `No departments have exceeded ${threshold}% leave utilization for ${year}.`,
        data: {
          analytics: {
            analyticsType: 'utilization',
            title: `Department Leave Utilization (≥ ${threshold}%)`,
            year,
            groupBy: 'department',
            threshold,
            items: []
          }
        }
      };
    }

    const deptList = deptRows
      .map((d, i) => `${i + 1}. **${d.department_name}**: **${d.utilization_rate}%** (${d.total_used} days used of ${d.total_available} allocated across ${d.employee_count} employees)`)
      .join('\n');

    return {
      success: true,
      message: `Here are the departments with **≥ ${threshold}%** leave utilization for **${year}**:\n\n${deptList}`,
      data: {
        analytics: {
          analyticsType: 'utilization',
          title: `Department Leave Utilization (≥ ${threshold}%)`,
          year,
          groupBy: 'department',
          threshold,
          items: deptRows
        }
      }
    };
  }

  // Employee level utilization
  const [empRows] = await db.query(
    `SELECT 
       e.id as employee_id,
       e.employee_code,
       e.first_name,
       e.last_name,
       d.name as department_name,
       des.name as designation_name,
       SUM(lb.allocated) as total_allocated,
       SUM(lb.used) as total_used,
       SUM(lb.carried_forward) as total_carried,
       (SUM(lb.allocated) + SUM(lb.carried_forward)) as total_available,
       ROUND((SUM(lb.used) / NULLIF(SUM(lb.allocated) + SUM(lb.carried_forward), 0)) * 100, 1) as utilization_rate
     FROM employees e
     JOIN leave_balances lb ON lb.employee_id = e.id AND lb.organization_id = ? AND lb.year = ?
     LEFT JOIN departments d ON e.department_id = d.id
     LEFT JOIN designations des ON e.designation_id = des.id
     WHERE e.organization_id = ? AND e.deleted_at IS NULL AND e.status = 'active'
     GROUP BY e.id, e.employee_code, e.first_name, e.last_name, d.name, des.name
     HAVING utilization_rate >= ?
     ORDER BY utilization_rate DESC`,
    [organizationId, year, organizationId, threshold]
  );

  if (empRows.length === 0) {
    return {
      success: true,
      message: `No employees have used more than ${threshold}% of their leave balance for ${year}.`,
      data: {
        analytics: {
          analyticsType: 'utilization',
          title: `Employee Leave Utilization (> ${threshold}%)`,
          year,
          groupBy: 'employee',
          threshold,
          items: []
        }
      }
    };
  }

  const empList = empRows
    .slice(0, 10)
    .map((e, i) => `${i + 1}. **${e.first_name} ${e.last_name}** (${e.employee_code}) - ${e.department_name || 'Unassigned'}: **${e.utilization_rate}%** (${e.total_used}/${e.total_available} days)`)
    .join('\n');

  const suffix = empRows.length > 10 ? `\n*...and ${empRows.length - 10} more employees.*` : '';

  return {
    success: true,
    message: `There are **${empRows.length}** employees who have used **> ${threshold}%** of their leave balance in **${year}**:\n\n${empList}${suffix}`,
    data: {
      analytics: {
        analyticsType: 'utilization',
        title: `Employee Leave Utilization (> ${threshold}%)`,
        year,
        groupBy: 'employee',
        threshold,
        count: empRows.length,
        items: empRows
      }
    }
  };
}

/**
 * 4. Average employee tenure across the organization and by department.
 * 
 * Example: "What is the average employee tenure?"
 */
async function getEmployeeTenure(organizationId, params = {}, resolvedData = {}) {
  const [rows] = await db.query(
    `SELECT 
       e.id,
       e.employee_code,
       e.first_name,
       e.last_name,
       e.joining_date,
       d.name as department_name,
       DATEDIFF(CURRENT_DATE, e.joining_date) as tenure_days
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.organization_id = ? 
       AND e.deleted_at IS NULL 
       AND e.status != 'terminated'
       AND e.joining_date IS NOT NULL`,
    [organizationId]
  );

  if (rows.length === 0) {
    return {
      success: true,
      message: 'No active employee tenure records found.',
      data: {
        analytics: {
          analyticsType: 'tenure',
          title: 'Employee Tenure Analysis',
          totalEmployees: 0,
          averageTenureYears: 0,
          averageTenureMonths: 0,
          distribution: []
        }
      }
    };
  }

  const totalDays = rows.reduce((acc, r) => acc + (r.tenure_days || 0), 0);
  const avgDays = totalDays / rows.length;
  const avgYears = Number((avgDays / 365.25).toFixed(1));
  const avgMonths = Math.round(avgDays / 30.4375);

  // Tenure Brackets
  let lessThan1Year = 0;
  let oneToThreeYears = 0;
  let threeToFiveYears = 0;
  let fivePlusYears = 0;

  for (let r of rows) {
    const yrs = (r.tenure_days || 0) / 365.25;
    if (yrs < 1) lessThan1Year++;
    else if (yrs < 3) oneToThreeYears++;
    else if (yrs < 5) threeToFiveYears++;
    else fivePlusYears++;
  }

  const brackets = [
    { label: '< 1 year', count: lessThan1Year, percentage: Number(((lessThan1Year / rows.length) * 100).toFixed(1)) },
    { label: '1 - 3 years', count: oneToThreeYears, percentage: Number(((oneToThreeYears / rows.length) * 100).toFixed(1)) },
    { label: '3 - 5 years', count: threeToFiveYears, percentage: Number(((threeToFiveYears / rows.length) * 100).toFixed(1)) },
    { label: '5+ years', count: fivePlusYears, percentage: Number(((fivePlusYears / rows.length) * 100).toFixed(1)) }
  ];

  // Department-level tenure
  const deptMap = {};
  for (let r of rows) {
    const dName = r.department_name || 'Unassigned';
    if (!deptMap[dName]) deptMap[dName] = { days: 0, count: 0 };
    deptMap[dName].days += (r.tenure_days || 0);
    deptMap[dName].count++;
  }

  const deptAverages = Object.keys(deptMap).map(dName => {
    const count = deptMap[dName].count;
    const avgD = deptMap[dName].days / count;
    return {
      department: dName,
      employeeCount: count,
      averageYears: Number((avgD / 365.25).toFixed(1))
    };
  }).sort((a, b) => b.averageYears - a.averageYears);

  const deptBreakdown = deptAverages
    .map(d => `• **${d.department}**: ${d.averageYears} years (${d.employeeCount} employees)`)
    .join('\n');

  const message = `The average employee tenure across the organization is **${avgYears} years** (~${avgMonths} months) based on **${rows.length}** employees.

**Tenure Distribution**:
• **< 1 year**: ${lessThan1Year} employees (${brackets[0].percentage}%)
• **1 - 3 years**: ${oneToThreeYears} employees (${brackets[1].percentage}%)
• **3 - 5 years**: ${threeToFiveYears} employees (${brackets[2].percentage}%)
• **5+ years**: ${fivePlusYears} employees (${brackets[3].percentage}%)

**Department Averages**:
${deptBreakdown}`;

  return {
    success: true,
    message,
    data: {
      analytics: {
        analyticsType: 'tenure',
        title: 'Employee Tenure Analysis',
        totalEmployees: rows.length,
        averageTenureYears: avgYears,
        averageTenureMonths: avgMonths,
        distribution: brackets,
        departmentAverages: deptAverages
      }
    }
  };
}

/**
 * 5. Employees joined within a specified date range.
 * 
 * Example: "How many employees joined this month?"
 */
async function getEmployeesJoinedRange(organizationId, params = {}, resolvedData = {}) {
  const dateInfo = resolvedData.dates || resolveDate(params.period || params.rawText || 'this month');
  const startDate = params.startDate || dateInfo.startDate || dateInfo.date;
  const endDate = params.endDate || dateInfo.endDate || dateInfo.date;

  const dateValidation = validateDateRange(startDate, endDate);
  if (!dateValidation.valid) {
    return { success: false, status: 400, message: dateValidation.reason };
  }

  let query = `
    SELECT 
      e.id,
      e.employee_code,
      e.first_name,
      e.last_name,
      e.joining_date,
      e.email,
      d.name as department_name,
      des.name as designation_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    LEFT JOIN designations des ON e.designation_id = des.id
    WHERE e.organization_id = ? 
      AND e.deleted_at IS NULL
      AND e.joining_date BETWEEN ? AND ?
  `;
  const queryParams = [organizationId, startDate, endDate];

  if (resolvedData.department) {
    query += ' AND e.department_id = ?';
    queryParams.push(resolvedData.department.id);
  }

  query += ' ORDER BY e.joining_date DESC';

  const [rows] = await db.query(query, queryParams);
  const periodLabel = dateInfo.periodName || `${startDate} to ${endDate}`;

  if (rows.length === 0) {
    return {
      success: true,
      message: `No employees joined between **${startDate}** and **${endDate}** (${periodLabel}).`,
      data: {
        analytics: {
          analyticsType: 'joiners',
          title: 'Employee Joiners',
          period: periodLabel,
          startDate,
          endDate,
          count: 0,
          employees: []
        }
      }
    };
  }

  const joinerList = rows
    .map(e => `• **${e.first_name} ${e.last_name}** (${e.employee_code}) - ${e.designation_name || 'Associate'} in ${e.department_name || 'General'}, joined on ${formatDate(new Date(e.joining_date))}`)
    .join('\n');

  const message = `**${rows.length}** employee(s) joined during **${periodLabel}** (${startDate} to ${endDate}):\n\n${joinerList}`;

  return {
    success: true,
    message,
    data: {
      analytics: {
        analyticsType: 'joiners',
        title: 'Employee Joiners',
        period: periodLabel,
        startDate,
        endDate,
        count: rows.length,
        employees: rows
      }
    }
  };
}

/**
 * 6. Detect employees with consecutive absent working days.
 * 
 * Example: "Who has been absent for 3 consecutive working days?"
 */
async function getConsecutiveAbsences(organizationId, params = {}, resolvedData = {}) {
  const consecutiveDays = params.consecutiveDays ? parseInt(params.consecutiveDays, 10) : 3;

  // Search period: default to last 60 days
  const ref = new Date();
  const defaultEnd = formatDate(ref);
  const pastRef = new Date(ref);
  pastRef.setDate(ref.getDate() - 60);
  const defaultStart = formatDate(pastRef);

  const hasExplicitDate = params.startDate || params.period || (params.rawText && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|month|quarter|week|year|20\d{2})\b/i.test(params.rawText));
  const startDate = hasExplicitDate ? (params.startDate || resolvedData.dates?.startDate || defaultStart) : defaultStart;
  const endDate = hasExplicitDate ? (params.endDate || resolvedData.dates?.endDate || defaultEnd) : defaultEnd;

  const dateValidation = validateDateRange(startDate, endDate);
  if (!dateValidation.valid) {
    return { success: false, status: 400, message: dateValidation.reason };
  }

  const [records] = await db.query(
    `SELECT 
       a.employee_id,
       a.date,
       e.first_name,
       e.last_name,
       e.employee_code,
       d.name as department_name
     FROM attendance_records a
     JOIN employees e ON a.employee_id = e.id
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE a.organization_id = ? 
       AND a.status = 'absent'
       AND a.date BETWEEN ? AND ?
     ORDER BY a.employee_id, a.date ASC`,
    [organizationId, startDate, endDate]
  );

  // Group by employee and find consecutive streaks
  const empMap = {};
  for (let r of records) {
    if (!empMap[r.employee_id]) {
      empMap[r.employee_id] = {
        employeeId: r.employee_id,
        name: `${r.first_name} ${r.last_name}`,
        employeeCode: r.employee_code,
        department: r.department_name || 'Unassigned',
        dates: []
      };
    }
    empMap[r.employee_id].dates.push(formatDate(new Date(r.date)));
  }

  const qualifyingEmployees = [];

  for (let empId in empMap) {
    const emp = empMap[empId];
    const dates = emp.dates;
    if (dates.length < consecutiveDays) continue;

    let maxStreak = 1;
    let currentStreak = 1;
    let streakStart = dates[0];
    let longestStreakStart = dates[0];
    let longestStreakEnd = dates[0];

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const curDate = new Date(dates[i]);
      const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));

      // Consider consecutive if 1 day apart, or 3 days apart over a weekend (Friday to Monday)
      const isWeekendGap = diffDays === 3 && prevDate.getDay() === 5 && curDate.getDay() === 1;

      if (diffDays === 1 || isWeekendGap) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          longestStreakStart = streakStart;
          longestStreakEnd = dates[i];
        }
      } else {
        currentStreak = 1;
        streakStart = dates[i];
      }
    }

    if (maxStreak >= consecutiveDays) {
      qualifyingEmployees.push({
        employeeId: emp.employeeId,
        name: emp.name,
        employeeCode: emp.employeeCode,
        department: emp.department,
        streakDays: maxStreak,
        startDate: longestStreakStart,
        endDate: longestStreakEnd
      });
    }
  }

  if (qualifyingEmployees.length === 0) {
    return {
      success: true,
      message: `No employees have been absent for ${consecutiveDays} or more consecutive working days between ${startDate} and ${endDate}.`,
      data: {
        analytics: {
          analyticsType: 'consecutive_absences',
          title: `Consecutive Absences (≥ ${consecutiveDays} Days)`,
          consecutiveDays,
          count: 0,
          employees: []
        }
      }
    };
  }

  const list = qualifyingEmployees
    .map(e => `• **${e.name}** (${e.employeeCode}) - ${e.department}: **${e.streakDays} consecutive days** (${e.startDate} to ${e.endDate})`)
    .join('\n');

  const message = `Found **${qualifyingEmployees.length}** employee(s) absent for **≥ ${consecutiveDays} consecutive working days**:\n\n${list}`;

  return {
    success: true,
    message,
    data: {
      analytics: {
        analyticsType: 'consecutive_absences',
        title: `Consecutive Absences (≥ ${consecutiveDays} Days)`,
        consecutiveDays,
        count: qualifyingEmployees.length,
        employees: qualifyingEmployees
      }
    }
  };
}

/**
 * 7. Department headcount breakdown and workforce percentage.
 * 
 * Example: "Show department headcount"
 */
async function getDepartmentHeadcount(organizationId, params = {}, resolvedData = {}) {
  const [rows] = await db.query(
    `SELECT 
       COALESCE(d.id, 0) as department_id,
       COALESCE(d.name, 'Unassigned') as department_name,
       COUNT(e.id) as headcount
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id AND d.organization_id = ? AND d.deleted_at IS NULL
     WHERE e.organization_id = ? 
       AND e.deleted_at IS NULL 
       AND e.status = 'active'
     GROUP BY d.id, d.name
     ORDER BY headcount DESC`,
    [organizationId, organizationId]
  );

  const totalHeadcount = rows.reduce((acc, cur) => acc + Number(cur.headcount), 0);

  if (totalHeadcount === 0) {
    return {
      success: true,
      message: 'No active employees found in the organization.',
      data: {
        analytics: {
          analyticsType: 'headcount',
          title: 'Department Headcount',
          totalHeadcount: 0,
          departments: []
        }
      }
    };
  }

  const departments = rows.map(r => {
    const count = Number(r.headcount);
    const percentage = totalHeadcount > 0 ? Number(((count / totalHeadcount) * 100).toFixed(1)) : 0;
    return {
      departmentId: r.department_id,
      departmentName: r.department_name,
      headcount: count,
      percentage
    };
  });

  const list = departments
    .map(d => `• **${d.departmentName}**: ${d.headcount} employees (${d.percentage}%)`)
    .join('\n');

  const message = `Organization active workforce: **${totalHeadcount} employees** across **${departments.length} departments**:\n\n${list}`;

  return {
    success: true,
    message,
    data: {
      analytics: {
        analyticsType: 'headcount',
        title: 'Department Headcount Distribution',
        totalHeadcount,
        departments
      }
    }
  };
}

/**
 * 8. Attendance trends over a date range.
 * 
 * Example: "Show attendance trends"
 */
async function getAttendanceTrends(organizationId, params = {}, resolvedData = {}) {
  const hasExplicitDate = params.startDate || params.period || (params.rawText && /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|month|quarter|week|year|20\d{2})\b/i.test(params.rawText));
  const now = new Date();
  const past30 = new Date(now);
  past30.setDate(now.getDate() - 30);
  const defaultStart = formatDate(past30);
  const defaultEnd = formatDate(now);

  const dateInfo = resolvedData.dates || (hasExplicitDate ? resolveDate(params.period || params.rawText) : {});
  const startDate = params.startDate || (hasExplicitDate ? (dateInfo.startDate || dateInfo.date) : defaultStart);
  const endDate = params.endDate || (hasExplicitDate ? (dateInfo.endDate || dateInfo.date) : defaultEnd);

  const dateValidation = validateDateRange(startDate, endDate);
  if (!dateValidation.valid) {
    return { success: false, status: 400, message: dateValidation.reason };
  }

  const [rows] = await db.query(
    `SELECT 
       a.date,
       COUNT(a.id) as total_records,
       SUM(CASE WHEN a.status IN ('present', 'wfh') THEN 1 WHEN a.status = 'half_day' THEN 0.5 ELSE 0 END) as present_days,
       SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent_days
     FROM attendance_records a
     WHERE a.organization_id = ? AND a.date BETWEEN ? AND ?
     GROUP BY a.date
     ORDER BY a.date ASC`,
    [organizationId, startDate, endDate]
  );

  const periodLabel = dateInfo.periodName || `${startDate} to ${endDate}`;

  if (rows.length === 0) {
    return {
      success: true,
      message: `No attendance trend data available for ${periodLabel}.`,
      data: {
        analytics: {
          analyticsType: 'trend',
          title: 'Attendance Trends',
          period: periodLabel,
          averageAttendance: 0,
          trendDirection: 'stable',
          trendDelta: 0,
          dataPoints: []
        }
      }
    };
  }

  const series = rows.map(r => {
    const total = Number(r.total_records);
    const present = Number(r.present_days);
    const rate = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 0;
    return {
      date: formatDate(new Date(r.date)),
      totalRecords: total,
      presentDays: present,
      absentDays: Number(r.absent_days),
      attendanceRate: rate
    };
  });

  // Calculate trend direction (first half vs second half)
  const mid = Math.floor(series.length / 2);
  let direction = 'stable';
  let delta = 0;

  if (mid > 0) {
    const firstHalfAvg = series.slice(0, mid).reduce((acc, c) => acc + c.attendanceRate, 0) / mid;
    const secondHalfAvg = series.slice(mid).reduce((acc, c) => acc + c.attendanceRate, 0) / (series.length - mid);
    delta = Number((secondHalfAvg - firstHalfAvg).toFixed(1));
    if (delta >= 2.0) direction = 'improving';
    else if (delta <= -2.0) direction = 'declining';
  }

  const overallAvg = Number((series.reduce((a, c) => a + c.attendanceRate, 0) / series.length).toFixed(1));

  const message = `Attendance trend for **${periodLabel}**:
• **Average Attendance**: ${overallAvg}%
• **Trend Direction**: **${direction.toUpperCase()}** (${delta > 0 ? '+' : ''}${delta} percentage points)
• **Data Points Analyzed**: ${series.length} days`;

  return {
    success: true,
    message,
    data: {
      analytics: {
        analyticsType: 'trend',
        title: 'Attendance Trends',
        period: periodLabel,
        averageAttendance: overallAvg,
        trendDirection: direction,
        trendDelta: delta,
        dataPoints: series
      }
    }
  };
}

/**
 * 9. Leave trends across months and leave type distribution.
 * 
 * Example: "Show leave trends for this year"
 */
async function getLeaveTrends(organizationId, params = {}, resolvedData = {}) {
  const year = params.year || new Date().getFullYear();

  const [monthlyRows] = await db.query(
    `SELECT 
       MONTH(lr.start_date) as month_num,
       COUNT(lr.id) as total_requests,
       SUM(CASE WHEN lr.status = 'approved' THEN 1 ELSE 0 END) as approved_count,
       SUM(CASE WHEN lr.status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
       SUM(CASE WHEN lr.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
       SUM(lr.total_days) as total_days_requested
     FROM leave_requests lr
     WHERE lr.organization_id = ? AND YEAR(lr.start_date) = ?
     GROUP BY MONTH(lr.start_date)
     ORDER BY month_num ASC`,
    [organizationId, year]
  );

  const [typesRows] = await db.query(
    `SELECT 
       lt.name as leave_type_name,
       COUNT(lr.id) as request_count,
       SUM(lr.total_days) as total_days
     FROM leave_requests lr
     JOIN leave_types lt ON lr.leave_type_id = lt.id
     WHERE lr.organization_id = ? AND YEAR(lr.start_date) = ?
     GROUP BY lt.id, lt.name
     ORDER BY request_count DESC`,
    [organizationId, year]
  );

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlySeries = monthlyRows.map(r => ({
    month: monthNames[r.month_num - 1],
    monthNum: r.month_num,
    totalRequests: Number(r.total_requests),
    approved: Number(r.approved_count),
    rejected: Number(r.rejected_count),
    pending: Number(r.pending_count),
    totalDays: Number(r.total_days_requested)
  }));

  const totalRequests = monthlySeries.reduce((a, c) => a + c.totalRequests, 0);
  const totalApproved = monthlySeries.reduce((a, c) => a + c.approved, 0);
  const approvalRate = totalRequests > 0 ? Number(((totalApproved / totalRequests) * 100).toFixed(1)) : 0;

  const topTypesText = typesRows.slice(0, 3).map(t => `• **${t.leave_type_name}**: ${t.request_count} requests (${t.total_days} days)`).join('\n');

  const message = `Leave trends for **${year}**:
• **Total Leave Requests**: ${totalRequests}
• **Approved Requests**: ${totalApproved} (${approvalRate}% approval rate)
• **Top Leave Types**:
${topTypesText || '• None recorded'}`;

  return {
    success: true,
    message,
    data: {
      analytics: {
        analyticsType: 'leave_trend',
        title: `Leave Trends (${year})`,
        year,
        totalRequests,
        approvalRate,
        monthlySeries,
        topLeaveTypes: typesRows
      }
    }
  };
}

module.exports = {
  compareDepartmentAttendance,
  getAbsenteeismRate,
  getLeaveUtilization,
  getEmployeeTenure,
  getEmployeesJoinedRange,
  getConsecutiveAbsences,
  getDepartmentHeadcount,
  getAttendanceTrends,
  getLeaveTrends
};

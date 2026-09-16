import React from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  AlertCircle,
  Percent,
  Award
} from 'lucide-react';

export default function AnalyticsDataCard({ data }) {
  if (!data) return null;
  const { analyticsType } = data;

  // 1. COMPARISON (e.g. Compare IT and Sales attendance)
  if (analyticsType === 'comparison') {
    const { departments = [], winner, period, title } = data;
    const [dept1, dept2] = departments;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <BarChart2 size={16} className="ai-analytics-icon" />
            <span className="ai-analytics-title">{title || 'Department Attendance Comparison'}</span>
          </div>
          {period && <span className="ai-analytics-badge">{period}</span>}
        </div>

        {/* Winner Banner */}
        {winner && (
          <div className="ai-analytics-winner-banner">
            <Trophy size={16} className="ai-trophy-icon" />
            <span>
              <strong>Winner: {winner.name}</strong> by{' '}
              <strong>{winner.margin} percentage points</strong> ({winner.metric})
            </span>
          </div>
        )}

        {/* Side-by-side comparison cards */}
        <div className="ai-comparison-grid">
          {dept1 && (
            <div className={`ai-comparison-card ${winner?.name === dept1.name ? 'winner-card' : ''}`}>
              <div className="ai-comparison-card-header">
                <span className="ai-dept-name">{dept1.name}</span>
                {winner?.name === dept1.name && (
                  <span className="ai-winner-pill">
                    <Award size={12} /> Top
                  </span>
                )}
              </div>
              <div className="ai-metric-row">
                <span className="ai-metric-label">Attendance:</span>
                <span className="ai-metric-value positive">{dept1.attendanceRate}%</span>
              </div>
              <div className="ai-progress-track">
                <div 
                  className="ai-progress-bar positive-bar" 
                  style={{ width: `${Math.min(dept1.attendanceRate, 100)}%` }}
                />
              </div>
              <div className="ai-metric-row" style={{ marginTop: '8px' }}>
                <span className="ai-metric-label">Absent:</span>
                <span className="ai-metric-value negative">{dept1.absentRate}%</span>
              </div>
              <div className="ai-progress-track">
                <div 
                  className="ai-progress-bar negative-bar" 
                  style={{ width: `${Math.min(dept1.absentRate, 100)}%` }}
                />
              </div>
              <div className="ai-card-subtext">
                {dept1.presentDays} present / {dept1.absentDays} absent ({dept1.totalRecords} total scheduled)
              </div>
            </div>
          )}

          {dept2 && (
            <div className={`ai-comparison-card ${winner?.name === dept2.name ? 'winner-card' : ''}`}>
              <div className="ai-comparison-card-header">
                <span className="ai-dept-name">{dept2.name}</span>
                {winner?.name === dept2.name && (
                  <span className="ai-winner-pill">
                    <Award size={12} /> Top
                  </span>
                )}
              </div>
              <div className="ai-metric-row">
                <span className="ai-metric-label">Attendance:</span>
                <span className="ai-metric-value positive">{dept2.attendanceRate}%</span>
              </div>
              <div className="ai-progress-track">
                <div 
                  className="ai-progress-bar positive-bar" 
                  style={{ width: `${Math.min(dept2.attendanceRate, 100)}%` }}
                />
              </div>
              <div className="ai-metric-row" style={{ marginTop: '8px' }}>
                <span className="ai-metric-label">Absent:</span>
                <span className="ai-metric-value negative">{dept2.absentRate}%</span>
              </div>
              <div className="ai-progress-track">
                <div 
                  className="ai-progress-bar negative-bar" 
                  style={{ width: `${Math.min(dept2.absentRate, 100)}%` }}
                />
              </div>
              <div className="ai-card-subtext">
                {dept2.presentDays} present / {dept2.absentDays} absent ({dept2.totalRecords} total scheduled)
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. RANKED LIST (e.g. Absenteeism Rates)
  if (analyticsType === 'ranked_list') {
    const { items = [], highestDepartment, overallAbsentRate, period, title } = data;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <Percent size={16} className="ai-analytics-icon" />
            <span className="ai-analytics-title">{title || 'Absenteeism Rates'}</span>
          </div>
          {period && <span className="ai-analytics-badge">{period}</span>}
        </div>

        {/* Highest Absenteeism Callout */}
        {highestDepartment && (
          <div className="ai-callout-box negative-callout">
            <div className="ai-callout-title">
              <AlertCircle size={15} /> Highest Absenteeism
            </div>
            <div className="ai-callout-text">
              <strong>{highestDepartment.departmentName}</strong> leads with{' '}
              <strong>{highestDepartment.absentRate}%</strong> absent days ({highestDepartment.absentDays} of {highestDepartment.totalRecords} scheduled days).
            </div>
          </div>
        )}

        {overallAbsentRate !== undefined && (
          <div className="ai-overall-stat">
            <span>Overall Organization Absenteeism:</span>
            <strong>{overallAbsentRate}%</strong>
          </div>
        )}

        {/* Ranked Department Bars */}
        <div className="ai-ranked-list">
          {items.slice(0, 6).map((item, idx) => (
            <div key={item.departmentId || idx} className="ai-ranked-row">
              <div className="ai-ranked-row-header">
                <span className="ai-ranked-label">
                  <span className="ai-rank-num">#{idx + 1}</span> {item.departmentName}
                </span>
                <span className="ai-ranked-stat">{item.absentRate}%</span>
              </div>
              <div className="ai-progress-track">
                <div 
                  className={`ai-progress-bar ${item.absentRate > 15 ? 'critical-bar' : (item.absentRate > 8 ? 'warning-bar' : 'normal-bar')}`}
                  style={{ width: `${Math.min(item.absentRate * 2.5, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. LEAVE UTILIZATION
  if (analyticsType === 'utilization') {
    const { items = [], threshold = 50, year, groupBy } = data;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <Calendar size={16} className="ai-analytics-icon" />
            <span className="ai-analytics-title">
              {groupBy === 'department' ? 'Department Leave Utilization' : 'Employee Leave Utilization'}
            </span>
          </div>
          <span className="ai-analytics-badge">≥ {threshold}% Used ({year})</span>
        </div>

        {items.length === 0 ? (
          <div className="ai-empty-analytics">No records exceeded {threshold}% utilization.</div>
        ) : (
          <div className="ai-ranked-list">
            {items.slice(0, 8).map((item, idx) => {
              const name = groupBy === 'department' 
                ? item.department_name 
                : `${item.first_name} ${item.last_name}`;
              const sub = groupBy === 'department'
                ? `${item.employee_count} employees`
                : `${item.employee_code} • ${item.department_name || 'General'}`;
              const rate = Number(item.utilization_rate);

              return (
                <div key={idx} className="ai-ranked-row">
                  <div className="ai-ranked-row-header">
                    <div>
                      <span className="ai-ranked-label"><strong>{name}</strong></span>
                      <span className="ai-sub-label"> ({sub})</span>
                    </div>
                    <span className={`ai-ranked-stat ${rate >= 75 ? 'critical-text' : 'warning-text'}`}>
                      {rate}%
                    </span>
                  </div>
                  <div className="ai-progress-track">
                    <div 
                      className={`ai-progress-bar ${rate >= 75 ? 'critical-bar' : 'warning-bar'}`}
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    />
                  </div>
                  <div className="ai-util-subtext">
                    {item.total_used} days used of {item.total_available} allocated
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 4. EMPLOYEE TENURE
  if (analyticsType === 'tenure') {
    const { totalEmployees, averageTenureYears, averageTenureMonths, distribution = [], departmentAverages = [] } = data;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <Clock size={16} className="ai-analytics-icon" />
            <span className="ai-analytics-title">Employee Tenure Breakdown</span>
          </div>
          <span className="ai-analytics-badge">{totalEmployees} Employees</span>
        </div>

        {/* Big KPI Metric */}
        <div className="ai-kpi-block">
          <div className="ai-kpi-number">{averageTenureYears} <span className="ai-kpi-unit">Years</span></div>
          <div className="ai-kpi-caption">Average tenure across active organization personnel (~{averageTenureMonths} months)</div>
        </div>

        {/* Distribution Brackets */}
        <div style={{ marginTop: '16px' }}>
          <div className="ai-section-subtitle">Tenure Distribution</div>
          <div className="ai-ranked-list">
            {distribution.map((bracket, idx) => (
              <div key={idx} className="ai-ranked-row">
                <div className="ai-ranked-row-header">
                  <span className="ai-ranked-label">{bracket.label}</span>
                  <span className="ai-ranked-stat">{bracket.count} ({bracket.percentage}%)</span>
                </div>
                <div className="ai-progress-track">
                  <div 
                    className="ai-progress-bar positive-bar" 
                    style={{ width: `${Math.min(bracket.percentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Averages */}
        {departmentAverages.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div className="ai-section-subtitle">Top Department Averages</div>
            <div className="ai-chip-grid">
              {departmentAverages.slice(0, 4).map((d, i) => (
                <div key={i} className="ai-dept-tenure-chip">
                  <strong>{d.department}:</strong> {d.averageYears} yrs
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. JOINERS WITHIN DATE RANGE
  if (analyticsType === 'joiners') {
    const { count, period, employees = [] } = data;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <Users size={16} className="ai-analytics-icon" />
            <span className="ai-analytics-title">New Employee Joiners</span>
          </div>
          <span className="ai-analytics-badge">{period}</span>
        </div>

        <div className="ai-kpi-block">
          <div className="ai-kpi-number">{count} <span className="ai-kpi-unit">Joiner{count === 1 ? '' : 's'}</span></div>
          <div className="ai-kpi-caption">Employees who joined during {period}</div>
        </div>

        {employees.length > 0 && (
          <div className="ai-simple-table-wrap">
            <table className="ai-simple-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Designation</th>
                  <th>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {employees.slice(0, 6).map((e, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{e.first_name} {e.last_name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.employee_code}</div>
                    </td>
                    <td>{e.department_name || 'Unassigned'}</td>
                    <td>{e.designation_name || 'Associate'}</td>
                    <td>{new Date(e.joining_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 6. CONSECUTIVE ABSENCES
  if (analyticsType === 'consecutive_absences') {
    const { count, consecutiveDays, employees = [] } = data;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <AlertCircle size={16} className="ai-analytics-icon critical" />
            <span className="ai-analytics-title">Consecutive Absenteeism</span>
          </div>
          <span className="ai-analytics-badge critical-badge">≥ {consecutiveDays} Working Days</span>
        </div>

        {employees.length === 0 ? (
          <div className="ai-empty-analytics">
            Zero employees were absent for {consecutiveDays} or more consecutive working days.
          </div>
        ) : (
          <div className="ai-simple-table-wrap">
            <table className="ai-simple-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Streak</th>
                  <th>Dates</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{e.name}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{e.employeeCode}</div>
                    </td>
                    <td>{e.department}</td>
                    <td>
                      <span className="ai-streak-pill">{e.streakDays} Days</span>
                    </td>
                    <td style={{ fontSize: '12px' }}>{e.startDate} to {e.endDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 7. HEADCOUNT DISTRIBUTION
  if (analyticsType === 'headcount') {
    const { totalHeadcount, departments = [] } = data;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <Users size={16} className="ai-analytics-icon" />
            <span className="ai-analytics-title">Department Headcount</span>
          </div>
          <span className="ai-analytics-badge">{totalHeadcount} Total Active</span>
        </div>

        <div className="ai-ranked-list" style={{ marginTop: '12px' }}>
          {departments.map((d, idx) => (
            <div key={idx} className="ai-ranked-row">
              <div className="ai-ranked-row-header">
                <span className="ai-ranked-label"><strong>{d.departmentName}</strong></span>
                <span className="ai-ranked-stat">{d.headcount} ({d.percentage}%)</span>
              </div>
              <div className="ai-progress-track">
                <div 
                  className="ai-progress-bar normal-bar" 
                  style={{ width: `${Math.min(d.percentage * 1.5, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 8. ATTENDANCE TRENDS
  if (analyticsType === 'trend') {
    const { averageAttendance, trendDirection, trendDelta, period, dataPoints = [] } = data;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <BarChart2 size={16} className="ai-analytics-icon" />
            <span className="ai-analytics-title">Attendance Trend Analysis</span>
          </div>
          {period && <span className="ai-analytics-badge">{period}</span>}
        </div>

        <div className="ai-trend-summary-row">
          <div>
            <div className="ai-kpi-number">{averageAttendance}%</div>
            <div className="ai-kpi-caption">Average Attendance</div>
          </div>
          <div className="ai-trend-indicator-pill">
            {trendDirection === 'improving' ? (
              <span className="trend-up"><TrendingUp size={16} /> Improving (+{trendDelta}%)</span>
            ) : trendDirection === 'declining' ? (
              <span className="trend-down"><TrendingDown size={16} /> Declining ({trendDelta}%)</span>
            ) : (
              <span className="trend-stable"><Minus size={16} /> Stable ({trendDelta}%)</span>
            )}
          </div>
        </div>

        {/* Mini Sparkline Bar Visualization */}
        {dataPoints.length > 0 && (
          <div className="ai-sparkline-container">
            <div className="ai-sparkline-bars">
              {dataPoints.slice(-14).map((pt, i) => (
                <div key={i} className="ai-sparkline-col" title={`${pt.date}: ${pt.attendanceRate}%`}>
                  <div 
                    className="ai-sparkline-fill" 
                    style={{ height: `${Math.min(pt.attendanceRate, 100)}%` }}
                  />
                  <span className="ai-sparkline-date">{pt.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 9. LEAVE TRENDS
  if (analyticsType === 'leave_trend') {
    const { totalRequests, approvalRate, year, monthlySeries = [], topLeaveTypes = [] } = data;

    return (
      <div className="ai-analytics-card">
        <div className="ai-analytics-header">
          <div className="ai-analytics-title-wrap">
            <Calendar size={16} className="ai-analytics-icon" />
            <span className="ai-analytics-title">Leave Trends ({year})</span>
          </div>
          <span className="ai-analytics-badge">{totalRequests} Total Requests</span>
        </div>

        <div className="ai-trend-summary-row">
          <div>
            <div className="ai-kpi-number">{approvalRate}%</div>
            <div className="ai-kpi-caption">Overall Approval Rate</div>
          </div>
          <div className="ai-chip-grid">
            {topLeaveTypes.slice(0, 3).map((t, idx) => (
              <div key={idx} className="ai-dept-tenure-chip">
                {t.leave_type_name}: {t.request_count} reqs
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Breakdown Bars */}
        {monthlySeries.length > 0 && (
          <div className="ai-sparkline-container" style={{ marginTop: '16px' }}>
            <div className="ai-sparkline-bars">
              {monthlySeries.map((m, i) => {
                const maxReq = Math.max(...monthlySeries.map(s => s.totalRequests), 1);
                const height = Math.round((m.totalRequests / maxReq) * 100);
                return (
                  <div key={i} className="ai-sparkline-col" title={`${m.month}: ${m.totalRequests} requests`}>
                    <div 
                      className="ai-sparkline-fill" 
                      style={{ height: `${Math.max(height, 8)}%` }}
                    />
                    <span className="ai-sparkline-date">{m.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

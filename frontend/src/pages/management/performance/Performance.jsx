import React from 'react';
import { 
  Calendar, Download, TrendingUp, TrendingDown, 
  Target, ClipboardList, Clock, AlertTriangle, 
  Star, Award, Code, BarChart2, Package, Megaphone, IndianRupee, Users, ChevronRight, BarChart
} from 'lucide-react';
import './Performance.css';

const Performance = () => {
  // Mock Data
  const deptData = [
    { name: 'Engineering', employees: 124, compPct: 81, goalComp: '78%', rating: 4.2, trend: 9.3, icon: Code, color: '#8b5cf6', bg: '#ede9fe', barColor: '#10b981' },
    { name: 'Sales', employees: 86, compPct: 74, goalComp: '76%', rating: 4.0, trend: 6.2, icon: BarChart2, color: '#3b82f6', bg: '#dbeafe', barColor: '#3b82f6' },
    { name: 'Product', employees: 42, compPct: 62, goalComp: '65%', rating: 3.7, trend: 2.1, icon: Package, color: '#f97316', bg: '#ffedd5', barColor: '#f59e0b' },
    { name: 'Marketing', employees: 38, compPct: 58, goalComp: '60%', rating: 3.6, trend: -1.4, icon: Megaphone, color: '#ec4899', bg: '#fce7f3', barColor: '#ef4444' },
    { name: 'Finance', employees: 28, compPct: 76, goalComp: '80%', rating: 4.1, trend: 7.8, icon: IndianRupee, color: '#10b981', bg: '#d1fae5', barColor: '#10b981' },
    { name: 'HR', employees: 15, compPct: 67, goalComp: '70%', rating: 3.9, trend: 3.3, icon: Users, color: '#8b5cf6', bg: '#ede9fe', barColor: '#a855f7' },
  ];

  const upcomingReviews = [
    { title: 'Sales Team Reviews', due: 'Due in 5 days', count: 18, id: 'SJ', bg: '#fce7f3', color: '#ec4899' },
    { title: 'Engineering Reviews', due: 'Due in 7 days', count: 24, id: 'ENG', bg: '#d1fae5', color: '#10b981' },
    { title: 'Marketing Reviews', due: 'Due in 10 days', count: 12, id: 'MKT', bg: '#ffedd5', color: '#f97316' },
  ];

  return (
    <div className="perf-dashboard">
      
      {/* Header */}
      <div className="perf-header">
        <div>
          <h1 className="perf-title">Performance</h1>
        </div>
        <div className="perf-header-actions">
          <div className="perf-date-picker">
            <span>Q3 (Jul - Sep 2026)</span>
            <Calendar size={16} />
          </div>
          <button className="perf-export-btn">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="perf-kpi-row">
        <div className="perf-kpi-card">
          <div className="perf-kpi-top">
            <div className="perf-kpi-icon bg-purple"><BarChart size={18} color="#8b5cf6" /></div>
            <div>
              <div className="perf-kpi-label">Overall Completion</div>
              <div className="perf-kpi-value">65%</div>
            </div>
          </div>
          <div className="perf-kpi-bottom">
            <span className="perf-kpi-desc">Q3 Completion</span>
            <div className="perf-kpi-trend text-green"><TrendingUp size={12} /> 8.4%</div>
            <span className="perf-kpi-vs">vs Q2 (56.6%)</span>
          </div>
        </div>

        <div className="perf-kpi-card">
          <div className="perf-kpi-top">
            <div className="perf-kpi-icon bg-green"><Target size={18} color="#10b981" /></div>
            <div>
              <div className="perf-kpi-label">Goals Completed</div>
              <div className="perf-kpi-value">72%</div>
            </div>
          </div>
          <div className="perf-kpi-bottom">
            <span className="perf-kpi-desc">of total goals</span>
            <div className="perf-kpi-trend text-green"><TrendingUp size={12} /> 6.7%</div>
            <span className="perf-kpi-vs">vs Q2 (65.3%)</span>
          </div>
        </div>

        <div className="perf-kpi-card">
          <div className="perf-kpi-top">
            <div className="perf-kpi-icon bg-blue"><ClipboardList size={18} color="#3b82f6" /></div>
            <div>
              <div className="perf-kpi-label">Reviews Completed</div>
              <div className="perf-kpi-value">312</div>
            </div>
          </div>
          <div className="perf-kpi-bottom">
            <span className="perf-kpi-desc">of 480 reviews</span>
            <div className="perf-kpi-trend text-green"><TrendingUp size={12} /> 12.3%</div>
            <span className="perf-kpi-vs">vs Q2 (278)</span>
          </div>
        </div>

        <div className="perf-kpi-card">
          <div className="perf-kpi-top">
            <div className="perf-kpi-icon bg-orange"><Clock size={18} color="#f97316" /></div>
            <div>
              <div className="perf-kpi-label">Pending Reviews</div>
              <div className="perf-kpi-value">168</div>
            </div>
          </div>
          <div className="perf-kpi-bottom">
            <span className="perf-kpi-desc">to be completed</span>
            <div className="perf-kpi-trend text-red"><TrendingDown size={12} /> 5.1%</div>
            <span className="perf-kpi-vs">vs Q2 (177)</span>
          </div>
        </div>

        <div className="perf-kpi-card">
          <div className="perf-kpi-top">
            <div className="perf-kpi-icon bg-red"><AlertTriangle size={18} color="#ef4444" /></div>
            <div>
              <div className="perf-kpi-label">Overdue Reviews</div>
              <div className="perf-kpi-value">24</div>
            </div>
          </div>
          <div className="perf-kpi-bottom">
            <span className="perf-kpi-desc">past due date</span>
            <div className="perf-kpi-trend text-red"><TrendingDown size={12} /> 14.3%</div>
            <span className="perf-kpi-vs">vs Q2 (28)</span>
          </div>
        </div>
      </div>

      {/* Middle Row */}
      <div className="perf-middle-row">
        
        {/* Department Overview Table */}
        <div className="perf-panel col-span-2">
          <div className="perf-panel-header">
            <h3>Department Performance Overview</h3>
          </div>
          <table className="perf-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Employees</th>
                <th>Completion %</th>
                <th>Goal Completion</th>
                <th>Avg Rating</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {deptData.map((d, i) => (
                <tr key={i}>
                  <td>
                    <div className="perf-dept-cell">
                      <div className="perf-dept-icon" style={{background: d.bg, color: d.color}}>
                        <d.icon size={14} />
                      </div>
                      <span className="perf-dept-name">{d.name}</span>
                    </div>
                  </td>
                  <td>{d.employees}</td>
                  <td>
                    <div className="perf-comp-bar-container">
                      <span>{d.compPct}%</span>
                      <div className="perf-comp-bar-bg">
                        <div className="perf-comp-bar-fill" style={{width: `${d.compPct}%`, background: d.barColor}}></div>
                      </div>
                    </div>
                  </td>
                  <td>{d.goalComp}</td>
                  <td>
                    <div className="perf-rating-cell">
                      {d.rating.toFixed(1)} <Star size={12} fill={d.barColor} color={d.barColor} />
                    </div>
                  </td>
                  <td>
                    <div className={`perf-trend-cell ${d.trend > 0 ? 'text-green' : 'text-red'}`}>
                      {d.trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} 
                      {Math.abs(d.trend)}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Charts Container */}
        <div className="perf-charts-container">
          
          <div className="perf-panel">
            <div className="perf-panel-header">
              <h3>Performance by Rating</h3>
            </div>
            <div className="perf-donut-container">
              <div className="perf-donut-wrapper">
                <svg viewBox="0 0 100 100" className="perf-donut">
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f3f4f6" strokeWidth="15" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="233.6" transform="rotate(-90 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="201" transform="rotate(-64 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="87.9" transform="rotate(7 50 50)" />
                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="15" strokeDasharray="251.2" strokeDashoffset="180.8" transform="rotate(169 50 50)" />
                </svg>
                <div className="perf-donut-center">
                  <span className="perf-donut-val">312</span>
                  <span className="perf-donut-lbl">Total Reviews</span>
                </div>
              </div>
              <div className="perf-legend-right">
                <div className="perf-legend-item"><span className="dot dot-green"></span> Excellent <small>(4.5 - 5)</small> <strong>28% (87)</strong></div>
                <div className="perf-legend-item"><span className="dot dot-blue"></span> Good <small>(3.5 - 4.4)</small> <strong>45% (140)</strong></div>
                <div className="perf-legend-item"><span className="dot dot-yellow"></span> Average <small>(2.5 - 3.4)</small> <strong>20% (62)</strong></div>
                <div className="perf-legend-item"><span className="dot dot-red"></span> Below Average <small>(1 - 2.4)</small> <strong>7% (23)</strong></div>
              </div>
            </div>
          </div>

          <div className="perf-panel">
            <div className="perf-panel-header">
              <h3>Rating Distribution</h3>
            </div>
            <div className="perf-bar-chart">
              <div className="perf-y-axis">
                <span>40%</span><span>30%</span><span>20%</span><span>10%</span><span>0%</span>
              </div>
              <div className="perf-bars">
                <div className="perf-bar-group">
                  <span className="perf-bar-lbl">7%</span>
                  <div className="perf-bar"><div className="perf-bar-fill bg-red" style={{height: '17.5%'}}></div></div>
                  <span className="perf-x-lbl">1 - 2.4</span>
                </div>
                <div className="perf-bar-group">
                  <span className="perf-bar-lbl">20%</span>
                  <div className="perf-bar"><div className="perf-bar-fill bg-yellow" style={{height: '50%'}}></div></div>
                  <span className="perf-x-lbl">2.5 - 3.4</span>
                </div>
                <div className="perf-bar-group">
                  <span className="perf-bar-lbl">45%</span>
                  <div className="perf-bar"><div className="perf-bar-fill bg-blue" style={{height: '100%'}}></div></div>
                  <span className="perf-x-lbl">3.5 - 4.4</span>
                </div>
                <div className="perf-bar-group">
                  <span className="perf-bar-lbl">28%</span>
                  <div className="perf-bar"><div className="perf-bar-fill bg-green" style={{height: '70%'}}></div></div>
                  <span className="perf-x-lbl">4.5 - 5</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Row */}
      <div className="perf-bottom-row">
        
        {/* Performance Insights */}
        <div className="perf-panel col-span-2">
          <div className="perf-panel-header">
            <h3>Performance Insights</h3>
          </div>
          <div className="perf-insights-grid">
            
            <div className="perf-insight-card">
              <div className="perf-insight-icon bg-green"><Award size={18} color="#10b981" /></div>
              <div className="perf-insight-content">
                <h4>Top Performing Department</h4>
                <p><strong>Engineering</strong> is leading with <strong>81%</strong> completion and highest average rating <strong>4.2</strong></p>
              </div>
            </div>
            
            <div className="perf-insight-card">
              <div className="perf-insight-icon bg-orange"><Target size={18} color="#f97316" /></div>
              <div className="perf-insight-content">
                <h4>Needs Attention</h4>
                <p>Marketing department has <strong>24 overdue</strong> reviews and <strong>58%</strong> completion</p>
              </div>
            </div>

            <div className="perf-insight-card">
              <div className="perf-insight-icon bg-purple"><TrendingUp size={18} color="#8b5cf6" /></div>
              <div className="perf-insight-content">
                <h4>Improvement Trend</h4>
                <p>Overall performance improved by <strong>8.4%</strong> compared to last quarter</p>
              </div>
            </div>

          </div>
        </div>

        {/* Upcoming Reviews */}
        <div className="perf-panel">
          <div className="perf-panel-header">
            <h3>Upcoming Reviews</h3>
            <a href="#" className="perf-link">View All</a>
          </div>
          <div className="perf-upcoming-list">
            {upcomingReviews.map((rev, idx) => (
              <div className="perf-upcoming-item" key={idx}>
                <div className="perf-upcoming-left">
                  <div className="perf-upcoming-avatar" style={{backgroundColor: rev.bg, color: rev.color}}>{rev.id}</div>
                  <div>
                    <h4>{rev.title}</h4>
                    <p>{rev.due}</p>
                  </div>
                </div>
                <div className="perf-upcoming-right">
                  <strong>{rev.count}</strong>
                  <span>Reviews</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      
    </div>
  );
};

export default Performance;

import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../services/leaveApi';
import { Plus, Search, Calendar as CalendarIcon, List as ListIcon, Edit2, Trash2, CheckCircle, XCircle, FileText } from 'lucide-react';

const COMMON_INDIAN_HOLIDAYS = [
  { name: 'New Year\'s Day', date: '-01-01', type: 'Optional' },
  { name: 'Makar Sankranti / Pongal', date: '-01-15', type: 'Optional' },
  { name: 'Republic Day', date: '-01-26', type: 'National' },
  { name: 'Maha Shivaratri', date: '-03-08', type: 'Optional' },
  { name: 'Holi', date: '-03-25', type: 'Company' },
  { name: 'Good Friday', date: '-03-29', type: 'Optional' },
  { name: 'Eid ul-Fitr (Ramzan)', date: '-04-11', type: 'Optional' },
  { name: 'Ambedkar Jayanti / Ugadi', date: '-04-14', type: 'State/Regional' },
  { name: 'May Day (Labour Day)', date: '-05-01', type: 'National' },
  { name: 'Independence Day', date: '-08-15', type: 'National' },
  { name: 'Raksha Bandhan', date: '-08-19', type: 'Optional' },
  { name: 'Ganesh Chaturthi', date: '-09-07', type: 'State/Regional' },
  { name: 'Eid-e-Milad', date: '-09-16', type: 'Optional' },
  { name: 'Gandhi Jayanti', date: '-10-02', type: 'National' },
  { name: 'Dussehra (Vijaya Dashami)', date: '-10-12', type: 'Company' },
  { name: 'Diwali (Deepavali)', date: '-11-01', type: 'Company' },
  { name: 'Bhai Dooj', date: '-11-03', type: 'Optional' },
  { name: 'Christmas Day', date: '-12-25', type: 'Company' }
];

const LeaveHolidays = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  // Views
  const [view, setView] = useState('calendar'); // 'list' or 'calendar'
  
  // Calendar specific
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(currentYear);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showCommonModal, setShowCommonModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    holiday_date: '',
    type: 'Company',
    location: 'All',
    description: '',
    is_active: true
  });

  const [commonHolidaysForm, setCommonHolidaysForm] = useState([]);

  useEffect(() => {
    fetchHolidays();
  }, [year, typeFilter]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getHolidays({ year, type: typeFilter });
      if (res.data.success) {
        setHolidays(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (holiday = null, prefillDate = null) => {
    if (holiday) {
      setEditMode(true);
      setFormData({
        id: holiday.id,
        name: holiday.name,
        holiday_date: holiday.holiday_date.split('T')[0],
        type: holiday.type || 'Company',
        location: holiday.location || 'All',
        description: holiday.description || '',
        is_active: holiday.is_active === 1 || holiday.is_active === true
      });
    } else {
      setEditMode(false);
      setFormData({
        id: null,
        name: '',
        holiday_date: prefillDate || '',
        type: 'Company',
        location: 'All',
        description: '',
        is_active: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await leaveApi.updateHoliday(formData.id, formData);
      } else {
        await leaveApi.createHoliday(formData);
      }
      setShowModal(false);
      fetchHolidays();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save holiday');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await leaveApi.deleteHoliday(id);
        fetchHolidays();
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete holiday');
      }
    }
  };

  const openCommonModal = () => {
    // Populate form with current year estimates
    const list = COMMON_INDIAN_HOLIDAYS.map((h, i) => ({
      ...h,
      checked: false,
      date: `${year}${h.date}`,
      id: i
    }));
    setCommonHolidaysForm(list);
    setShowCommonModal(true);
  };

  const submitCommonHolidays = async () => {
    const selected = commonHolidaysForm.filter(h => h.checked);
    if (selected.length === 0) {
      alert("Select at least one holiday to add.");
      return;
    }
    
    let addedCount = 0;
    for (let h of selected) {
      try {
        await leaveApi.createHoliday({
          name: h.name,
          holiday_date: h.date,
          type: h.type,
          location: 'All',
          description: '',
          is_active: true
        });
        addedCount++;
      } catch (e) {
        console.error(`Failed to add ${h.name}`, e);
      }
    }
    alert(`Successfully added ${addedCount} holidays.`);
    setShowCommonModal(false);
    fetchHolidays();
  };

  const getFilteredHolidays = () => {
    if (!search) return holidays;
    return holidays.filter(h => h.name.toLowerCase().includes(search.toLowerCase()) || 
                                (h.description && h.description.toLowerCase().includes(search.toLowerCase())));
  };

  const filteredHolidays = getFilteredHolidays();

  // Calendar Helpers
  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => new Date(y, m, 1).getDay();

  const nextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
      setYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const prevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
      setYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const days = [];

    // Empty slots before 1st of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Days in month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const dayHolidays = holidays.filter(h => h.holiday_date.startsWith(dateStr));
      
      days.push(
        <div 
          key={dateStr} 
          className="calendar-day"
          onClick={() => dayHolidays.length > 0 ? handleOpenModal(dayHolidays[0]) : handleOpenModal(null, dateStr)}
          style={{ minHeight: '100px', border: '1px solid #e5e7eb', padding: '8px', cursor: 'pointer', background: '#fff' }}
        >
          <div style={{ fontWeight: 500, color: '#4b5563', marginBottom: '8px' }}>{i}</div>
          {dayHolidays.map(h => (
            <div key={h.id} style={{ 
              background: h.is_active ? '#e0e7ff' : '#f3f4f6', 
              color: h.is_active ? '#4f46e5' : '#9ca3af',
              padding: '4px 6px', 
              borderRadius: '4px', 
              fontSize: '11px',
              marginBottom: '4px',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap'
            }}>
              {h.name}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <button onClick={prevMonth} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>&lt; Prev</button>
          <h3 style={{ margin: 0 }}>{new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <button onClick={nextMonth} style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer' }}>Next &gt;</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: '#e5e7eb' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{ background: '#f9fafb', padding: '10px', textAlign: 'center', fontWeight: 500, color: '#6b7280', fontSize: '13px' }}>
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const renderList = () => {
    return (
      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table className="leave-table">
          <thead>
            <tr>
              <th>Holiday Name</th>
              <th>Date</th>
              <th>Day</th>
              <th>Type</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHolidays.length > 0 ? filteredHolidays.map(h => {
              const d = new Date(h.holiday_date);
              return (
                <tr key={h.id}>
                  <td style={{ fontWeight: 500 }}>{h.name}</td>
                  <td>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td style={{ color: '#6b7280' }}>{d.toLocaleDateString('en-US', { weekday: 'long' })}</td>
                  <td>{h.type}</td>
                  <td>{h.location}</td>
                  <td>
                    {h.is_active ? 
                      <span style={{ color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>Active</span> : 
                      <span style={{ color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>Inactive</span>
                    }
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => handleOpenModal(h)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4f46e5' }}>
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(h.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No holidays found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="leave-holidays">
      
      {/* Header & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Year</label>
            <select 
              value={year} 
              onChange={e => {
                setYear(parseInt(e.target.value));
                setCalendarYear(parseInt(e.target.value));
              }}
              style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Holiday Type</label>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              style={{ padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
            >
              <option value="All">All Types</option>
              <option value="National">National</option>
              <option value="State/Regional">State/Regional</option>
              <option value="Company">Company</option>
              <option value="Optional">Optional</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Search</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#9ca3af' }} />
              <input 
                type="text" 
                placeholder="Search holidays..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ padding: '8px 8px 8px 32px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', width: '200px' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
            <button 
              onClick={() => setView('calendar')}
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: view === 'calendar' ? '#f3f4f6' : '#fff', border: 'none', cursor: 'pointer', color: view === 'calendar' ? '#4f46e5' : '#6b7280' }}
            >
              <CalendarIcon size={16} /> Calendar
            </button>
            <div style={{ width: '1px', background: '#d1d5db' }}></div>
            <button 
              onClick={() => setView('list')}
              style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px', background: view === 'list' ? '#f3f4f6' : '#fff', border: 'none', cursor: 'pointer', color: view === 'list' ? '#4f46e5' : '#6b7280' }}
            >
              <ListIcon size={16} /> List
            </button>
          </div>

          <button 
            onClick={openCommonModal}
            style={{ padding: '8px 16px', background: '#fff', color: '#4f46e5', border: '1px solid #4f46e5', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={16} /> Add Common
          </button>
          
          <button 
            onClick={() => handleOpenModal()}
            style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Holiday
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Loading holidays...</div>
      ) : (
        view === 'calendar' ? renderCalendar() : renderList()
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0 }}>{editMode ? 'Edit Holiday' : 'Add Holiday'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={20} color="#6b7280" /></button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Holiday Name</label>
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.holiday_date}
                    onChange={e => setFormData({...formData, holiday_date: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Type</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                  >
                    <option value="National">National</option>
                    <option value="State/Regional">State/Regional</option>
                    <option value="Company">Company</option>
                    <option value="Optional">Optional</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Applicable Location</label>
                <input 
                  type="text" 
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>Description (Optional)</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '4px', minHeight: '80px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="checkbox" 
                  id="active-check"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                />
                <label htmlFor="active-check" style={{ fontSize: '14px' }}>Active Holiday</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{editMode ? 'Update' : 'Save Holiday'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Common Holidays Modal */}
      {showCommonModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '8px', width: '100%', maxWidth: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Add Common Indian Holidays ({year})</h3>
              <button onClick={() => setShowCommonModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><XCircle size={20} color="#6b7280" /></button>
            </div>
            
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px' }}>Select the holidays to add. Please verify the dates carefully as many festival dates change annually.</p>
            
            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e5e7eb', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '40px' }}>
                      <input 
                        type="checkbox" 
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setCommonHolidaysForm(commonHolidaysForm.map(h => ({...h, checked})));
                        }}
                        checked={commonHolidaysForm.length > 0 && commonHolidaysForm.every(h => h.checked)}
                      />
                    </th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Holiday</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {commonHolidaysForm.map(h => (
                    <tr key={h.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={h.checked}
                          onChange={(e) => {
                            const newForm = [...commonHolidaysForm];
                            newForm.find(item => item.id === h.id).checked = e.target.checked;
                            setCommonHolidaysForm(newForm);
                          }}
                        />
                      </td>
                      <td style={{ padding: '8px', fontWeight: 500 }}>{h.name}</td>
                      <td style={{ padding: '8px' }}>
                        <input 
                          type="date" 
                          value={h.date} 
                          onChange={(e) => {
                            const newForm = [...commonHolidaysForm];
                            newForm.find(item => item.id === h.id).date = e.target.value;
                            setCommonHolidaysForm(newForm);
                          }}
                          style={{ padding: '4px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                        />
                      </td>
                      <td style={{ padding: '8px' }}>{h.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowCommonModal(false)} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitCommonHolidays} style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Add Selected Holidays</button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

export default LeaveHolidays;

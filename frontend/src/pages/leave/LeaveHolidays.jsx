import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../services/leaveApi';
import { 
  Plus, Search, Calendar as CalendarIcon, List as ListIcon, 
  Edit2, Trash2, CheckCircle2, XCircle, FileText, ArrowLeft, 
  Sparkles, ChevronLeft, ChevronRight, Flag, PartyPopper, Landmark, Tag,
  Info, Check, CheckSquare, Square
} from 'lucide-react';

const COMMON_INDIAN_HOLIDAYS = [
  { name: 'New Year\'s Day', date: '-01-01', type: 'Optional', desc: 'First day of the Gregorian year' },
  { name: 'Makar Sankranti / Pongal', date: '-01-14', type: 'Festival', desc: 'Harvest festival celebrated across India' },
  { name: 'Republic Day', date: '-01-26', type: 'National', desc: 'Honoring the Constitution of India' },
  { name: 'Maha Shivaratri', date: '-02-15', type: 'Festival', desc: 'Great night of Lord Shiva' },
  { name: 'Holi (Festival of Colors)', date: '-03-04', type: 'Festival', desc: 'Festival of colors and spring' },
  { name: 'Id-ul-Fitr (Ramzan Eid)', date: '-03-20', type: 'Festival', desc: 'Islamic celebration ending Ramadan' },
  { name: 'Mahavir Jayanti', date: '-03-31', type: 'Gazetted', desc: 'Birth anniversary of Lord Mahavira' },
  { name: 'Good Friday', date: '-04-03', type: 'Gazetted', desc: 'Commemoration of the Crucifixion' },
  { name: 'Dr. B.R. Ambedkar Jayanti', date: '-04-14', type: 'Gazetted', desc: 'Birth anniversary of Babasaheb Ambedkar' },
  { name: 'May Day (Labour Day)', date: '-05-01', type: 'National', desc: 'International Workers Day' },
  { name: 'Buddha Purnima', date: '-05-04', type: 'Gazetted', desc: 'Birth of Gautama Buddha' },
  { name: 'Eid-ul-Adha (Bakrid)', date: '-05-27', type: 'Festival', desc: 'Feast of the Sacrifice' },
  { name: 'Muharram', date: '-06-26', type: 'Gazetted', desc: 'Islamic New Year' },
  { name: 'Independence Day', date: '-08-15', type: 'National', desc: 'Indian Independence Day (1947)' },
  { name: 'Raksha Bandhan', date: '-08-28', type: 'Festival', desc: 'Celebration of brother-sister bond' },
  { name: 'Milad-un-Nabi (Id-e-Milad)', date: '-08-26', type: 'Gazetted', desc: 'Birthday of Prophet Muhammad' },
  { name: 'Ganesh Chaturthi', date: '-09-14', type: 'Festival', desc: 'Arrival of Lord Ganesha' },
  { name: 'Mahatma Gandhi Jayanti', date: '-10-02', type: 'National', desc: 'Birth anniversary of Father of the Nation' },
  { name: 'Maha Navami', date: '-10-19', type: 'Festival', desc: 'Ninth day of Navratri festival' },
  { name: 'Dussehra (Vijay Dashami)', date: '-10-20', type: 'Festival', desc: 'Victory of Good over Evil' },
  { name: 'Diwali (Deepavali)', date: '-11-08', type: 'Festival', desc: 'Festival of Lights' },
  { name: 'Govardhan Puja / Bhai Dooj', date: '-11-10', type: 'Festival', desc: 'Post-Diwali celebrations' },
  { name: 'Guru Nanak Jayanti', date: '-11-24', type: 'Gazetted', desc: 'Birth anniversary of Guru Nanak Dev Ji' },
  { name: 'Christmas Day', date: '-12-25', type: 'Festival', desc: 'Celebration of the Nativity of Jesus' }
];

const LeaveHolidays = ({ onBack }) => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toast, setToast] = useState(null);
  
  // Filters & State
  const today = new Date();
  const currentYear = today.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  // Views
  const [view, setView] = useState('calendar'); // 'calendar' or 'list'
  
  // Apple Calendar Month/Year state
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth());
  const [calendarYear, setCalendarYear] = useState(currentYear);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showCommonModal, setShowCommonModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const [formData, setFormData] = useState({
    id: null,
    name: '',
    holiday_date: '',
    type: 'Festival',
    location: 'All',
    description: '',
    is_active: true
  });

  const [commonHolidaysForm, setCommonHolidaysForm] = useState([]);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    fetchHolidays();
  }, [year, typeFilter]);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await leaveApi.getHolidays({ year, type: typeFilter });
      if (res.data?.success) {
        const raw = res.data.data || [];
        const uniqueMap = new Map();
        raw.forEach(h => {
          const key = `${h.holiday_date}_${(h.name || '').toLowerCase().trim()}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, h);
          }
        });
        setHolidays(Array.from(uniqueMap.values()));
      }
    } catch (e) {
      console.error('Error loading holidays:', e);
      showToastMsg('Failed to load holidays', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSeedIndianHolidays = async () => {
    try {
      setSeeding(true);
      const res = await leaveApi.seedIndianHolidays(year);
      showToastMsg(res.data?.message || 'Indian National & Festival holidays populated successfully!');
      await fetchHolidays();
    } catch (err) {
      console.error(err);
      showToastMsg(err.response?.data?.message || 'Failed to populate Indian holidays', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleOpenModal = (holiday = null, prefillDate = null) => {
    if (holiday) {
      setEditMode(true);
      setFormData({
        id: holiday.id,
        name: holiday.name,
        holiday_date: holiday.holiday_date.split('T')[0],
        type: holiday.type || 'Festival',
        location: holiday.location || 'All',
        description: holiday.description || '',
        is_active: holiday.is_active === 1 || holiday.is_active === true
      });
    } else {
      setEditMode(false);
      setFormData({
        id: null,
        name: '',
        holiday_date: prefillDate || `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-01`,
        type: 'Festival',
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
        showToastMsg('Holiday updated successfully!');
      } else {
        await leaveApi.createHoliday(formData);
        showToastMsg('Holiday scheduled successfully!');
      }
      setShowModal(false);
      fetchHolidays();
    } catch (err) {
      showToastMsg(err.response?.data?.message || 'Failed to save holiday', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove "${name}" from official holidays?`)) {
      try {
        await leaveApi.deleteHoliday(id);
        showToastMsg(`Removed "${name}" from holiday calendar`);
        fetchHolidays();
      } catch (err) {
        showToastMsg(err.response?.data?.message || 'Failed to delete holiday', 'error');
      }
    }
  };

  const openCommonModal = () => {
    const list = COMMON_INDIAN_HOLIDAYS.map((h, i) => {
      const formattedDate = `${calendarYear}${h.date}`;
      const isAlreadyAdded = holidays.some(
        exist => exist.holiday_date.startsWith(formattedDate) || exist.name.toLowerCase().includes(h.name.toLowerCase().slice(0, 5))
      );
      return {
        ...h,
        checked: !isAlreadyAdded,
        alreadyAdded: isAlreadyAdded,
        date: formattedDate,
        id: i
      };
    });
    setCommonHolidaysForm(list);
    setShowCommonModal(true);
  };

  const submitCommonHolidays = async () => {
    const selected = commonHolidaysForm.filter(h => h.checked);
    if (selected.length === 0) {
      showToastMsg("Select at least one holiday to add.", 'error');
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
          description: h.desc || '',
          is_active: true
        });
        addedCount++;
      } catch (e) {
        console.error(`Failed to add ${h.name}`, e);
      }
    }
    showToastMsg(`Successfully scheduled ${addedCount} holidays into calendar!`);
    setShowCommonModal(false);
    fetchHolidays();
  };

  const getFilteredHolidays = () => {
    if (!search) return holidays;
    return holidays.filter(h => 
      h.name.toLowerCase().includes(search.toLowerCase()) || 
      (h.description && h.description.toLowerCase().includes(search.toLowerCase())) ||
      (h.type && h.type.toLowerCase().includes(search.toLowerCase()))
    );
  };

  const filteredHolidays = getFilteredHolidays();

  // Calendar Helpers (Apple-style navigation)
  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (m, y) => new Date(y, m, 1).getDay();
  const getDaysInPrevMonth = (m, y) => new Date(y, m, 0).getDate();

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

  const jumpToToday = () => {
    setCalendarMonth(today.getMonth());
    setCalendarYear(today.getFullYear());
    setYear(today.getFullYear());
  };

  // Distinct Styling for Holiday Badges based on type
  const getHolidayStyle = (type = '') => {
    const t = (type || '').toLowerCase();
    if (t.includes('national')) {
      return {
        bg: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
        border: '#fed7aa',
        borderLeft: '4px solid #ea580c',
        color: '#9a3412',
        badgeBg: '#ea580c',
        icon: Flag,
        label: 'National'
      };
    }
    if (t.includes('festival')) {
      return {
        bg: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
        border: '#e9d5ff',
        borderLeft: '4px solid #9333ea',
        color: '#6b21a8',
        badgeBg: '#9333ea',
        icon: PartyPopper,
        label: 'Festival'
      };
    }
    if (t.includes('gazetted')) {
      return {
        bg: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
        border: '#99f6e4',
        borderLeft: '4px solid #0d9488',
        color: '#115e59',
        badgeBg: '#0d9488',
        icon: Landmark,
        label: 'Gazetted'
      };
    }
    return {
      bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      border: '#bfdbfe',
      borderLeft: '4px solid #2563eb',
      color: '#1e40af',
      badgeBg: '#2563eb',
      icon: Tag,
      label: type || 'Public'
    };
  };

  // Apple macOS / iOS Inspired Calendar View
  const renderAppleCalendar = () => {
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
    const daysInPrevMonth = getDaysInPrevMonth(calendarMonth, calendarYear);
    const days = [];

    // Current month holidays
    const monthHolidays = holidays.filter(h => {
      const hDate = new Date(h.holiday_date);
      return hDate.getFullYear() === calendarYear && hDate.getMonth() === calendarMonth;
    });

    const nationalCount = monthHolidays.filter(h => (h.type || '').toLowerCase().includes('national')).length;
    const festivalCount = monthHolidays.filter(h => (h.type || '').toLowerCase().includes('festival')).length;
    const gazettedCount = monthHolidays.filter(h => (h.type || '').toLowerCase().includes('gazetted')).length;

    // 1. Previous Month Leading Days (Apple Calendar muted styling)
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevDateNum = daysInPrevMonth - i;
      days.push(
        <div 
          key={`prev-${prevDateNum}`} 
          style={{
            minHeight: '120px',
            backgroundColor: '#f8fafc',
            borderRight: '1px solid #f1f5f9',
            borderBottom: '1px solid #f1f5f9',
            padding: '10px',
            opacity: 0.45,
            cursor: 'default'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
            {prevDateNum}
          </span>
        </div>
      );
    }

    // 2. Current Month Days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayDate = new Date(calendarYear, calendarMonth, i);
      const isDayToday = dayDate.toDateString() === today.toDateString();
      const isSunday = dayDate.getDay() === 0;
      const isSaturday = dayDate.getDay() === 6;

      const dayHolidays = holidays.filter(h => {
        if (!h.holiday_date) return false;
        const dStr = typeof h.holiday_date === 'string' ? h.holiday_date.split('T')[0] : '';
        return dStr === dateStr;
      });

      const hasHoliday = dayHolidays.length > 0;
      const primaryHoliday = dayHolidays[0];
      const primaryStyle = hasHoliday ? getHolidayStyle(primaryHoliday.type) : null;

      days.push(
        <div 
          key={dateStr}
          onClick={() => hasHoliday ? handleOpenModal(primaryHoliday) : handleOpenModal(null, dateStr)}
          style={{
            minHeight: '120px',
            backgroundColor: hasHoliday 
              ? (primaryHoliday.type?.toLowerCase().includes('national') ? '#fffaf5' : primaryHoliday.type?.toLowerCase().includes('festival') ? '#faf7ff' : '#f4fbf9')
              : (isSunday ? '#fafafa' : '#ffffff'),
            borderRight: '1px solid #f1f5f9',
            borderBottom: '1px solid #f1f5f9',
            padding: '10px 8px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
          className="apple-calendar-cell"
        >
          {/* Day Number Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: isDayToday ? '26px' : '22px',
              height: isDayToday ? '26px' : '22px',
              borderRadius: '50%',
              backgroundColor: isDayToday ? '#2563eb' : 'transparent',
              color: isDayToday ? '#ffffff' : (isSunday ? '#ef4444' : isSaturday ? '#475569' : '#1e293b'),
              fontWeight: isDayToday || hasHoliday ? '700' : '600',
              fontSize: '13px',
              boxShadow: isDayToday ? '0 2px 6px rgba(37, 99, 235, 0.4)' : 'none'
            }}>
              {i}
            </span>

            {hasHoliday && (
              <span style={{
                fontSize: '10px',
                fontWeight: '700',
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: primaryStyle.badgeBg,
                color: '#ffffff',
                letterSpacing: '0.02em'
              }}>
                {primaryStyle.label}
              </span>
            )}
          </div>

          {/* Holiday Badges (Apple-style pill cards) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            {dayHolidays.map((h) => {
              const hStyle = getHolidayStyle(h.type);
              const IconComp = hStyle.icon;

              return (
                <div 
                  key={h.id}
                  title={`${h.name} (${h.type}) - Click to view/edit`}
                  style={{
                    background: hStyle.bg,
                    border: `1px solid ${hStyle.border}`,
                    borderLeft: hStyle.borderLeft,
                    borderRadius: '6px',
                    padding: '5px 7px',
                    color: hStyle.color,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '11.5px',
                    fontWeight: '600',
                    transition: 'transform 0.15s ease'
                  }}
                  className="holiday-card-hover"
                >
                  <IconComp size={13} style={{ flexShrink: 0 }} />
                  <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1
                  }}>
                    {h.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // 3. Trailing Days of Next Month to complete 7x5 or 7x6 grid
    const totalRendered = firstDay + daysInMonth;
    const remainingSlots = (Math.ceil(totalRendered / 7) * 7) - totalRendered;
    for (let i = 1; i <= remainingSlots; i++) {
      days.push(
        <div 
          key={`next-${i}`} 
          style={{
            minHeight: '120px',
            backgroundColor: '#f8fafc',
            borderRight: '1px solid #f1f5f9',
            borderBottom: '1px solid #f1f5f9',
            padding: '10px',
            opacity: 0.45,
            cursor: 'default'
          }}
        >
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
            {i}
          </span>
        </div>
      );
    }

    return (
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
        overflow: 'hidden'
      }}>
        {/* Apple Calendar Navigation Bar */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          background: 'linear-gradient(180deg, #ffffff 0%, #fbfcfd 100%)'
        }}>
          {/* Month / Year Title with Apple Segment Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a', letterSpacing: '-0.02em' }}>
              {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>

            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '3px' }}>
              <button 
                type="button" 
                onClick={prevMonth}
                style={{ background: 'none', border: 'none', padding: '5px 8px', cursor: 'pointer', borderRadius: '6px', color: '#475569', display: 'flex', alignItems: 'center' }}
                title="Previous Month"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                type="button" 
                onClick={jumpToToday}
                style={{ background: '#ffffff', border: 'none', padding: '4px 10px', cursor: 'pointer', borderRadius: '6px', color: '#0f172a', fontSize: '12px', fontWeight: '600', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
                title="Jump to Current Month"
              >
                Today
              </button>
              <button 
                type="button" 
                onClick={nextMonth}
                style={{ background: 'none', border: 'none', padding: '5px 8px', cursor: 'pointer', borderRadius: '6px', color: '#475569', display: 'flex', alignItems: 'center' }}
                title="Next Month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Month Holiday Stats Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', fontSize: '12px', fontWeight: '600', color: '#c2410c' }}>
              <Flag size={13} color="#ea580c" />
              <span>National: <strong>{nationalCount}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', fontSize: '12px', fontWeight: '600', color: '#7e22ce' }}>
              <PartyPopper size={13} color="#9333ea" />
              <span>Festivals: <strong>{festivalCount}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', fontSize: '12px', fontWeight: '600', color: '#0f766e' }}>
              <Landmark size={13} color="#0d9488" />
              <span>Gazetted: <strong>{gazettedCount}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '6px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '600', color: '#334155' }}>
              <span>Total Holidays: <strong>{monthHolidays.length}</strong></span>
            </div>
          </div>
        </div>

        {/* Days of the Week Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0'
        }}>
          {[
            { label: 'Sun', color: '#ef4444' },
            { label: 'Mon', color: '#475569' },
            { label: 'Tue', color: '#475569' },
            { label: 'Wed', color: '#475569' },
            { label: 'Thu', color: '#475569' },
            { label: 'Fri', color: '#475569' },
            { label: 'Sat', color: '#64748b' }
          ].map((d, idx) => (
            <div 
              key={idx} 
              style={{
                padding: '10px 4px',
                textAlign: 'center',
                fontWeight: '700',
                fontSize: '12px',
                color: d.color,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderRight: idx < 6 ? '1px solid #f1f5f9' : 'none'
              }}
            >
              {d.label}
            </div>
          ))}
        </div>

        {/* Calendar Days 7-column Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          backgroundColor: '#ffffff'
        }}>
          {days}
        </div>
      </div>
    );
  };

  // Table List View (Clean & modern)
  const renderList = () => {
    return (
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
        <table className="leave-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Holiday Name</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Date</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Day</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Category</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Applicable Location</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Status</th>
              <th style={{ padding: '14px 18px', fontWeight: '600' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredHolidays.length > 0 ? filteredHolidays.map((h) => {
              const d = new Date(h.holiday_date);
              const hStyle = getHolidayStyle(h.type);
              const IconComp = hStyle.icon;

              return (
                <tr key={h.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '14px 18px', fontWeight: '600', color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: hStyle.bg, border: `1px solid ${hStyle.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: hStyle.color }}>
                        <IconComp size={15} />
                      </div>
                      <div>
                        <div>{h.name}</div>
                        {h.description && <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 'normal' }}>{h.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334155', fontWeight: '500' }}>
                    {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>
                    {d.toLocaleDateString('en-US', { weekday: 'long' })}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      background: hStyle.bg,
                      color: hStyle.color,
                      border: `1px solid ${hStyle.border}`
                    }}>
                      {h.type || 'Holiday'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#64748b' }}>{h.location || 'All'}</td>
                  <td style={{ padding: '14px 18px' }}>
                    {h.is_active ? 
                      <span style={{ color: '#059669', background: '#d1fae5', padding: '3px 9px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>Active</span> : 
                      <span style={{ color: '#9ca3af', background: '#f3f4f6', padding: '3px 9px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>Inactive</span>
                    }
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        type="button"
                        onClick={() => handleOpenModal(h)} 
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#2563eb' }}
                        title="Edit Holiday"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(h.id, h.name)} 
                        style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#dc2626' }}
                        title="Delete Holiday"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8' }}>
                  <CalendarIcon size={36} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                  <div style={{ fontSize: '15px', fontWeight: '600', color: '#475569' }}>No holidays scheduled for {year}</div>
                  <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>Click "Import Indian Holidays" or "Custom Preset" to schedule holidays.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="leave-holidays" style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '30px' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '12px 18px',
          borderRadius: '10px',
          backgroundColor: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: toast.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${toast.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 9999,
          fontWeight: '600',
          fontSize: '13.5px'
        }}>
          {toast.type === 'error' ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Header & Action Controls (Single Clean Row) */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '20px',
        padding: '12px 18px',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        
        {/* Left Side: Back & Search Filters */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: 0 }}>
          {onBack && (
            <button 
              type="button" 
              onClick={onBack}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '7px 13px', 
                borderRadius: '8px', 
                cursor: 'pointer', 
                border: '1px solid #cbd5e1', 
                background: '#ffffff', 
                color: '#334155', 
                fontSize: '13px', 
                fontWeight: '600', 
                height: '36px',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              <ArrowLeft size={15} /> Back
            </button>
          )}

          <select 
            value={year} 
            onChange={e => {
              const y = parseInt(e.target.value);
              setYear(y);
              setCalendarYear(y);
            }}
            style={{ 
              padding: '7px 12px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px', 
              outline: 'none', 
              height: '36px', 
              fontSize: '13px', 
              fontWeight: '600', 
              backgroundColor: '#f8fafc', 
              color: '#1e293b',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {[currentYear - 1, currentYear, currentYear + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select 
            value={typeFilter} 
            onChange={e => setTypeFilter(e.target.value)}
            style={{ 
              padding: '7px 12px', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px', 
              outline: 'none', 
              height: '36px', 
              fontSize: '13px', 
              fontWeight: '500', 
              backgroundColor: '#f8fafc', 
              color: '#1e293b',
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            <option value="All">All Categories</option>
            <option value="National">🇮🇳 National</option>
            <option value="Festival">✨ Festival</option>
            <option value="Gazetted">🏛️ Gazetted</option>
            <option value="Optional">🏷️ Optional</option>
          </select>

          <div style={{ position: 'relative', flex: 1, maxWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '11px', color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search holidays..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ 
                padding: '7px 10px 7px 30px', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                outline: 'none', 
                width: '100%', 
                height: '36px', 
                fontSize: '13px', 
                backgroundColor: '#ffffff'
              }}
            />
          </div>
        </div>

        {/* Right Side: View Switcher & Action Buttons (Uncongested, Single Row) */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexShrink: 0 }}>
          
          {/* View Toggle */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', borderRadius: '8px', padding: '2px', height: '36px' }}>
            <button 
              type="button"
              onClick={() => setView('calendar')}
              style={{ 
                padding: '5px 12px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px', 
                background: view === 'calendar' ? '#ffffff' : 'transparent', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                color: view === 'calendar' ? '#0f172a' : '#64748b', 
                fontWeight: view === 'calendar' ? '700' : '500', 
                fontSize: '12.5px', 
                boxShadow: view === 'calendar' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', 
                transition: 'all 0.15s' 
              }}
            >
              <CalendarIcon size={14} /> Calendar
            </button>
            <button 
              type="button"
              onClick={() => setView('list')}
              style={{ 
                padding: '5px 12px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '5px', 
                background: view === 'list' ? '#ffffff' : 'transparent', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer', 
                color: view === 'list' ? '#0f172a' : '#64748b', 
                fontWeight: view === 'list' ? '700' : '500', 
                fontSize: '12.5px', 
                boxShadow: view === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', 
                transition: 'all 0.15s' 
              }}
            >
              <ListIcon size={14} /> List
            </button>
          </div>

          {/* Custom Preset Button */}
          <button 
            type="button"
            onClick={openCommonModal}
            style={{ 
              padding: '7px 14px', 
              background: '#ffffff', 
              color: '#334155', 
              border: '1px solid #cbd5e1', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px', 
              fontWeight: '600', 
              height: '36px', 
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
              transition: 'all 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#ffffff'}
          >
            <FileText size={15} color="#2563eb" />
            <span>Custom Preset</span>
          </button>
          
          {/* Add Holiday Button */}
          <button 
            type="button"
            onClick={() => handleOpenModal()}
            style={{ 
              padding: '7px 16px', 
              background: '#2563eb', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              fontSize: '13px', 
              fontWeight: '600', 
              height: '36px', 
              boxShadow: '0 2px 5px rgba(37,99,235,0.25)',
              transition: 'background-color 0.15s'
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#1d4ed8'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#2563eb'}
          >
            <Plus size={16} />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      {/* Main View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', margin: '0 auto 10px', border: '3px solid #e2e8f0', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span>Loading holiday calendar...</span>
        </div>
      ) : (
        view === 'calendar' ? renderAppleCalendar() : renderList()
      )}

      {/* Add / Edit Holiday Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '28px', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                {editMode ? 'Edit Holiday' : 'Add New Holiday'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <XCircle size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Holiday Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Diwali (Deepavali)"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Date</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.holiday_date}
                    onChange={e => setFormData({...formData, holiday_date: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Category</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="National">🇮🇳 National Holiday</option>
                    <option value="Festival">✨ Festival Holiday</option>
                    <option value="Gazetted">🏛️ Gazetted Holiday</option>
                    <option value="Optional">🏷️ Optional / Restricted</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Applicable Location</label>
                <input 
                  type="text" 
                  value={formData.location}
                  placeholder="All or specific branch (e.g. Bengaluru, Hubballi)"
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>Description (Optional)</label>
                <textarea 
                  value={formData.description}
                  placeholder="Additional details regarding celebration or holiday policy"
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', minHeight: '75px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                <input 
                  type="checkbox" 
                  id="active-check"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                />
                <label htmlFor="active-check" style={{ fontSize: '13.5px', fontWeight: '500', color: '#1e293b', cursor: 'pointer' }}>Active (applies to employee calendars & attendance summary)</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '9px 18px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: '600', color: '#475569' }}>Cancel</button>
                <button type="submit" style={{ padding: '9px 20px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: '600', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}>{editMode ? 'Update Holiday' : 'Save Holiday'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Common Holidays Preset Modal (with Select All and Upsert) */}
      {showCommonModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '680px', maxHeight: '88vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' }}>
                  Add Common Indian Holidays ({calendarYear})
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                  Select official Indian festivals and national holidays to schedule. Dates sync with employee portals automatically.
                </p>
              </div>
              <button onClick={() => setShowCommonModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <XCircle size={22} />
              </button>
            </div>

            {/* Quick Actions / Select All Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600', color: '#334155', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCommonHolidaysForm(commonHolidaysForm.map(h => ({ ...h, checked })));
                  }}
                  checked={commonHolidaysForm.length > 0 && commonHolidaysForm.every(h => h.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#0d9488', cursor: 'pointer' }}
                />
                <span>Select All ({commonHolidaysForm.length} Holidays)</span>
              </label>

              <span style={{ fontSize: '12px', fontWeight: '600', color: '#0d9488' }}>
                {commonHolidaysForm.filter(h => h.checked).length} selected
              </span>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', width: '40px' }}></th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600' }}>Holiday Name</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', width: '160px' }}>Scheduled Date</th>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: '600', width: '120px' }}>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {commonHolidaysForm.map((h, idx) => {
                    const hStyle = getHolidayStyle(h.type);

                    return (
                      <tr key={h.id || idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: h.checked ? '#fafafa' : '#ffffff' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <input 
                            type="checkbox" 
                            checked={h.checked}
                            onChange={(e) => {
                              const newForm = [...commonHolidaysForm];
                              newForm.find(item => item.id === h.id).checked = e.target.checked;
                              setCommonHolidaysForm(newForm);
                            }}
                            style={{ width: '16px', height: '16px', accentColor: '#0d9488', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{h.name}</div>
                          {h.desc && <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>{h.desc}</div>}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <input 
                            type="date" 
                            value={h.date} 
                            onChange={(e) => {
                              const newForm = [...commonHolidaysForm];
                              newForm.find(item => item.id === h.id).date = e.target.value;
                              setCommonHolidaysForm(newForm);
                            }}
                            style={{ padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '13px', outline: 'none', width: '100%' }}
                          />
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            background: hStyle.bg,
                            color: hStyle.color,
                            border: `1px solid ${hStyle.border}`
                          }}>
                            {h.type}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '18px' }}>
              <button type="button" onClick={() => setShowCommonModal(false)} style={{ padding: '9px 18px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: '600', color: '#475569' }}>Cancel</button>
              <button type="button" onClick={submitCommonHolidays} style={{ padding: '9px 22px', background: '#0d9488', color: '#ffffff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13.5px', fontWeight: '600', boxShadow: '0 2px 6px rgba(13,148,136,0.3)' }}>Add Selected Holidays</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Custom CSS for Calendar Micro-interactions */}
      <style>{`
        .apple-calendar-cell:hover {
          background-color: #f1f5f9 !important;
          z-index: 2;
        }
        .holiday-card-hover:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.08) !important;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
      
    </div>
  );
};

export default LeaveHolidays;

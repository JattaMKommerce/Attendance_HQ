/**
 * Natural Language Date Resolver for HRMS AI Command Assistant (Phase 2)
 * 
 * Supports relative, conversational, and explicit calendar date expressions:
 * - "today", "yesterday", "tomorrow"
 * - "this week", "last week"
 * - "this month", "next month", "last month"
 * - "Friday", "this Friday", "next Friday"
 * - "15 September", "15th September", "September 15", "September 15th"
 * - "between 1 September and 10 September", "from September 20 to September 22"
 * 
 * Resolves dates using organization/application timezone (default: process.env.APP_TIMEZONE || 'Asia/Kolkata')
 * and avoids silently guessing dates when strict resolution is requested.
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const SHORT_MONTH_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'
];

const DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

/**
 * Format Date to YYYY-MM-DD
 */
function formatDate(date) {
  if (!date || isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get current date in designated application timezone.
 */
function getNowInTimezone(tz = process.env.APP_TIMEZONE || 'Asia/Kolkata') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    const map = {};
    for (const p of parts) map[p.type] = p.value;
    return new Date(parseInt(map.year, 10), parseInt(map.month, 10) - 1, parseInt(map.day, 10));
  } catch (e) {
    return new Date();
  }
}

/**
 * Resolve natural language date reference into concrete ISO date strings.
 * 
 * @param {string} text - User natural language text
 * @param {Date|object} [opts] - Reference date or options object { referenceDate, timezone, strict }
 * @returns {object} resolved date payload
 */
function resolveDate(text, opts = {}) {
  let referenceDate;
  let strict = false;
  let timezone = process.env.APP_TIMEZONE || 'Asia/Kolkata';

  if (opts instanceof Date) {
    referenceDate = opts;
  } else if (typeof opts === 'object') {
    referenceDate = opts.referenceDate || null;
    if (opts.strict !== undefined) strict = opts.strict;
    if (opts.timezone) timezone = opts.timezone;
  }

  const baseDate = referenceDate ? new Date(referenceDate) : getNowInTimezone(timezone);
  const ref = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());

  if (!text || typeof text !== 'string' || !text.trim()) {
    if (strict) {
      return { resolved: false, isAmbiguous: true, reason: 'No date reference provided.' };
    }
    const todayStr = formatDate(ref);
    return {
      resolved: true,
      date: todayStr,
      startDate: todayStr,
      endDate: todayStr,
      month: ref.getMonth() + 1,
      monthName: capitalize(MONTH_NAMES[ref.getMonth()]),
      year: ref.getFullYear()
    };
  }

  const clean = text.toLowerCase().trim();

  // 1. Direct ISO match (YYYY-MM-DD)
  const isoMatch = clean.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    const dStr = formatDate(d);
    return {
      resolved: true,
      date: dStr,
      startDate: dStr,
      endDate: dStr,
      month: d.getMonth() + 1,
      monthName: capitalize(MONTH_NAMES[d.getMonth()]),
      year: d.getFullYear()
    };
  }

  // 2. Relative keywords: today, tomorrow, yesterday
  if (/\btoday\b/.test(clean)) {
    const todayStr = formatDate(ref);
    return {
      resolved: true,
      date: todayStr,
      startDate: todayStr,
      endDate: todayStr,
      month: ref.getMonth() + 1,
      monthName: capitalize(MONTH_NAMES[ref.getMonth()]),
      year: ref.getFullYear()
    };
  }

  if (/\btomorrow\b/.test(clean)) {
    const tom = new Date(ref);
    tom.setDate(tom.getDate() + 1);
    const tomStr = formatDate(tom);
    return {
      resolved: true,
      date: tomStr,
      startDate: tomStr,
      endDate: tomStr,
      month: tom.getMonth() + 1,
      monthName: capitalize(MONTH_NAMES[tom.getMonth()]),
      year: tom.getFullYear()
    };
  }

  if (/\byesterday\b/.test(clean)) {
    const yest = new Date(ref);
    yest.setDate(yest.getDate() - 1);
    const yestStr = formatDate(yest);
    return {
      resolved: true,
      date: yestStr,
      startDate: yestStr,
      endDate: yestStr,
      month: yest.getMonth() + 1,
      monthName: capitalize(MONTH_NAMES[yest.getMonth()]),
      year: yest.getFullYear()
    };
  }

  // 3. Relative weeks: "this week", "last week"
  if (/\bthis week\b/.test(clean)) {
    const dayOfWeek = ref.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(ref);
    monday.setDate(ref.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      resolved: true,
      date: formatDate(monday),
      startDate: formatDate(monday),
      endDate: formatDate(sunday),
      daysCount: 7,
      month: monday.getMonth() + 1,
      monthName: capitalize(MONTH_NAMES[monday.getMonth()]),
      year: monday.getFullYear()
    };
  }

  if (/\blast week\b/.test(clean) || /\bprevious week\b/.test(clean)) {
    const dayOfWeek = ref.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const prevMonday = new Date(ref);
    prevMonday.setDate(ref.getDate() - diffToMonday - 7);

    const prevSunday = new Date(prevMonday);
    prevSunday.setDate(prevMonday.getDate() + 6);

    return {
      resolved: true,
      date: formatDate(prevMonday),
      startDate: formatDate(prevMonday),
      endDate: formatDate(prevSunday),
      daysCount: 7,
      month: prevMonday.getMonth() + 1,
      monthName: capitalize(MONTH_NAMES[prevMonday.getMonth()]),
      year: prevMonday.getFullYear()
    };
  }

  // 4. Relative months: "this month", "last month", "next month"
  if (/\bthis month\b/.test(clean) || /\bcurrent month\b/.test(clean)) {
    const m = ref.getMonth();
    const y = ref.getFullYear();
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    return {
      resolved: true,
      date: formatDate(ref),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: end.getDate(),
      month: m + 1,
      monthName: capitalize(MONTH_NAMES[m]),
      year: y
    };
  }

  if (/\blast month\b/.test(clean) || /\bprevious month\b/.test(clean)) {
    let m = ref.getMonth() - 1;
    let y = ref.getFullYear();
    if (m < 0) { m = 11; y--; }
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    return {
      resolved: true,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: end.getDate(),
      month: m + 1,
      monthName: capitalize(MONTH_NAMES[m]),
      year: y
    };
  }

  if (/\bnext month\b/.test(clean)) {
    let m = ref.getMonth() + 1;
    let y = ref.getFullYear();
    if (m > 11) { m = 0; y++; }
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 0);

    return {
      resolved: true,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: end.getDate(),
      month: m + 1,
      monthName: capitalize(MONTH_NAMES[m]),
      year: y
    };
  }

  // 4b. Quarters: "this quarter", "current quarter", "last quarter", "previous quarter", "next quarter"
  if (/\bthis quarter\b/.test(clean) || /\bcurrent quarter\b/.test(clean)) {
    const curQ = Math.floor(ref.getMonth() / 3);
    const y = ref.getFullYear();
    const start = new Date(y, curQ * 3, 1);
    const end = new Date(y, (curQ + 1) * 3, 0);

    return {
      resolved: true,
      periodName: `Q${curQ + 1} ${y}`,
      quarter: curQ + 1,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
      year: y
    };
  }

  if (/\blast quarter\b/.test(clean) || /\bprevious quarter\b/.test(clean)) {
    let curQ = Math.floor(ref.getMonth() / 3) - 1;
    let y = ref.getFullYear();
    if (curQ < 0) { curQ = 3; y--; }
    const start = new Date(y, curQ * 3, 1);
    const end = new Date(y, (curQ + 1) * 3, 0);

    return {
      resolved: true,
      periodName: `Q${curQ + 1} ${y}`,
      quarter: curQ + 1,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
      year: y
    };
  }

  if (/\bnext quarter\b/.test(clean)) {
    let curQ = Math.floor(ref.getMonth() / 3) + 1;
    let y = ref.getFullYear();
    if (curQ > 3) { curQ = 0; y++; }
    const start = new Date(y, curQ * 3, 1);
    const end = new Date(y, (curQ + 1) * 3, 0);

    return {
      resolved: true,
      periodName: `Q${curQ + 1} ${y}`,
      quarter: curQ + 1,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
      year: y
    };
  }

  // 4c. Specific Quarters: Q1, Q2, Q3, Q4 with optional year (e.g. "Q3", "for Q3", "Q3 2026", "2026 Q3")
  const specificQMatch = clean.match(/\b(?:in\s+|for\s+)?(?:q([1-4])|quarter\s*([1-4]))(?:\s+(\d{4}))?\b/i) ||
                         clean.match(/\b(\d{4})\s+q([1-4])\b/i);
  if (specificQMatch) {
    const qNum = parseInt(specificQMatch[1] || specificQMatch[2] || (specificQMatch[0].match(/q([1-4])/i) ? specificQMatch[0].match(/q([1-4])/i)[1] : '1'), 10);
    const yearMatch = clean.match(/\b(20\d{2})\b/);
    const y = yearMatch ? parseInt(yearMatch[1], 10) : ref.getFullYear();
    const curQ = qNum - 1;
    const start = new Date(y, curQ * 3, 1);
    const end = new Date(y, (curQ + 1) * 3, 0);

    return {
      resolved: true,
      periodName: `Q${qNum} ${y}`,
      quarter: qNum,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
      year: y
    };
  }

  // 4d. Years: "this year", "current year", "last year", "previous year", "next year"
  if (/\bthis year\b/.test(clean) || /\bcurrent year\b/.test(clean)) {
    const y = ref.getFullYear();
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    return {
      resolved: true,
      periodName: `${y}`,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
      year: y
    };
  }

  if (/\blast year\b/.test(clean) || /\bprevious year\b/.test(clean)) {
    const y = ref.getFullYear() - 1;
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    return {
      resolved: true,
      periodName: `${y}`,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
      year: y
    };
  }

  if (/\bnext year\b/.test(clean)) {
    const y = ref.getFullYear() + 1;
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    return {
      resolved: true,
      periodName: `${y}`,
      date: formatDate(start),
      startDate: formatDate(start),
      endDate: formatDate(end),
      daysCount: Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1,
      year: y
    };
  }

  // 5. Explicit range: "between 1 September and 10 September" or "between September 1 and September 10"
  const betweenPattern = /\bbetween\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+|[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?)\s+and\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+[a-z]+|[a-z]+\s+\d{1,2}(?:st|nd|rd|th)?)\b/i;
  const betweenMatch = clean.match(betweenPattern);
  if (betweenMatch) {
    const p1 = parseDayAndMonth(betweenMatch[1], ref.getFullYear());
    const p2 = parseDayAndMonth(betweenMatch[2], ref.getFullYear());
    if (p1 && p2) {
      return {
        resolved: true,
        date: formatDate(p1),
        startDate: formatDate(p1),
        endDate: formatDate(p2),
        daysCount: Math.round((p2 - p1) / (1000 * 60 * 60 * 24)) + 1,
        month: p1.getMonth() + 1,
        monthName: capitalize(MONTH_NAMES[p1.getMonth()]),
        year: p1.getFullYear()
      };
    }
  }

  // 6. Range: "from September 20 to September 22" or "from 1 Sept to 10 Sept" or "Sept 20 to 22"
  const fromToPattern = /(?:from\s+)?([a-z]+|\d{1,2}(?:st|nd|rd|th)?)\s+([a-z]+|\d{1,2}(?:st|nd|rd|th)?)\s+(?:to|-|until|through)\s+(?:([a-z]+|\d{1,2}(?:st|nd|rd|th)?)\s+)?([a-z]+|\d{1,2}(?:st|nd|rd|th)?)/i;
  const fromToMatch = clean.match(fromToPattern);
  if (fromToMatch) {
    const partA = `${fromToMatch[1]} ${fromToMatch[2]}`.trim();
    const partB = fromToMatch[3] ? `${fromToMatch[3]} ${fromToMatch[4]}`.trim() : fromToMatch[4].trim();

    let p1 = parseDayAndMonth(partA, ref.getFullYear());
    let p2 = parseDayAndMonth(partB, ref.getFullYear());

    // Handle "Sept 20 to 22" where partB is just "22"
    if (p1 && !p2 && /^\d{1,2}(?:st|nd|rd|th)?$/.test(partB)) {
      const dayNum = parseInt(partB, 10);
      p2 = new Date(p1.getFullYear(), p1.getMonth(), dayNum);
    }

    if (p1 && p2) {
      return {
        resolved: true,
        date: formatDate(p1),
        startDate: formatDate(p1),
        endDate: formatDate(p2),
        daysCount: Math.round((p2 - p1) / (1000 * 60 * 60 * 24)) + 1,
        month: p1.getMonth() + 1,
        monthName: capitalize(MONTH_NAMES[p1.getMonth()]),
        year: p1.getFullYear()
      };
    }
  }

  // 7. Explicit single date:
  // 7a. "15 September" / "15th September" (Day first)
  const dayFirstPattern = /\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\b/i;
  const dayFirstMatch = clean.match(dayFirstPattern);
  if (dayFirstMatch) {
    const mIdx = findMonthIndex(dayFirstMatch[2]);
    if (mIdx !== -1) {
      const dNum = parseInt(dayFirstMatch[1], 10);
      const dObj = new Date(ref.getFullYear(), mIdx, dNum);
      const dStr = formatDate(dObj);
      return {
        resolved: true,
        date: dStr,
        startDate: dStr,
        endDate: dStr,
        month: mIdx + 1,
        monthName: capitalize(MONTH_NAMES[mIdx]),
        year: dObj.getFullYear()
      };
    }
  }

  // 7b. "September 15" / "September 15th" (Month first)
  const monthFirstPattern = /\b([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthFirstMatch = clean.match(monthFirstPattern);
  if (monthFirstMatch) {
    const mIdx = findMonthIndex(monthFirstMatch[1]);
    if (mIdx !== -1) {
      const dNum = parseInt(monthFirstMatch[2], 10);
      const dObj = new Date(ref.getFullYear(), mIdx, dNum);
      const dStr = formatDate(dObj);
      return {
        resolved: true,
        date: dStr,
        startDate: dStr,
        endDate: dStr,
        month: mIdx + 1,
        monthName: capitalize(MONTH_NAMES[mIdx]),
        year: dObj.getFullYear()
      };
    }
  }

  // 8. Day of week: "Friday", "this Friday", "next Friday"
  for (let i = 0; i < DAY_NAMES.length; i++) {
    const dayName = DAY_NAMES[i];
    if (new RegExp(`\\b(?:next\\s+)?(?:this\\s+)?${dayName}\\b`, 'i').test(clean)) {
      const targetDay = i;
      const currentDay = ref.getDay();
      let diff = targetDay - currentDay;

      const isNext = new RegExp(`\\bnext\\s+${dayName}\\b`, 'i').test(clean);

      if (isNext) {
        // "next Friday": If today is Wed, Friday is in 2 days. Next Friday is in 9 days.
        diff = diff <= 0 ? diff + 14 : diff + 7;
      } else {
        // "Friday" or "this Friday"
        if (diff <= 0) {
          diff += 7; // Upcoming occurrence
        }
      }

      const targetDate = new Date(ref);
      targetDate.setDate(ref.getDate() + diff);
      const targetStr = formatDate(targetDate);

      return {
        resolved: true,
        date: targetStr,
        startDate: targetStr,
        endDate: targetStr,
        month: targetDate.getMonth() + 1,
        monthName: capitalize(MONTH_NAMES[targetDate.getMonth()]),
        year: targetDate.getFullYear()
      };
    }
  }

  // 9. Named Month by itself: "September", "August"
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (new RegExp(`\\b${MONTH_NAMES[i]}\\b`, 'i').test(clean)) {
      const y = ref.getFullYear();
      const start = new Date(y, i, 1);
      const end = new Date(y, i + 1, 0);
      return {
        resolved: true,
        date: formatDate(start),
        startDate: formatDate(start),
        endDate: formatDate(end),
        daysCount: end.getDate(),
        month: i + 1,
        monthName: capitalize(MONTH_NAMES[i]),
        year: y
      };
    }
  }

  // Strict handling: If caller explicitly required a date, return ambiguous/unresolved
  if (strict) {
    return {
      resolved: false,
      isAmbiguous: true,
      reason: `Could not determine a specific date from "${text}". Please provide a date like "yesterday", "Friday", or "15 September".`
    };
  }

  // Non-strict default fallback (e.g. for general attendance queries)
  const defaultDateStr = formatDate(ref);
  return {
    resolved: true,
    date: defaultDateStr,
    startDate: defaultDateStr,
    endDate: defaultDateStr,
    month: ref.getMonth() + 1,
    monthName: capitalize(MONTH_NAMES[ref.getMonth()]),
    year: ref.getFullYear()
  };
}

/**
 * Parse combined day and month string (e.g. "1 September" or "September 1")
 */
function parseDayAndMonth(str, year = new Date().getFullYear()) {
  if (!str) return null;
  const clean = str.trim().toLowerCase();

  // "1 September" or "1st September"
  const m1 = clean.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)$/);
  if (m1) {
    const monthIdx = findMonthIndex(m1[2]);
    if (monthIdx !== -1) {
      return new Date(year, monthIdx, parseInt(m1[1], 10));
    }
  }

  // "September 1" or "September 1st"
  const m2 = clean.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/);
  if (m2) {
    const monthIdx = findMonthIndex(m2[1]);
    if (monthIdx !== -1) {
      return new Date(year, monthIdx, parseInt(m2[2], 10));
    }
  }

  return null;
}

function findMonthIndex(str) {
  if (!str) return -1;
  const clean = str.toLowerCase();
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (clean === MONTH_NAMES[i] || MONTH_NAMES[i].startsWith(clean)) return i;
  }
  for (let i = 0; i < SHORT_MONTH_NAMES.length; i++) {
    if (clean === SHORT_MONTH_NAMES[i]) {
      return i > 3 ? (i === 4 ? 3 : (i > 4 ? i - 1 : i)) : i;
    }
  }
  return -1;
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Validate that start date is before or equal to end date.
 * 
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return { valid: false, reason: 'Both start date and end date are required.' };
  }
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return { valid: false, reason: 'Invalid date format provided.' };
  }
  if (s > e) {
    return { valid: false, reason: 'Invalid date range: start date must be before or equal to end date.' };
  }
  return { valid: true };
}

module.exports = {
  resolveDate,
  formatDate,
  getNowInTimezone,
  validateDateRange
};

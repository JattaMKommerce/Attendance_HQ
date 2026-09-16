/**
 * Google Gemini Provider for HRMS AI Assistant
 * 
 * Extends AIProvider base class.
 * Uses Gemini JSON structured outputs when GEMINI_API_KEY is configured.
 */

const AIProvider = require('./aiProvider');

class GeminiProvider extends AIProvider {
  constructor(apiKey, model = 'gemini-1.5-flash') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  async resolveIntent(text, context = {}) {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured.');
    }

    const systemPrompt = `You are the backend AI parser for an HRMS system.
Your job is to analyze natural language user commands and map them to one of the following authorized HRMS tool intents:

ADMIN INTENTS:
- list_employees
- get_employee_details (employee)
- get_employee (employee)
- create_employee (name, designationName, departmentName, joiningDate, email)
- update_employee (employee, designation, department, phone)
- deactivate_employee (employee)
- get_attendance (department, filter, date)
- get_absent_today (date)
- get_leave_requests (employee, action)
- get_payroll_information
- update_employee_salary (employee, basicSalary, grossSalary)
- compare_department_attendance (department1, department2, period, startDate, endDate)
- get_absenteeism_rate (period, startDate, endDate)
- get_leave_utilization (thresholdPercent, groupBy, year)
- get_employee_tenure
- get_employees_joined_range (period, startDate, endDate)
- get_consecutive_absences (consecutiveDays, startDate, endDate)
- get_department_headcount
- get_attendance_trends (period, startDate, endDate)
- get_leave_trends (year)

EMPLOYEE INTENTS:
- get_my_profile
- get_my_attendance (date, rawDateText)
- check_in
- check_out
- get_my_leave_balance (leaveType)
- get_my_leave_requests
- apply_leave (startDate, endDate, reason, leaveType)
- cancel_my_leave (requestId)
- get_my_payslip (month, year, rawText)
- update_my_profile (phone, emergency_contact, emergency_phone)
- get_my_onboarding_status
- get_my_tasks
- get_my_documents

OTHER:
- unknown

User roles: ${context.roles?.join(', ') || 'EMPLOYEE'}.
User input: ${JSON.stringify(text)}.

Respond strictly with valid JSON with keys:
"tool": (string registered tool name),
"intent": (string registered tool name),
"params": (extracted parameters object),
"confidence": (number between 0 and 1)`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;

    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey
        },
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            responseMimeType: 'application/json'
          }
        })
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
        throw new Error('Gemini API request timed out (10s threshold exceeded)');
      }
      throw fetchErr;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      throw new Error('Empty response from Gemini');
    }

    const parsed = JSON.parse(rawContent);
    return {
      tool: parsed.tool || parsed.intent || 'unknown',
      intent: parsed.intent || parsed.tool || 'unknown',
      params: parsed.params || {},
      confidence: parsed.confidence || 0.9,
      rawResponse: parsed
    };
  }
}

module.exports = GeminiProvider;

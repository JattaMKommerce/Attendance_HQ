/**
 * OpenAI Provider for HRMS AI Assistant
 * 
 * Extends AIProvider base class.
 */

const AIProvider = require('./aiProvider');

class OpenAiProvider extends AIProvider {
  constructor(apiKey, model = 'gpt-4o-mini') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  async resolveIntent(text, context = {}) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const systemPrompt = `You are the backend AI parser for an HRMS system.
Your job is to analyze natural language user commands and map them to one of the following authorized HRMS tool intents:

ADMIN: list_employees, get_employee_details, get_employee, create_employee, update_employee, deactivate_employee, get_attendance, get_absent_today, get_leave_requests, get_payroll_information, update_employee_salary, compare_department_attendance, get_absenteeism_rate, get_leave_utilization, get_employee_tenure, get_employees_joined_range, get_consecutive_absences, get_department_headcount, get_attendance_trends, get_leave_trends
EMPLOYEE: get_my_profile, get_my_attendance, check_in, check_out, get_my_leave_balance, get_my_leave_requests, apply_leave, cancel_my_leave, get_my_payslip, update_my_profile, get_my_onboarding_status, get_my_tasks, get_my_documents
OTHER: unknown

User roles: ${context.roles?.join(', ') || 'EMPLOYEE'}.
Respond strictly with valid JSON with keys: "tool" (string registered tool name), "intent" (string), "params" (object), "confidence" (number).`;

    let res;
    try {
      res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined,
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text }
          ],
          response_format: { type: 'json_object' }
        })
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
        throw new Error('OpenAI API request timed out (10s threshold exceeded)');
      }
      throw fetchErr;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    return {
      tool: parsed.tool || parsed.intent || 'unknown',
      intent: parsed.intent || parsed.tool || 'unknown',
      params: parsed.params || {},
      confidence: parsed.confidence || 0.9
    };
  }
}

module.exports = OpenAiProvider;

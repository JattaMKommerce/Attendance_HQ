/**
 * Groq Provider for HRMS AI Assistant (Ultra-Fast Inference)
 * 
 * Extends AIProvider base class.
 * Uses Groq's OpenAI-compatible completions API with Llama 3.3 70B / Llama 3.1 8B.
 */

const AIProvider = require('./aiProvider');

class GroqProvider extends AIProvider {
  constructor(apiKey, model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b') {
    super();
    this.apiKey = apiKey;
    this.model = model;
  }

  async resolveIntent(text, context = {}) {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY is not configured.');
    }

    const systemPrompt = `You are the backend AI parser for JMK HRMS.
Your job is to analyze natural language user commands and map them to one of the following authorized HRMS tool intents:

ADMIN INTENTS:
- list_employees
- get_employee_details (params: employee)
- get_employee (params: employee)
- create_employee (params: name, designationName, departmentName, joiningDate, email)
- update_employee (params: employee, designation, department, phone)
- deactivate_employee (params: employee)
- get_attendance (params: department, filter, date)
- get_absent_today (params: date)
- get_leave_requests (params: employee, action)
- get_payroll_information
- update_employee_salary (params: employee, basicSalary, grossSalary)
- compare_department_attendance (params: department1, department2, period, startDate, endDate)
- get_absenteeism_rate (params: period, startDate, endDate)
- get_leave_utilization (params: thresholdPercent, groupBy, year)
- get_employee_tenure
- get_employees_joined_range (params: period, startDate, endDate)
- get_consecutive_absences (params: consecutiveDays, startDate, endDate)
- get_department_headcount
- get_attendance_trends (params: period, startDate, endDate)
- get_leave_trends (params: year)

EMPLOYEE INTENTS:
- get_my_profile
- get_my_attendance (params: date, rawDateText)
- check_in
- check_out
- get_my_leave_balance (params: leaveType)
- get_my_leave_requests
- apply_leave (params: startDate, endDate, reason, leaveType)
- cancel_my_leave (params: requestId)
- get_my_payslip (params: month, year, rawText)
- update_my_profile (params: phone, emergency_contact, emergency_phone)
- get_my_onboarding_status
- get_my_tasks
- get_my_documents

OTHER:
- stella_greeting (for greetings like hi, hello, help, who are you)
- unknown (when input does not match any HRMS tool)

User roles: ${context.roles?.join(', ') || 'EMPLOYEE'}.
Respond strictly with valid JSON with keys:
"tool": (string registered tool name),
"intent": (string registered tool name),
"params": (object containing extracted parameters),
"confidence": (number between 0 and 1)`;

    let res;
    try {
      res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
          response_format: { type: 'json_object' },
          temperature: 0.1
        })
      });
    } catch (fetchErr) {
      if (fetchErr.name === 'TimeoutError' || fetchErr.name === 'AbortError') {
        throw new Error('Groq API request timed out (10s threshold exceeded)');
      }
      throw fetchErr;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Groq API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq');
    }

    const parsed = JSON.parse(content);
    return {
      tool: parsed.tool || parsed.intent || 'unknown',
      intent: parsed.intent || parsed.tool || 'unknown',
      params: parsed.params || {},
      confidence: parsed.confidence || 0.95
    };
  }

  async generateResponse(toolResult, context = {}) {
    if (!this.apiKey) {
      return toolResult?.message || (toolResult?.success ? 'Completed successfully.' : 'Failed.');
    }

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined,
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are Stella, the intelligent HR Assistant for JMK HRMS. Provide a warm, concise, professional, and clear 1-3 sentence summary of the HR action result for the user. Do not hallucinate data.'
            },
            {
              role: 'user',
              content: `Tool Execution Result: ${JSON.stringify(toolResult)}`
            }
          ],
          temperature: 0.3,
          max_tokens: 150
        })
      });

      if (!res.ok) return toolResult?.message;
      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() || toolResult?.message;
    } catch (err) {
      return toolResult?.message;
    }
  }
}

module.exports = GroqProvider;

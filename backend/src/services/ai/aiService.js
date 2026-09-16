/**
 * Central AI Command Assistant Service Orchestrator (Phase 2)
 * 
 * Pipeline:
 * User Request
 *   ↓
 * Authentication & Tenant Context (req.user)
 *   ↓
 * Role & Identity Extraction
 *   ↓
 * Multi-Turn Conversation Context & Active Workflow State Check
 *   ↓
 * AI Intent Resolution (AIProvider / SmartNLU)
 *   ↓
 * Tool Registry Verification (Strict 400 UNREGISTERED_TOOL Defense)
 *   ↓
 * Centralized RBAC Permission Validation (403 Defense)
 *   ↓
 * Entity & Date Resolution (Without Guessing / Ambiguity Detection)
 *   ↓
 * Slot Filling & Dangerous Action Interceptor (Summary + Confirmation Token)
 *   ↓
 * Approved HRMS Tool / Function Execution
 *   ↓
 * Dual Audit Logging (ai_action_logs & audit_logs)
 *   ↓
 * Human-Readable Structured AI Response
 */

const db = require('../../config/db');
const { getProvider } = require('./aiProviderFactory');
const { checkPermission, getAllowedIntents } = require('./aiPermissions');
const { isToolRegistered, getToolContract } = require('./toolRegistry');
const { resolveEmployee, resolveDepartment, resolveDesignation, resolveLeaveType } = require('./entityResolver');
const { resolveDate } = require('./dateResolver');
const { createPendingConfirmation, consumeConfirmation, cancelConfirmation } = require('./confirmationService');
const { logAiAction } = require('./auditLogger');
const conversationService = require('./conversationService');

// Controlled Backend Tool Implementations
const employeeTools = require('./tools/employeeTools');
const attendanceTools = require('./tools/attendanceTools');
const leaveTools = require('./tools/leaveTools');
const payrollTools = require('./tools/payrollTools');
const documentTools = require('./tools/documentTools');
const departmentTools = require('./tools/departmentTools');
const taskTools = require('./tools/taskTools');
const onboardingTools = require('./tools/onboardingTools');
const analyticsTools = require('./tools/analyticsTools');
const insightTools = require('./tools/insightTools');


/**
 * Helper to extract onboarding slots from natural language text
 */
function extractOnboardingSlots(text, currentSlots = {}) {
  const slots = { ...currentSlots };

  // 1. Email: standard email regex
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (emailMatch) {
    slots.email = emailMatch[1];
  }

  // 2. Department
  const deptMatch = text.match(/(?:department(?:\s+is|\s*:)?|\bdept(?:\s+is|\s*:)?|\bin\b)\s+([A-Za-z0-9 &_-]+?)(?=(?:\s+and\s+|\s*,|\s+designation|\s+role|\s+joining|\s+email|$))/i);
  if (deptMatch && !['next', 'this', 'the', 'a', 'an'].includes(deptMatch[1].trim().toLowerCase())) {
    slots.department = deptMatch[1].trim();
  } else if (!slots.department) {
    const knownDepts = text.match(/\b(IT|Information Technology|Engineering|HR|Human Resources|Sales|Marketing|Finance|Operations|Legal|Support)\b/i);
    if (knownDepts) {
      slots.department = knownDepts[1];
    }
  }

  // 3. Designation
  const desigMatch = text.match(/(?:designation(?:\s+is|\s*:)?|\brole(?:\s+is|\s*:)?|\bas\b)\s+([A-Za-z0-9 &_-]+?)(?=(?:\s+and\s+|\s*,|\s+department|\s+dept|\s+in\b|\s+joining|\s+email|$))/i);
  if (desigMatch && !['next', 'this', 'the', 'a', 'an', 'it', 'hr'].includes(desigMatch[1].trim().toLowerCase())) {
    slots.designation = desigMatch[1].trim();
  }

  // 4. Joining Date
  const joinMatch = text.match(/(?:joining\s*date(?:\s+is|\s*:)?|starts?(?:\s+on)?|starting(?:\s+on)?)\s+([A-Za-z0-9 -]+?)(?=(?:\s+and\s+|\s*,|\s+email|$))/i);
  if (joinMatch) {
    const parsed = resolveDate(joinMatch[1].trim());
    if (parsed && parsed.resolved && parsed.date) {
      slots.joiningDate = parsed.date;
    }
  } else {
    const parsedDate = resolveDate(text, { strict: true });
    if (parsedDate && parsedDate.resolved && parsedDate.date && !slots.joiningDate) {
      slots.joiningDate = parsedDate.date;
    }
  }

  return slots;
}

class AiService {
  /**
   * Process a natural language command from the user.
   * 
   * @param {string} commandText - User prompt
   * @param {object} userContext - req.user ({ id, employee_id, organization_id, roles, permissions })
   * @param {number|null} conversationId - Optional conversation ID
   * @returns {Promise<object>} execution response
   */
  async processCommand(commandText, userContext, conversationId = null) {
    if (!commandText || !commandText.trim()) {
      return {
        success: false,
        status: 400,
        message: 'Please provide a command or question for the AI assistant.'
      };
    }

    // 1. Validate Authentication & Organization Context (Strict Tenant Boundary)
    if (!userContext || !userContext.organization_id) {
      return {
        success: false,
        status: 401,
        message: 'Authentication required with valid organization context.'
      };
    }

    const organizationId = userContext.organization_id;
    const userRole = (userContext.roles && userContext.roles[0]) || 'EMPLOYEE';

    // 2. Retrieve or create conversation for multi-turn tracking
    let conversation;
    try {
      conversation = await conversationService.getOrCreateConversation(
        organizationId,
        userContext.id,
        conversationId
      );
    } catch (convErr) {
      console.error('[AiService] Conversation error:', convErr);
      return {
        success: false,
        status: 403,
        message: 'Unable to access conversation in this organization.'
      };
    }

    const activeConversationId = conversation.id;

    // Check if conversation is archived
    if (conversation.status === 'archived') {
      return {
        success: false,
        status: 400,
        conversation_id: activeConversationId,
        message: 'This conversation is archived and cannot receive new commands. Please start a new conversation.'
      };
    }

    // Auto-update conversation title from first command if currently default
    if (conversation.title === 'Command Center Session' || conversation.title === 'New Conversation' || !conversation.title) {
      const autoTitle = conversationService.generateConversationTitle(commandText.trim());
      await conversationService.updateConversation(activeConversationId, organizationId, userContext.id, { title: autoTitle }).catch(() => {});
      conversation.title = autoTitle;
    }

    // Record incoming user message
    await conversationService.addMessage(activeConversationId, organizationId, 'user', commandText.trim());

    // 3. Check for Active Multi-Turn Workflow State (e.g. Onboarding Slot Filling)
    const workflowState = await conversationService.getWorkflowState(
      activeConversationId,
      organizationId,
      userContext.id
    );

    if (workflowState && workflowState.workflow === 'onboarding') {
      const lowerCmd = commandText.trim().toLowerCase();

      // Handle cancellation
      if (['cancel', 'abort', 'stop', 'quit', 'nevermind'].includes(lowerCmd)) {
        await conversationService.clearWorkflowState(activeConversationId, organizationId, userContext.id);
        const cancelMsg = 'Onboarding workflow cancelled. No employee was created.';
        await conversationService.addMessage(activeConversationId, organizationId, 'assistant', cancelMsg);
        return {
          success: true,
          conversation_id: activeConversationId,
          message: cancelMsg
        };
      }

      // Check if user entered a distinct registered command (e.g. "Remove employee EMP-115", "Show employees...")
      let switchedCommand = false;
      const quickProvider = getProvider();
      if (quickProvider) {
        try {
          const quickParse = await quickProvider.resolveIntent(commandText.trim(), userContext);
          if (quickParse && quickParse.intent && !['unknown', 'create_employee', 'onboard_employee'].includes(quickParse.intent)) {
            await conversationService.clearWorkflowState(activeConversationId, organizationId, userContext.id);
            switchedCommand = true;
          }
        } catch (e) {}
      }

      if (!switchedCommand) {
        // Slot filling: merge newly provided details into current slots
        const currentSlots = workflowState.slots || {};
        const updatedSlots = extractOnboardingSlots(commandText.trim(), currentSlots);

      // Check missing required slots
      const missing = [];
      if (!updatedSlots.department) missing.push('Department');
      if (!updatedSlots.designation) missing.push('Designation');
      if (!updatedSlots.joiningDate) missing.push('Joining date');
      if (!updatedSlots.email) missing.push('Email');

      if (missing.length > 0) {
        // Still missing slots: save updated state and prompt for next missing details
        await conversationService.setWorkflowState(activeConversationId, organizationId, userContext.id, {
          workflow: 'onboarding',
          step: 'collecting_slots',
          slots: updatedSlots
        });

        const missingList = missing.map((m, idx) => `${idx + 1}. ${m}`).join('\n');
        const promptMsg = `Got it. I still need:\n${missingList}`;
        await conversationService.addMessage(activeConversationId, organizationId, 'assistant', promptMsg);

        return {
          success: true,
          conversation_id: activeConversationId,
          step: 'collecting_slots',
          message: promptMsg,
          missing_slots: missing,
          slots: updatedSlots
        };
      }

      // All slots filled! Produce Pre-creation Summary Card and Confirmation Token
      const empName = `${updatedSlots.firstName || 'Employee'} ${updatedSlots.lastName || ''}`.trim();
      const summary = {
        name: empName,
        department: updatedSlots.department,
        designation: updatedSlots.designation,
        joining_date: updatedSlots.joiningDate,
        email: updatedSlots.email,
        employee_code_preview: 'Generated automatically (e.g. EMP-001)',
        default_password_notice: 'A temporary activation credential will be generated for employee account activation',
        checklist: [
          'Create user account',
          'Create employee profile',
          `Assign department (${updatedSlots.department})`,
          `Assign designation (${updatedSlots.designation})`,
          'Initialize leave balance',
          'Generate onboarding checklist'
        ]
      };

      const pending = createPendingConfirmation({
        organizationId,
        userId: userContext.id,
        intent: 'onboard_employee',
        toolName: 'onboard_employee',
        params: updatedSlots,
        promptMessage: `Please confirm to create this employee:\n- Name: ${empName}\n- Department: ${updatedSlots.department}\n- Designation: ${updatedSlots.designation}\n- Joining Date: ${updatedSlots.joiningDate}\n- Email: ${updatedSlots.email}`,
        entityLabel: empName,
        impactDescription: 'This will create the user account, employee profile, assign department and designation, initialize leave balance, and generate an onboarding checklist.',
        originalCommand: commandText,
        summary
      });

      await conversationService.setWorkflowState(activeConversationId, organizationId, userContext.id, {
        workflow: 'onboarding',
        step: 'awaiting_confirmation',
        confirmationId: pending.confirmation_id,
        slots: updatedSlots
      });

      const assistantMsg = `Here is the onboarding summary:\n- Name: ${empName}\n- Department: ${updatedSlots.department}\n- Designation: ${updatedSlots.designation}\n- Joining Date: ${updatedSlots.joiningDate}\n- Email: ${updatedSlots.email}\n\nPlease confirm to create this employee.`;
      await conversationService.addMessage(activeConversationId, organizationId, 'assistant', assistantMsg);

      return {
        ...pending,
        conversation_id: activeConversationId,
        message: assistantMsg,
        summary
      };
      }
    }

    // 4. Check AI Provider Configuration
    const provider = getProvider();
    if (!provider) {
      return {
        success: false,
        status: 503,
        error: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'No AI provider is currently configured. Please configure an AI provider (e.g. set AI_PROVIDER=smart_nlu or GEMINI_API_KEY) in the backend environment.'
      };
    }

    // 5. Detect Intent and Parameters
    let parseResult;
    try {
      parseResult = await provider.resolveIntent(commandText.trim(), userContext);
    } catch (parseErr) {
      console.error('[AiService] Parse error:', parseErr);
      return {
        success: false,
        status: 500,
        message: "I couldn't process that command right now. Please try rephrasing your request."
      };
    }

    const { intent, params = {} } = parseResult || {};

    if (!intent || intent === 'unknown') {
      const unkMsg = "I didn't understand that command. Try asking to view attendance, apply for leave, check salary, manage employees, or view your profile.";
      await conversationService.addMessage(activeConversationId, organizationId, 'assistant', unkMsg);
      return {
        success: false,
        status: 400,
        conversation_id: activeConversationId,
        message: unkMsg
      };
    }

    // 6. Tool Registry Verification (LLM Tool Hallucination Defense)
    if (!isToolRegistered(intent)) {
      const unregMsg = `Tool "${intent}" is not a registered AI command.`;
      return {
        success: false,
        status: 400,
        error: 'UNREGISTERED_TOOL',
        conversation_id: activeConversationId,
        message: unregMsg
      };
    }

    // 7. Prevent Parameter Injection / Tenant Overriding
    params.organization_id = organizationId;
    if (params.user_id && userRole === 'EMPLOYEE') {
      params.user_id = userContext.id;
    }

    // 8. Authorize Intent with Role & Permissions Layer (403 Defense)
    const authCheck = checkPermission(intent, userContext, params);
    if (!authCheck.authorized) {
      await logAiAction({
        organizationId,
        userId: userContext.id,
        userRole,
        originalCommand: commandText,
        intent,
        toolName: intent,
        status: 'denied',
        errorMessage: authCheck.reason
      });

      const deniedMsg = authCheck.reason || "You don't have permission to perform that action.";
      await conversationService.addMessage(activeConversationId, organizationId, 'assistant', deniedMsg);

      return {
        success: false,
        status: authCheck.status || 403,
        conversation_id: activeConversationId,
        message: deniedMsg
      };
    }

    // 9. Onboarding Interceptor for Admin Intent: Check Slot Completeness
    if (intent === 'onboard_employee' || intent === 'create_employee') {
      let initialSlots = {
        firstName: params.firstName || (params.name ? params.name.split(' ')[0] : (params.employee ? params.employee.split(' ')[0] : '')),
        lastName: params.lastName || (params.name && params.name.includes(' ') ? params.name.split(' ').slice(1).join(' ') : ''),
        department: params.department || params.departmentName || null,
        designation: params.designation || params.designationName || null,
        joiningDate: params.joiningDate || (params.rawDateText ? resolveDate(params.rawDateText, { strict: true })?.date : null),
        email: params.email || null
      };

      initialSlots = extractOnboardingSlots(commandText.trim(), initialSlots);

      const missing = [];
      if (!initialSlots.department) missing.push('Department');
      if (!initialSlots.designation) missing.push('Designation');
      if (!initialSlots.joiningDate) missing.push('Joining date');
      if (!initialSlots.email) missing.push('Email');

      if (missing.length > 0) {
        await conversationService.setWorkflowState(activeConversationId, organizationId, userContext.id, {
          workflow: 'onboarding',
          step: 'collecting_slots',
          slots: initialSlots
        });

        const candidateName = initialSlots.firstName ? `${initialSlots.firstName}${initialSlots.lastName ? ' ' + initialSlots.lastName : ''}`.trim() : 'the employee';
        const missingList = missing.map((m, idx) => `${idx + 1}. ${m}`).join('\n');
        const promptMsg = `I can start ${candidateName}'s onboarding. I still need:\n${missingList}`;
        await conversationService.addMessage(activeConversationId, organizationId, 'assistant', promptMsg);

        return {
          success: true,
          conversation_id: activeConversationId,
          step: 'collecting_slots',
          message: promptMsg,
          missing_slots: missing,
          slots: initialSlots
        };
      }

      // All slots already supplied in single command!
      const empName = `${initialSlots.firstName || 'Employee'} ${initialSlots.lastName || ''}`.trim();
      const summary = {
        name: empName,
        department: initialSlots.department,
        designation: initialSlots.designation,
        joining_date: initialSlots.joiningDate,
        email: initialSlots.email,
        employee_code_preview: 'Generated automatically (e.g. EMP-001)',
        default_password_notice: 'A temporary activation credential will be generated for employee account activation',
        checklist: [
          'Create user account',
          'Create employee profile',
          `Assign department (${initialSlots.department})`,
          `Assign designation (${initialSlots.designation})`,
          'Initialize leave balance',
          'Generate onboarding checklist'
        ]
      };

      const pending = createPendingConfirmation({
        organizationId,
        userId: userContext.id,
        intent: 'onboard_employee',
        toolName: 'onboard_employee',
        params: initialSlots,
        promptMessage: `Please confirm to create this employee:\n- Name: ${empName}\n- Department: ${initialSlots.department}\n- Designation: ${initialSlots.designation}\n- Joining Date: ${initialSlots.joiningDate}\n- Email: ${initialSlots.email}`,
        entityLabel: empName,
        impactDescription: 'This will create the user account, employee profile, assign department and designation, initialize leave balance, and generate an onboarding checklist.',
        originalCommand: commandText,
        summary
      });

      await conversationService.setWorkflowState(activeConversationId, organizationId, userContext.id, {
        workflow: 'onboarding',
        step: 'awaiting_confirmation',
        confirmationId: pending.confirmation_id,
        slots: initialSlots
      });

      const assistantMsg = `Here is the onboarding summary:\n- Name: ${empName}\n- Department: ${initialSlots.department}\n- Designation: ${initialSlots.designation}\n- Joining Date: ${initialSlots.joiningDate}\n- Email: ${initialSlots.email}\n\nPlease confirm to create this employee.`;
      await conversationService.addMessage(activeConversationId, organizationId, 'assistant', assistantMsg);

      return {
        ...pending,
        conversation_id: activeConversationId,
        message: assistantMsg,
        summary
      };
    }

    // 10. Entity & Date Resolution
    const resolvedData = {};

    // 10.1 Date Resolution (Strict Mode - Never Invent Dates)
    if (params.date || params.rawDateText || params.rawText || [
      'apply_leave', 'apply_my_leave', 'get_my_attendance', 'get_attendance', 
      'get_my_payslip', 'get_my_salary_slip', 'get_payroll_information', 
      'generate_payroll_report', 'get_joined_this_month', 'get_absent_today', 
      'get_department_attendance'
    ].includes(intent)) {
      const dateTextToResolve = params.date || params.rawDateText || params.rawText || commandText;
      resolvedData.dates = resolveDate(dateTextToResolve);
    }

    // 10.2 Employee Resolution (With Ambiguity Detection & Qualification)
    if (params.employee && !authCheck.selfScoped) {
      const empRes = await resolveEmployee(organizationId, params.employee, userContext);
      if (!empRes.resolved) {
        const ambiguityMsg = empRes.reason;
        await conversationService.addMessage(activeConversationId, organizationId, 'assistant', ambiguityMsg);
        return {
          success: false,
          status: 400,
          conversation_id: activeConversationId,
          message: ambiguityMsg,
          isAmbiguous: empRes.isAmbiguous || false,
          candidates: empRes.matches || []
        };
      }
      resolvedData.targetEmployee = empRes.employee;
    }

    // 10.3 Department Resolution
    if (params.department) {
      const deptRes = await resolveDepartment(organizationId, params.department);
      if (!deptRes.resolved && intent !== 'create_department') {
        await conversationService.addMessage(activeConversationId, organizationId, 'assistant', deptRes.reason);
        return {
          success: false,
          status: 400,
          conversation_id: activeConversationId,
          message: deptRes.reason,
          isAmbiguous: deptRes.isAmbiguous || false,
          candidates: deptRes.matches || []
        };
      }
      resolvedData.department = deptRes.department;
    }

    // 10.3b Dual Department Resolution (Comparison Queries)
    if (params.department1) {
      const d1Res = await resolveDepartment(organizationId, params.department1);
      if (!d1Res.resolved) {
        await conversationService.addMessage(activeConversationId, organizationId, 'assistant', d1Res.reason);
        return {
          success: false,
          status: 400,
          conversation_id: activeConversationId,
          message: d1Res.reason,
          isAmbiguous: d1Res.isAmbiguous || false,
          candidates: d1Res.matches || []
        };
      }
      resolvedData.department1 = d1Res.department;
    }

    if (params.department2) {
      const d2Res = await resolveDepartment(organizationId, params.department2);
      if (!d2Res.resolved) {
        await conversationService.addMessage(activeConversationId, organizationId, 'assistant', d2Res.reason);
        return {
          success: false,
          status: 400,
          conversation_id: activeConversationId,
          message: d2Res.reason,
          isAmbiguous: d2Res.isAmbiguous || false,
          candidates: d2Res.matches || []
        };
      }
      resolvedData.department2 = d2Res.department;
    }

    // 10.3c Date Range Validation
    const effectiveStart = params.startDate || resolvedData.dates?.startDate;
    const effectiveEnd = params.endDate || resolvedData.dates?.endDate;
    if (effectiveStart && effectiveEnd) {
      const s = new Date(effectiveStart);
      const e = new Date(effectiveEnd);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && s > e) {
        const dateErrMsg = 'Invalid date range: start date must be before or equal to end date.';
        await conversationService.addMessage(activeConversationId, organizationId, 'assistant', dateErrMsg);
        return {
          success: false,
          status: 400,
          conversation_id: activeConversationId,
          message: dateErrMsg
        };
      }
    }

    // 10.4 Designation Resolution
    if (params.designation) {
      const desigRes = await resolveDesignation(organizationId, params.designation);
      if (desigRes.resolved) {
        resolvedData.designation = desigRes.designation;
      }
    }

    // 10.5 Leave Type Resolution
    if (params.leaveType || params.type) {
      const ltRes = await resolveLeaveType(organizationId, params.leaveType || params.type);
      if (ltRes.resolved) {
        resolvedData.leaveType = ltRes.leaveType;
      }
    }

    // 11. Dangerous Action Interceptor (Deactivate, Salary Update)
    if (authCheck.requiresConfirmation) {
      const emp = resolvedData.targetEmployee;
      let promptMessage = '';
      let impactDescription = '';
      let entityLabel = '';
      let summary = null;

      if (intent === 'deactivate_employee') {
        entityLabel = emp ? `${emp.first_name} ${emp.last_name} (${emp.employee_code})` : params.employee;
        impactDescription = 'Deactivating the employee will disable their account and revoke system access.';
        promptMessage = `I found ${entityLabel}. Deactivating the employee will disable their account. Do you want to continue?`;
        summary = {
          name: entityLabel,
          action: 'Deactivate Employee Account',
          impact: impactDescription
        };
      } else if (intent === 'update_employee_salary') {
        entityLabel = emp ? `${emp.first_name} ${emp.last_name} (${emp.employee_code})` : 'Employee';
        impactDescription = `Modifies employee salary to ₹${params.newSalary || params.basicSalary}.`;
        promptMessage = `This will update compensation for ${entityLabel} to ₹${params.newSalary || params.basicSalary}. Do you want to continue?`;
        summary = {
          name: entityLabel,
          new_salary: params.newSalary || params.basicSalary,
          impact: impactDescription
        };
      }

      const pending = createPendingConfirmation({
        organizationId,
        userId: userContext.id,
        intent,
        toolName: intent,
        params: {
          employeeId: emp?.id,
          employeeCode: emp?.employee_code,
          employeeName: emp ? `${emp.first_name} ${emp.last_name}` : null,
          ...params
        },
        promptMessage,
        entityLabel,
        impactDescription,
        originalCommand: commandText,
        summary
      });

      await logAiAction({
        organizationId,
        userId: userContext.id,
        userRole,
        originalCommand: commandText,
        intent,
        toolName: intent,
        targetId: emp?.id,
        targetEntity: entityLabel,
        status: 'pending_confirmation',
        confirmationStatus: 'pending'
      });

      // Persist pending confirmation to conversation workflow state so it can be restored on reload
      await conversationService.setWorkflowState(activeConversationId, organizationId, userContext.id, {
        workflow: 'confirmation',
        step: 'awaiting_confirmation',
        confirmationId: pending.confirmation_id,
        intent,
        details: pending.confirmation_details || summary
      });

      await conversationService.addMessage(activeConversationId, organizationId, 'assistant', promptMessage);

      return {
        ...pending,
        conversation_id: activeConversationId
      };
    }

    // 12. Execute Approved HRMS Tool
    let toolResult;
    try {
      toolResult = await this.executeTool(intent, organizationId, userContext, params, resolvedData);
    } catch (execErr) {
      console.error(`[AiService] Execution error for ${intent}:`, execErr);
      toolResult = {
        success: false,
        status: 500,
        message: `An unexpected error occurred while executing ${intent}: ${execErr.message}`
      };
    }

    // 13. Dual Audit Logging (ai_action_logs & audit_logs)
    await logAiAction({
      organizationId,
      userId: userContext.id,
      userRole,
      originalCommand: commandText,
      intent,
      toolName: intent,
      targetId: resolvedData.targetEmployee?.id || userContext.employee_id || null,
      targetEntity: resolvedData.targetEmployee ? `${resolvedData.targetEmployee.first_name} ${resolvedData.targetEmployee.last_name}` : null,
      status: toolResult.success ? 'success' : 'failed',
      confirmationStatus: 'none',
      result: toolResult,
      errorMessage: toolResult.success ? null : toolResult.message
    });

    if (toolResult.message) {
      await conversationService.addMessage(activeConversationId, organizationId, 'assistant', toolResult.message);
    }

    return {
      ...toolResult,
      conversation_id: activeConversationId
    };
  }

  /**
   * Route intent to the appropriate tool function.
   */
  async executeTool(intent, organizationId, userContext, params, resolvedData) {
    switch (intent) {
      // ── Employee Self Tools ──
      case 'get_my_profile':
        return await employeeTools.getMyProfile(organizationId, userContext);

      case 'update_my_profile':
        return await employeeTools.updateMyProfile(organizationId, userContext, params);

      case 'get_my_attendance':
        return await attendanceTools.getMyAttendance(organizationId, userContext, resolvedData.dates);

      case 'check_in':
        return await attendanceTools.checkIn(organizationId, userContext);

      case 'check_out':
        return await attendanceTools.checkOut(organizationId, userContext);

      case 'get_my_leave_balance':
        return await leaveTools.getMyLeaveBalance(organizationId, userContext);

      case 'get_my_leave_requests':
        return await leaveTools.getMyLeaveRequests(organizationId, userContext);

      case 'apply_leave':
      case 'apply_my_leave':
        return await leaveTools.applyMyLeave(
          organizationId,
          userContext,
          resolvedData.dates,
          params.reason,
          resolvedData.leaveType
        );

      case 'cancel_my_leave':
        return await leaveTools.cancelMyLeave(organizationId, userContext);

      case 'get_my_payslip':
      case 'get_my_salary_slip':
        return await payrollTools.getMySalarySlip(organizationId, userContext, resolvedData.dates);

      case 'get_my_documents':
        return await documentTools.getMyDocuments(organizationId, userContext);

      case 'get_my_onboarding_status':
        return await onboardingTools.getMyOnboardingStatus(organizationId, userContext);

      case 'get_my_tasks':
        return await taskTools.getMyTasks(organizationId, userContext);

      // ── Admin Tools ──
      case 'get_employee':
      case 'get_employee_details':
        return await employeeTools.getEmployeeDetails(organizationId, resolvedData.targetEmployee);

      case 'list_employees':
        return await employeeTools.listEmployees(organizationId, params);

      case 'create_employee':
      case 'onboard_employee':
        return await onboardingTools.executeOnboardWorkflow(organizationId, params, userContext);

      case 'update_employee': {
        const updateFields = {};
        if (resolvedData.designation) {
          updateFields.designation_id = resolvedData.designation.id;
          updateFields.designation_name = resolvedData.designation.name;
        } else if (params.designation) {
          updateFields.designation_name = params.designation;
        }
        if (resolvedData.department) {
          updateFields.department_id = resolvedData.department.id;
          updateFields.department_name = resolvedData.department.name;
        }
        if (params.phone) updateFields.phone = params.phone;

        return await employeeTools.updateEmployee(organizationId, resolvedData.targetEmployee, updateFields);
      }

      case 'get_attendance':
        return await attendanceTools.getAttendance(organizationId, params, resolvedData);

      case 'get_absent_today': {
        const targetDate = resolvedData.dates?.date || params.date || null;
        return await attendanceTools.getAbsentToday(organizationId, targetDate);
      }

      case 'get_department_attendance':
        return await attendanceTools.getDepartmentAttendance(
          organizationId,
          resolvedData.department,
          resolvedData.dates?.date
        );

      case 'get_leave_requests':
        return await leaveTools.getLeaveRequests(organizationId, params, userContext, resolvedData);

      case 'approve_leave':
        return await leaveTools.approveLeave(organizationId, resolvedData.targetEmployee, userContext);

      case 'reject_leave':
        return await leaveTools.rejectLeave(organizationId, resolvedData.targetEmployee, userContext);

      case 'get_payroll_information':
      case 'generate_payroll_report':
        return await payrollTools.generatePayrollReport(organizationId, resolvedData.dates);

      case 'assign_employee_department':
        return await departmentTools.assignEmployeeDepartment(
          organizationId,
          resolvedData.targetEmployee,
          resolvedData.department
        );

      case 'create_department':
        return await departmentTools.createDepartment(organizationId, params.departmentName);

      case 'get_missing_documents':
        return await documentTools.getMissingDocuments(organizationId);

      case 'get_joined_this_month':
        return await employeeTools.getJoinedThisMonth(organizationId, resolvedData.dates);

      case 'get_employees_by_department':
        return await employeeTools.getEmployeesByDepartment(organizationId, resolvedData.department);

      // ── Analytics Tools (Phase 3B) ──
      case 'compare_department_attendance':
        return await analyticsTools.compareDepartmentAttendance(organizationId, params, resolvedData);

      case 'get_absenteeism_rate':
        return await analyticsTools.getAbsenteeismRate(organizationId, params, resolvedData);

      case 'get_leave_utilization':
        return await analyticsTools.getLeaveUtilization(organizationId, params, resolvedData);

      case 'get_employee_tenure':
        return await analyticsTools.getEmployeeTenure(organizationId, params, resolvedData);

      case 'get_employees_joined_range':
        return await analyticsTools.getEmployeesJoinedRange(organizationId, params, resolvedData);

      case 'get_consecutive_absences':
        return await analyticsTools.getConsecutiveAbsences(organizationId, params, resolvedData);

      case 'get_department_headcount':
        return await analyticsTools.getDepartmentHeadcount(organizationId, params, resolvedData);

      case 'get_attendance_trends':
        return await analyticsTools.getAttendanceTrends(organizationId, params, resolvedData);

      case 'get_leave_trends':
        return await analyticsTools.getLeaveTrends(organizationId, params, resolvedData);

      case 'get_insights':
        return await insightTools.getInsights(organizationId, userContext, params);

      default:
        return {
          success: false,
          status: 400,
          error: 'UNREGISTERED_TOOL',
          message: `Tool for intent "${intent}" is not yet implemented.`
        };
    }
  }


  /**
   * Confirm or cancel a dangerous action token.
   * 
   * @param {string} confirmationId
   * @param {boolean} confirmed
   * @param {object} userContext
   * @returns {Promise<object>}
   */
  async handleConfirmation(confirmationId, confirmed, userContext) {
    if (!userContext || !userContext.organization_id) {
      return { success: false, status: 401, message: 'Authentication required with valid organization context.' };
    }

    const organizationId = userContext.organization_id;
    const userRole = (userContext.roles && userContext.roles[0]) || 'EMPLOYEE';

    if (!confirmed) {
      cancelConfirmation(confirmationId, userContext.id, organizationId);

      // Clear any pending workflow state in conversation
      await db.query(
        "UPDATE ai_conversations SET workflow_state = NULL WHERE organization_id = ? AND user_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(workflow_state, '$.confirmationId')) = ?",
        [organizationId, userContext.id, confirmationId]
      );

      await logAiAction({
        organizationId,
        userId: userContext.id,
        userRole,
        originalCommand: 'Cancel confirmation',
        intent: 'cancel_action',
        toolName: 'cancelConfirmation',
        status: 'success',
        confirmationStatus: 'cancelled'
      });

      return {
        success: true,
        message: 'Action cancelled. No changes were made to HRMS records.'
      };
    }

    const validation = consumeConfirmation(confirmationId, userContext.id, organizationId);
    if (!validation.valid) {
      return {
        success: false,
        status: 400,
        message: validation.reason
      };
    }

    const rec = validation.confirmation;

    // Execute target dangerous action
    let result;
    try {
      if (rec.intent === 'deactivate_employee') {
        result = await employeeTools.deactivateEmployee(
          organizationId,
          { id: rec.params.employeeId, employee_code: rec.params.employeeCode, first_name: rec.params.employeeName?.split(' ')[0] || 'Employee', last_name: '' },
          userContext.id
        );
      } else if (rec.intent === 'update_employee_salary') {
        result = await payrollTools.updateEmployeeSalary(
          organizationId,
          { id: rec.params.employeeId, employee_code: rec.params.employeeCode, first_name: rec.params.employeeName?.split(' ')[0] || 'Employee', last_name: '' },
          rec.params
        );
      } else if (rec.intent === 'onboard_employee' || rec.intent === 'create_employee') {
        result = await onboardingTools.executeOnboardWorkflow(organizationId, rec.params, userContext);

      } else {
        result = { success: false, status: 400, message: `Unsupported confirmed action: ${rec.intent}` };
      }

      // Clear workflow state once confirmed action finishes
      await db.query(
        "UPDATE ai_conversations SET workflow_state = NULL WHERE organization_id = ? AND user_id = ? AND JSON_UNQUOTE(JSON_EXTRACT(workflow_state, '$.confirmationId')) = ?",
        [organizationId, userContext.id, confirmationId]
      );
    } catch (err) {
      result = { success: false, status: 500, message: `Action failed: ${err.message}` };
    }

    await logAiAction({
      organizationId,
      userId: userContext.id,
      userRole,
      originalCommand: rec.originalCommand,
      intent: rec.intent,
      toolName: rec.toolName,
      targetId: rec.params.employeeId || result?.data?.employee_id || null,
      targetEntity: rec.entityLabel,
      status: result.success ? 'success' : 'failed',
      confirmationStatus: 'confirmed',
      result
    });

    return result;
  }

  /**
   * Alias for handleConfirmation
   */
  async confirmAction(confirmationId, confirmed, userContext) {
    return this.handleConfirmation(confirmationId, confirmed, userContext);
  }

  /**
   * Return role-aware command suggestions for the UI.
   */
  getSuggestions(userContext) {
    const isAdmin = userContext.roles && userContext.roles.some(r => ['SUPER_ADMIN', 'ORG_ADMIN', 'HR_ADMIN'].includes(r));

    if (isAdmin) {
      return [
        "Onboard Rahul as Junior Associate in IT",
        "Show employees who were absent yesterday",
        "Show employees absent today",
        "Show employees on leave today",
        "List all employees",
        "Update Rahul's designation",
        "Show attendance for the IT department",
        "Generate this month's payroll report",
        "Deactivate employee EMP102"
      ];
    }

    return [
      "How many leaves do I have?",
      "Apply leave for Friday",
      "Show my attendance this month",
      "Show my payslip",
      "Show my leave requests",
      "What's my onboarding status?",
      "Update my phone number",
      "Show my profile"
    ];
  }
}

module.exports = new AiService();

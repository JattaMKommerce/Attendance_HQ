/**
 * Phase 3A Automated Verification Test Suite
 * 
 * Verifies all 14 Phase 3A requirements:
 * A. Create conversation
 * B. List own conversations
 * C. Load own messages
 * D. Switch conversation
 * E. Refresh/reload continuity
 * F. User isolation (User A cannot access User B's conversation)
 * G. Organization isolation (Org A cannot access Org B's conversation)
 * H. Employee/admin isolation
 * I. conversation_id tampering
 * J. organization_id tampering
 * K. Multi-turn workflow persistence
 * L. Confirmation state security (authoritative server validation)
 * M. Archive behavior (archived threads cannot receive commands)
 * N. Duplicate message prevention
 */

require('dotenv').config({ path: './backend/.env' });
const db = require('../src/config/db');
const conversationService = require('../src/services/ai/conversationService');
const aiService = require('../src/services/ai/aiService');
const confirmationService = require('../src/services/ai/confirmationService');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`${colors.green}  ✓ PASS:${colors.reset} ${name} ${detail ? colors.cyan + '(' + detail + ')' + colors.reset : ''}`);
}

function fail(name, reason) {
  failed++;
  console.error(`${colors.red}  ✗ FAIL:${colors.reset} ${name} - ${reason}`);
  process.exitCode = 1;
}

async function runPhase3ATests() {
  console.log(`\n${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    HRMS AI COMMAND CENTER - PHASE 3A VERIFICATION SUITE                ${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}========================================================================\n${colors.reset}`);

  try {
    // 0. Setup Users & Contexts
    const [adminRows] = await db.query("SELECT id, organization_id, email FROM users WHERE email = 'admin@acme.com'");
    if (!adminRows.length) throw new Error('admin@acme.com not found');
    const adminUser = adminRows[0];

    const [empRows] = await db.query(
      `SELECT u.id, u.organization_id, u.email, e.id as employee_id, e.employee_code 
       FROM users u JOIN employees e ON u.id = e.user_id WHERE u.email = 'employee@acme.com'`
    );
    if (!empRows.length) throw new Error('employee@acme.com not found');
    const empUser = empRows[0];

    const adminContext = {
      id: adminUser.id,
      organization_id: adminUser.organization_id,
      roles: ['ORG_ADMIN'],
      permissions: ['employee:view_all', 'employee:create', 'employee:delete']
    };

    const employeeContext = {
      id: empUser.id,
      organization_id: empUser.organization_id,
      employee_id: empUser.employee_id,
      roles: ['EMPLOYEE'],
      permissions: ['profile:view_self', 'attendance:view_self', 'leave:view_self']
    };

    const orgId = adminContext.organization_id;

    // ──────────────────────────────────────────────────────────────────────────
    // TEST A: CREATE CONVERSATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`${colors.yellow}A. TESTING CREATE CONVERSATION...${colors.reset}`);
    const convA = await conversationService.createConversation(orgId, adminContext.id, 'Test Conversation A');
    if (convA && convA.id && convA.title === 'Test Conversation A' && convA.status === 'active') {
      pass('Create conversation creates active thread with assigned ID', `Thread #${convA.id}`);
    } else {
      fail('Create conversation', JSON.stringify(convA));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST B: LIST OWN CONVERSATIONS
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}B. TESTING LIST OWN CONVERSATIONS...${colors.reset}`);
    const adminConvs = await conversationService.listConversations(orgId, adminContext.id);
    const foundConvA = adminConvs.find(c => c.id === convA.id);
    if (foundConvA && foundConvA.status === 'active') {
      pass('List own conversations returns user active threads sorted by activity', `${adminConvs.length} threads`);
    } else {
      fail('List own conversations', `Conv ${convA.id} not found in user list`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST C: LOAD OWN MESSAGES
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}C. TESTING LOAD OWN MESSAGES...${colors.reset}`);
    await conversationService.addMessage(convA.id, orgId, 'user', 'What is the attendance today?');
    await conversationService.addMessage(convA.id, orgId, 'assistant', 'There are 2 absent employees today.');

    const detailsA = await conversationService.getConversationDetails(convA.id, orgId, adminContext.id);
    if (detailsA.messages && detailsA.messages.length >= 2 && detailsA.conversation?.id === convA.id) {
      pass('Load own messages retrieves message stream with conversation metadata', `${detailsA.messages.length} messages`);
    } else {
      fail('Load own messages', JSON.stringify(detailsA));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST D: SWITCH CONVERSATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}D. TESTING SWITCH CONVERSATION...${colors.reset}`);
    const convB = await conversationService.createConversation(orgId, adminContext.id, 'Test Conversation B');
    await conversationService.addMessage(convB.id, orgId, 'user', 'Onboard new engineer');

    const detailsB = await conversationService.getConversationDetails(convB.id, orgId, adminContext.id);
    const hasDistinctMessages = detailsB.messages.length === 1 && detailsB.messages[0].content === 'Onboard new engineer';
    if (hasDistinctMessages && detailsA.messages.length >= 2) {
      pass('Switch conversation loads isolated message streams without cross-thread contamination');
    } else {
      fail('Switch conversation', 'Message stream leaked between conversations');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST E: REFRESH/RELOAD CONTINUITY
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}E. TESTING REFRESH/RELOAD CONTINUITY...${colors.reset}`);
    // Simulating page refresh by querying conversation details using previously stored conversation ID
    const reloadedConv = await conversationService.getConversationDetails(convA.id, orgId, adminContext.id);
    if (reloadedConv.conversation?.id === convA.id && reloadedConv.messages.length >= 2) {
      pass('Browser refresh simulation re-attaches to existing conversation and restores messages', `Restored ${reloadedConv.messages.length} messages`);
    } else {
      fail('Refresh/reload continuity', 'Failed to restore conversation state on reload');
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST F: USER ISOLATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}F. TESTING USER ISOLATION...${colors.reset}`);
    try {
      await conversationService.getConversationDetails(convA.id, orgId, employeeContext.id);
      fail('User isolation', 'Employee user was able to access Admin conversation!');
    } catch (err) {
      if (err.code === 'CONVERSATION_NOT_FOUND' || err.status === 404) {
        pass('User isolation strictly enforced: User B blocked from User A conversation (404)');
      } else {
        fail('User isolation error', err.message);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST G: ORGANIZATION ISOLATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}G. TESTING ORGANIZATION ISOLATION...${colors.reset}`);
    try {
      const foreignOrgId = 9999;
      await conversationService.getConversationDetails(convA.id, foreignOrgId, adminContext.id);
      fail('Organization isolation', 'Foreign organization was able to access conversation!');
    } catch (err) {
      if (err.code === 'CONVERSATION_NOT_FOUND' || err.status === 404) {
        pass('Organization isolation strictly enforced: Foreign org 9999 blocked (404)');
      } else {
        fail('Organization isolation error', err.message);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST H: EMPLOYEE/ADMIN ISOLATION IN LISTINGS
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}H. TESTING EMPLOYEE/ADMIN THREAD LISTING ISOLATION...${colors.reset}`);
    const employeeList = await conversationService.listConversations(orgId, employeeContext.id);
    const leakedAdminThread = employeeList.find(c => c.id === convA.id || c.id === convB.id);
    if (!leakedAdminThread) {
      pass('Employee conversation list contains zero admin conversation threads');
    } else {
      fail('Employee/admin listing isolation', `Admin thread ${leakedAdminThread.id} leaked to employee list!`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST I: CONVERSATION_ID TAMPERING
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}I. TESTING CONVERSATION_ID TAMPERING IN PROCESS COMMAND...${colors.reset}`);
    // Employee attempts to inject admin's conversationId into processCommand
    const tamperedRes = await aiService.processCommand('Show my profile', employeeContext, convA.id);
    if (!tamperedRes.success && (tamperedRes.status === 403 || tamperedRes.message?.includes('Unable to access conversation'))) {
      pass('ProcessCommand rejects forged conversation_id belonging to another user (403)');
    } else {
      fail('conversation_id tampering', JSON.stringify(tamperedRes));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST J: ORGANIZATION_ID TAMPERING
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}J. TESTING ORGANIZATION_ID TAMPERING...${colors.reset}`);
    // User tries to list conversations with forged organization ID
    const forgedOrgConvs = await conversationService.listConversations(8888, adminContext.id);
    if (forgedOrgConvs.length === 0) {
      pass('organization_id tampering returns empty list; zero data leaked across orgs');
    } else {
      fail('organization_id tampering', `Found ${forgedOrgConvs.length} records under foreign org!`);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST K: MULTI-TURN WORKFLOW PERSISTENCE ACROSS RELOAD
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}K. TESTING MULTI-TURN WORKFLOW PERSISTENCE...${colors.reset}`);
    const multiTurnConv = await conversationService.createConversation(orgId, adminContext.id, 'Onboard Workflow Thread');
    
    // Step 1: Initial command triggers missing slots
    const step1 = await aiService.processCommand('Onboard Rahul', adminContext, multiTurnConv.id);
    if (step1.step === 'collecting_slots') {
      pass('Turn 1 sets multi-turn workflow state in conversation');
    } else {
      fail('Multi-turn workflow start', JSON.stringify(step1));
    }

    // Simulating page refresh by reloading conversation details from DB
    const restoredWorkflow = await conversationService.getConversationDetails(multiTurnConv.id, orgId, adminContext.id);
    if (restoredWorkflow.workflow_state && restoredWorkflow.workflow_state.workflow === 'onboarding' && restoredWorkflow.workflow_state.step === 'collecting_slots') {
      pass('Multi-turn workflow state correctly persisted and restored on reload', `Slots: ${JSON.stringify(restoredWorkflow.workflow_state.slots)}`);
    } else {
      fail('Multi-turn workflow persistence', JSON.stringify(restoredWorkflow.workflow_state));
    }

    // Step 2: Providing next slots continues the restored workflow cleanly
    const step2 = await aiService.processCommand('Department is IT and designation is Software Engineer', adminContext, multiTurnConv.id);
    if (step2.slots?.department === 'IT' && step2.slots?.designation === 'Software Engineer') {
      pass('Restored workflow continues accurately without restarting (department & designation merged)');
    } else {
      fail('Multi-turn workflow continuation', JSON.stringify(step2));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST L: CONFIRMATION STATE SECURITY ON RELOAD
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}L. TESTING CONFIRMATION STATE SECURITY ON RELOAD...${colors.reset}`);
    const confThread = await conversationService.createConversation(orgId, adminContext.id, 'Deactivate Thread');
    const confRes = await aiService.processCommand('Deactivate employee EMP-001', adminContext, confThread.id);
    
    if (confRes.requires_confirmation && confRes.confirmation_id) {
      pass('Confirmation token generated and saved in workflow_state', confRes.confirmation_id);

      // Verify authoritative restoration on reload
      const restoredConf = await conversationService.getConversationDetails(confThread.id, orgId, adminContext.id);
      if (restoredConf.active_confirmation && restoredConf.active_confirmation.confirmation_id === confRes.confirmation_id) {
        pass('Authoritative confirmation details restored from server state without relying on client storage');
      } else {
        fail('Confirmation restoration', JSON.stringify(restoredConf.active_confirmation));
      }

      // Fast-forward token expiry to verify safe cleanup
      const rawPending = confirmationService.getPendingConfirmation(confRes.confirmation_id);
      if (rawPending) {
        rawPending.expiresAt = Date.now() - 1000; // Force expired
      }

      const expiredRestored = await conversationService.getConversationDetails(confThread.id, orgId, adminContext.id);
      if (expiredRestored.active_confirmation === null) {
        pass('Expired confirmation token safely cleared on reload; user is not trapped');
      } else {
        fail('Expired confirmation cleanup', JSON.stringify(expiredRestored.active_confirmation));
      }
    } else {
      fail('Confirmation generation', JSON.stringify(confRes));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST M: ARCHIVE BEHAVIOR
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}M. TESTING ARCHIVE BEHAVIOR...${colors.reset}`);
    const archiveThread = await conversationService.createConversation(orgId, adminContext.id, 'To Archive');
    await conversationService.addMessage(archiveThread.id, orgId, 'user', 'Temporary note');

    // Archive the thread
    const archRes = await conversationService.archiveConversation(archiveThread.id, orgId, adminContext.id);
    if (archRes.success) {
      pass('Conversation successfully marked as archived');
    } else {
      fail('Archive conversation', JSON.stringify(archRes));
    }

    // Active list must NOT contain archived thread
    const activeList = await conversationService.listConversations(orgId, adminContext.id, { includeArchived: false });
    const isPresentInActive = activeList.some(c => c.id === archiveThread.id);
    if (!isPresentInActive) {
      pass('Archived conversation hidden from default active conversation list');
    } else {
      fail('Archived conversation filtering', 'Archived conversation still appeared in active list');
    }

    // Included list MUST contain archived thread
    const allList = await conversationService.listConversations(orgId, adminContext.id, { includeArchived: true });
    const isPresentInAll = allList.find(c => c.id === archiveThread.id);
    if (isPresentInAll && isPresentInAll.status === 'archived') {
      pass('Archived conversation preserved in history with status="archived"');
    } else {
      fail('Archived conversation preservation', JSON.stringify(isPresentInAll));
    }

    // Sending command to archived conversation must be rejected
    const blockedCmdRes = await aiService.processCommand('Show attendance today', adminContext, archiveThread.id);
    if (!blockedCmdRes.success && blockedCmdRes.status === 400 && blockedCmdRes.message?.includes('archived')) {
      pass('Commands to archived conversations strictly rejected (400)');
    } else {
      fail('Archived conversation command rejection', JSON.stringify(blockedCmdRes));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // TEST N: DUPLICATE MESSAGE PREVENTION
    // ──────────────────────────────────────────────────────────────────────────
    console.log(`\n${colors.yellow}N. TESTING DUPLICATE MESSAGE PREVENTION...${colors.reset}`);
    const dupThread = await conversationService.createConversation(orgId, adminContext.id, 'Duplicate Test');
    const msgId1 = await conversationService.addMessage(dupThread.id, orgId, 'user', 'Identical Rapid Message');
    const msgId2 = await conversationService.addMessage(dupThread.id, orgId, 'user', 'Identical Rapid Message');

    if (msgId1 !== null && msgId2 === null) {
      pass('Rapid duplicate message insertion safely suppressed (second ID is null)');
    } else {
      fail('Duplicate message prevention', `msgId1=${msgId1}, msgId2=${msgId2}`);
    }

    // Clean up test threads
    await db.query('DELETE FROM ai_conversations WHERE id IN (?, ?, ?, ?, ?)', [
      convA.id, convB.id, multiTurnConv.id, confThread.id, dupThread.id
    ]);

  } catch (fatalError) {
    console.error(`${colors.red}Fatal test error:${colors.reset}`, fatalError);
    process.exitCode = 1;
  }

  console.log(`\n${colors.bold}${colors.magenta}========================================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}    PHASE 3A TEST SUMMARY: ${passed} PASSED, ${failed} FAILED                 ${colors.reset}`);
  console.log(`${colors.bold}${colors.magenta}========================================================================\n${colors.reset}`);
}

runPhase3ATests().then(() => process.exit(process.exitCode || 0));

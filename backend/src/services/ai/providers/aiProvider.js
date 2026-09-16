/**
 * Base Abstract AI Provider Interface
 * 
 * Defines standard contract for all AI/NLU providers in the HRMS system.
 * Allows swapping providers (Gemini, OpenAI, Anthropic, SmartNLU, etc.)
 * via configuration without changing business logic or tool layer.
 */

class AIProvider {
  /**
   * Resolve user natural language input to a structured intent and parameters.
   * 
   * @param {string} text - The natural language command or question from the user.
   * @param {object} context - User context: { id, employee_id, organization_id, roles, permissions }
   * @returns {Promise<{ intent: string, params: object, confidence: number }>}
   */
  async resolveIntent(text, context) {
    throw new Error('AIProvider.resolveIntent must be implemented by subclass.');
  }

  /**
   * Generate a formatted, human-readable response based on tool execution result.
   * 
   * @param {object} toolResult - Output from the executed HRMS tool.
   * @param {object} context - Execution context and original query.
   * @returns {Promise<string>} - Formatted response text.
   */
  async generateResponse(toolResult, context) {
    if (toolResult && toolResult.message) {
      return toolResult.message;
    }
    return toolResult?.success ? 'Operation completed successfully.' : 'Operation failed.';
  }

  /**
   * Backwards-compatibility alias for parseCommand.
   */
  async parseCommand(text, context) {
    return this.resolveIntent(text, context);
  }
}

module.exports = AIProvider;

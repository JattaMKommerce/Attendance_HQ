/**
 * Base AI Provider Interface
 */

class AiProviderInterface {
  /**
   * Parse user natural language text into a structured intent and extracted parameters.
   * 
   * @param {string} text - User command input
   * @param {object} context - Authenticated user context and metadata
   * @returns {Promise<{
   *   intent: string,
   *   params: object,
   *   confidence: number,
   *   rawResponse?: any
   * }>}
   */
  async parseCommand(text, context) {
    throw new Error('parseCommand method must be implemented by AI provider.');
  }
}

module.exports = AiProviderInterface;

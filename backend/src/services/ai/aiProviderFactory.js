/**
 * AI Provider Factory
 * 
 * Instantiates the appropriate NLU/LLM provider based on environment variables.
 * If no provider is configured, returns null so the system responds with a clear configuration error.
 */

const SmartNluProvider = require('./providers/smartNluProvider');
const GeminiProvider = require('./providers/geminiProvider');
const OpenAiProvider = require('./providers/openAiProvider');

class ResilientProviderWrapper {
  constructor(primaryProvider, fallbackProvider) {
    this.primaryProvider = primaryProvider;
    this.fallbackProvider = fallbackProvider;
  }

  async resolveIntent(text, context) {
    if (this.primaryProvider) {
      try {
        const result = await this.primaryProvider.resolveIntent(text, context);
        if (result && result.intent && result.intent !== 'unknown') {
          return result;
        }
      } catch (err) {
        console.warn('[AiProvider] Primary provider error, falling back:', err.message);
      }
    }
    if (this.fallbackProvider) {
      return this.fallbackProvider.resolveIntent(text, context);
    }
    return { intent: 'unknown', params: {}, confidence: 0 };
  }

  async parseCommand(text, context) {
    return this.resolveIntent(text, context);
  }

  async generateResponse(toolResult, context) {
    if (this.primaryProvider && typeof this.primaryProvider.generateResponse === 'function') {
      return this.primaryProvider.generateResponse(toolResult, context);
    }
    return toolResult?.message || (toolResult?.success ? 'Completed successfully.' : 'Failed.');
  }
}

const customProviders = {};

function registerProvider(name, provider) {
  if (name && provider) {
    customProviders[name.toLowerCase()] = provider;
  }
}

function getProvider() {
  const providerType = (process.env.AI_PROVIDER || '').trim().toLowerCase();

  // Custom registered provider (e.g. testing)
  if (customProviders[providerType]) {
    return customProviders[providerType];
  }

  // Explicit provider selection
  if (providerType === 'gemini' && process.env.GEMINI_API_KEY) {
    const gemini = new GeminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || 'gemini-1.5-flash');
    return new ResilientProviderWrapper(gemini, new SmartNluProvider());
  }

  if (providerType === 'openai' && process.env.OPENAI_API_KEY) {
    const openai = new OpenAiProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL || 'gpt-4o-mini');
    return new ResilientProviderWrapper(openai, new SmartNluProvider());
  }

  if (providerType === 'smart_nlu' || providerType === 'local') {
    return new SmartNluProvider();
  }

  // Automatic detection based on available API keys
  if (process.env.GEMINI_API_KEY) {
    const gemini = new GeminiProvider(process.env.GEMINI_API_KEY, process.env.GEMINI_MODEL || 'gemini-1.5-flash');
    return new ResilientProviderWrapper(gemini, new SmartNluProvider());
  }

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAiProvider(process.env.OPENAI_API_KEY, process.env.OPENAI_MODEL || 'gpt-4o-mini');
    return new ResilientProviderWrapper(openai, new SmartNluProvider());
  }

  // If no provider is configured, return null (triggers configuration error)
  return null;
}

module.exports = {
  getProvider,
  registerProvider
};

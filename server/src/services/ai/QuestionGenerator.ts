import { env } from '../../config/env';
import { AIService } from './AIService';
import { LocalProvider } from './LocalProvider';
import { OpenAIProvider } from './OpenAIProvider';

/** Single entry point every game module should use to get AI-generated (or
 * local-fallback) content. Swapping providers happens only here. */
export const questionGenerator: AIService = env.openAiApiKey
  ? new OpenAIProvider(env.openAiApiKey)
  : new LocalProvider();

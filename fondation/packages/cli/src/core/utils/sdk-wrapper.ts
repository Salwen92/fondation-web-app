import { type SDKMessage, query as sdkQuery } from '@anthropic-ai/claude-code';

interface QueryOptions {
  prompt: string;
  abortController?: AbortController;
  options?: Record<string, unknown>;
}

/**
 * Wrapper around the Claude Code SDK query function that properly handles abort signals.
 *
 * NOTE: There is a known issue in the Claude Code SDK where aborting a query can cause
 * an unhandled promise rejection with "exit code 143". This happens because the SDK's
 * internal child process handling has a race condition where the process exits before
 * the abort signal is properly checked. This wrapper catches what it can, but some
 * errors may still escape due to the SDK's internal implementation.
 *
 * @see https://github.com/anthropics/claude-code/issues/XXX (TODO: file issue)
 */
export async function* queryWithAbortHandling({
  prompt,
  abortController,
  options,
}: QueryOptions): AsyncGenerator<SDKMessage> {
  const queryArgs = {
    prompt,
    ...(abortController && { abortController }),
    ...(options && { options }),
  };
  const generator = sdkQuery(queryArgs);

  try {
    for await (const message of generator) {
      // Check if we've been aborted
      if (abortController?.signal.aborted) {
        // Clean exit without throwing
        return;
      }
      yield message;
    }
  } catch (error) {
    // Handle SDK-specific abort errors
    if (
      error instanceof Error &&
      (error.name === 'AbortError' ||
        error.message.includes('Claude Code process exited with code 143'))
    ) {
      // This is an expected abort, don't propagate
      return;
    }
    // Re-throw other errors
    throw error;
  }
}

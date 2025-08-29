#!/usr/bin/env node
import { render } from 'ink';
import { ChatApp } from './ui/components/chat/ChatApp';

/**
 * WORKAROUND: Handle unhandled promise rejections from Claude Code SDK
 *
 * The Claude Code SDK has a bug where it throws unhandled promise rejections
 * when a query is aborted. The SDK's child process exits with code 143 (SIGTERM)
 * but the error handling has a race condition that causes it to throw a generic
 * error instead of the expected AbortError.
 *
 * This global handler prevents the application from crashing when users press ESC
 * to abort queries. This workaround can be removed once the SDK fixes this issue.
 *
 * @see https://github.com/anthropics/claude-code/issues/XXX (TODO: file issue)
 */
process.on('unhandledRejection', (reason) => {
  if (
    reason instanceof Error &&
    reason.message.includes('Claude Code process exited with code 143')
  ) {
    // Silently ignore SDK abort errors
    return;
  }
  // Re-throw other unhandled rejections
  throw reason;
});

// WORKAROUND: Also handle uncaught exceptions for Bun compatibility
process.on('uncaughtException', (error) => {
  if (error.message.includes('Claude Code process exited with code 143')) {
    // Silently ignore SDK abort errors
    return;
  }
  // Re-throw other exceptions
  throw error;
});

async function main() {
  render(<ChatApp />, {
    exitOnCtrlC: false, // We handle CTRL+C ourselves
  });
}

main().catch((_error) => {
  process.exit(1);
});

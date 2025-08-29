import { useCallback, useEffect } from 'react';

const ENABLE_BRACKETED_PASTE = '\x1b[?2004h';
const DISABLE_BRACKETED_PASTE = '\x1b[?2004l';

/**
 * Enables and disables bracketed paste mode in the terminal.
 *
 * This hook ensures that bracketed paste mode is enabled when the component
 * mounts and disabled when it unmounts or when the process exits.
 */
export const useBracketedPaste = () => {
  const cleanup = useCallback(() => {
    process.stdout.write(DISABLE_BRACKETED_PASTE);
  }, []);

  useEffect(() => {
    process.stdout.write(ENABLE_BRACKETED_PASTE);

    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    return () => {
      cleanup();
      process.removeListener('exit', cleanup);
      process.removeListener('SIGINT', cleanup);
      process.removeListener('SIGTERM', cleanup);
    };
  }, [cleanup]);
};

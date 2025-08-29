import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatInputState } from '../../types/chat';
import { useBracketedPaste } from './useBracketedPaste';
import { type Key, useKeypress } from './useKeypress';

interface PastedContent {
  id: string;
  lineCount: number;
  content: string;
  collapsed: boolean;
}

interface UseChatInputOptions {
  onSubmit: (message: string) => void;
  onExit: () => void;
  isProcessing: boolean;
  onAbort?: () => void; // Called when ESC is pressed during processing
}

export function useChatInput({ onSubmit, onExit, isProcessing, onAbort }: UseChatInputOptions) {
  const [state, setState] = useState<ChatInputState>({
    value: '',
    cursorPosition: 0,
  });

  // Exit confirmation state
  const [exitConfirmation, setExitConfirmation] = useState<{
    active: boolean;
    timestamp: number;
  } | null>(null);

  // Track pasted blocks for multi-line paste placeholders
  const [pastedBlocks, setPastedBlocks] = useState<PastedContent[]>([]);
  const pastedBlocksRef = useRef(pastedBlocks);
  pastedBlocksRef.current = pastedBlocks;

  // Track if we've already called abort to prevent multiple calls
  const abortCalledRef = useRef(false);

  // Use a ref to always have access to the latest state in callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  // Detect OS for proper key binding support
  const isMacOS = process.platform === 'darwin';

  // Enable bracketed paste mode
  useBracketedPaste();

  // Reset abort flag when processing state changes to false
  useEffect(() => {
    if (!isProcessing) {
      abortCalledRef.current = false;
    }
  }, [isProcessing]);

  // Cleanup effect for exit confirmation timeout
  useEffect(() => {
    if (exitConfirmation?.active) {
      const timeout = setTimeout(() => {
        setExitConfirmation(null);
      }, 3000); // 3 second window

      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [exitConfirmation]);

  const clearInput = useCallback(() => {
    setState({ value: '', cursorPosition: 0 });
    setPastedBlocks([]);
  }, []);

  // Simple clipboard operations using temp files (CLI-friendly approach)
  const copyToClipboard = useCallback((text: string) => {
    try {
      const clipboardPath = join(tmpdir(), 'chat-clipboard.txt');
      writeFileSync(clipboardPath, text, 'utf8');
    } catch {
      // Silently fail - clipboard operations are enhancement only
    }
  }, []);

  const pasteFromClipboard = useCallback((): string => {
    try {
      const clipboardPath = join(tmpdir(), 'chat-clipboard.txt');
      return readFileSync(clipboardPath, 'utf8');
    } catch {
      return ''; // Return empty string if clipboard is empty or inaccessible
    }
  }, []);

  // Helper to find word boundaries for Ctrl+Left/Right navigation
  const findWordBoundary = useCallback(
    (text: string, position: number, direction: 'left' | 'right'): number => {
      if (direction === 'left') {
        // Move left to find start of current word or previous word
        let pos = Math.max(0, position - 1);
        // Skip whitespace
        while (pos > 0) {
          const char = text[pos];
          if (!char || !/\s/.test(char)) {
            break;
          }
          pos--;
        }
        // Skip word characters
        while (pos > 0) {
          const prevChar = text[pos - 1];
          if (!prevChar || /\s/.test(prevChar)) {
            break;
          }
          pos--;
        }
        return pos;
      }

      // Move right to find end of current word or next word
      let pos = position;
      // Skip current word
      while (pos < text.length) {
        const char = text[pos];
        if (!char || /\s/.test(char)) {
          break;
        }
        pos++;
      }
      // Skip whitespace
      while (pos < text.length) {
        const char = text[pos];
        if (!char || !/\s/.test(char)) {
          break;
        }
        pos++;
      }
      return pos;
    },
    [],
  );

  const debugKeys = process.env.DEBUG_KEYS === 'true';

  const handleKeypress = useCallback(
    (key: Key) => {
      // Handle ESC key during processing to abort stream
      if (isProcessing) {
        // Only process ESC key when streaming, ignore all other keys
        if (key.name === 'escape' && onAbort && !abortCalledRef.current) {
          if (debugKeys) {
            // biome-ignore lint/suspicious/noConsole: Debug logging is intentional
            console.log('[DEBUG] ESC pressed during processing - aborting stream');
          }
          abortCalledRef.current = true; // Prevent multiple abort calls
          onAbort();
        }
        return; // Ignore all other keys during processing
      }

      const { sequence: input } = key;

      if (debugKeys && (input || key.ctrl || key.meta)) {
        // biome-ignore lint/suspicious/noConsole: Debug logging is intentional
        console.log('[DEBUG] Key event:', {
          input: input || '<none>',
          charCode: input ? input.charCodeAt(0) : null,
          name: key.name,
          paste: key.paste,
          modifiers: {
            ctrl: key.ctrl,
            meta: key.meta,
            shift: key.shift,
          },
          state: {
            inputLength: stateRef.current.value.length,
            exitConfirmation: exitConfirmation?.active,
          },
        });
      }

      // Handle paste events
      if (key.paste) {
        if (debugKeys) {
          // biome-ignore lint/suspicious/noConsole: Debug logging is intentional
          console.log('[DEBUG] Paste event detected:', {
            length: input.length,
            preview: input.slice(0, 50),
          });
        }

        // Split by any combination of \r\n, \n, or \r
        const lines = input.split(/\r\n|\n|\r/);

        if (debugKeys) {
          // biome-ignore lint/suspicious/noConsole: Debug logging is intentional
          console.log('[DEBUG] Paste lines:', {
            lineCount: lines.length,
            firstLine: lines[0],
            lastLine: lines[lines.length - 1],
          });
        }

        if (lines.length > 1) {
          // Multi-line paste - create a placeholder
          const pasteBlock: PastedContent = {
            id: `paste-${Date.now()}`,
            lineCount: lines.length,
            content: input,
            collapsed: true,
          };

          // Get current paste block count
          const currentBlockCount = pastedBlocksRef.current.length;
          setPastedBlocks((prev) => [...prev, pasteBlock]);

          // Insert placeholder in input
          const placeholder = `[Pasted text #${currentBlockCount + 1} +${lines.length} lines]`;

          if (debugKeys) {
            // biome-ignore lint/suspicious/noConsole: Debug logging is intentional
            console.log('[DEBUG] Creating placeholder:', placeholder);
          }

          setState((prevState) => {
            const newValue =
              prevState.value.slice(0, prevState.cursorPosition) +
              placeholder +
              prevState.value.slice(prevState.cursorPosition);
            return {
              value: newValue,
              cursorPosition: prevState.cursorPosition + placeholder.length,
            };
          });
        } else {
          // Single line paste - insert directly
          setState((prevState) => {
            const newValue =
              prevState.value.slice(0, prevState.cursorPosition) +
              input +
              prevState.value.slice(prevState.cursorPosition);
            return {
              value: newValue,
              cursorPosition: prevState.cursorPosition + input.length,
            };
          });
        }
        return;
      }

      // Handle CTRL+C for clear/exit (not clipboard operations)
      if (key.ctrl && key.name === 'c' && !key.meta) {
        const currentState = stateRef.current;

        if (currentState.value.length > 0) {
          // Clear input when content exists
          if (debugKeys) {
            // biome-ignore lint/suspicious/noConsole: Debug logging is intentional
            console.log('[DEBUG] CTRL+C: Clearing input');
          }
          clearInput();
          setExitConfirmation(null); // Reset any exit confirmation
          return;
        }

        // Empty input - handle exit confirmation
        if (exitConfirmation?.active) {
          // Second press within 3 seconds - exit
          if (debugKeys) {
            // biome-ignore lint/suspicious/noConsole: Debug logging is intentional
            console.log('[DEBUG] CTRL+C: Exiting (second press)');
          }
          onExit();
          // Force immediate exit in case the app doesn't exit cleanly
          process.nextTick(() => process.exit(0));
        } else {
          // First press - show confirmation
          if (debugKeys) {
            // biome-ignore lint/suspicious/noConsole: Debug logging is intentional
            console.log('[DEBUG] CTRL+C: Showing exit confirmation (first press)');
          }
          setExitConfirmation({ active: true, timestamp: Date.now() });
        }
        return;
      }

      // Handle platform-specific clipboard shortcuts
      const isClipboardModifier = isMacOS ? key.meta : key.ctrl;

      if (isClipboardModifier) {
        if (key.name === 'c' && key.meta) {
          // CMD+C on macOS - copy to clipboard
          copyToClipboard(stateRef.current.value);
          return;
        }

        if (key.name === 'x') {
          // Cut all text
          copyToClipboard(stateRef.current.value);
          clearInput();
          return;
        }

        if (key.name === 'v') {
          // Paste from clipboard
          const clipboardText = pasteFromClipboard();
          if (clipboardText) {
            setState((prevState) => {
              const newValue =
                prevState.value.slice(0, prevState.cursorPosition) +
                clipboardText +
                prevState.value.slice(prevState.cursorPosition);
              return {
                value: newValue,
                cursorPosition: prevState.cursorPosition + clipboardText.length,
              };
            });
          }
          return;
        }

        if (key.name === 'a') {
          // Select all (move cursor to end)
          setState((prev) => ({
            ...prev,
            cursorPosition: prev.value.length,
          }));
          return;
        }
      }

      if (key.name === 'return') {
        let currentValue = stateRef.current.value;
        if (currentValue.trim()) {
          // Expand paste placeholders before submitting
          pastedBlocksRef.current.forEach((block, index) => {
            const placeholder = `[Pasted text #${index + 1} +${block.lineCount} lines]`;
            currentValue = currentValue.replace(placeholder, block.content);
          });
          onSubmit(currentValue);
          clearInput();
        }
        return;
      }

      // Handle backspace
      if (key.name === 'backspace' || input === '\x7f' || input === '\b' || input === '\x08') {
        setState((prevState) => {
          if (prevState.cursorPosition > 0) {
            const newValue =
              prevState.value.slice(0, prevState.cursorPosition - 1) +
              prevState.value.slice(prevState.cursorPosition);
            return {
              value: newValue,
              cursorPosition: Math.max(0, prevState.cursorPosition - 1),
            };
          }
          return prevState;
        });
        return;
      }

      // Handle delete key
      if (key.name === 'delete') {
        setState((prevState) => {
          if (prevState.cursorPosition < prevState.value.length) {
            const newValue =
              prevState.value.slice(0, prevState.cursorPosition) +
              prevState.value.slice(prevState.cursorPosition + 1);
            return {
              ...prevState,
              value: newValue,
            };
          }
          return prevState;
        });
        return;
      }

      // Handle arrow keys
      if (key.name === 'left') {
        if (key.ctrl) {
          // Ctrl+Left: Move to previous word
          setState((prev) => {
            const newPosition = findWordBoundary(prev.value, prev.cursorPosition, 'left');
            return {
              ...prev,
              cursorPosition: newPosition,
            };
          });
        } else if (key.meta && isMacOS) {
          // Cmd+Left on macOS: Move to beginning of line
          setState((prev) => ({
            ...prev,
            cursorPosition: 0,
          }));
        } else {
          // Regular left arrow
          setState((prev) => ({
            ...prev,
            cursorPosition: Math.max(0, prev.cursorPosition - 1),
          }));
        }
        return;
      }

      if (key.name === 'right') {
        if (key.ctrl) {
          // Ctrl+Right: Move to next word
          setState((prev) => {
            const newPosition = findWordBoundary(prev.value, prev.cursorPosition, 'right');
            return {
              ...prev,
              cursorPosition: newPosition,
            };
          });
        } else if (key.meta && isMacOS) {
          // Cmd+Right on macOS: Move to end of line
          setState((prev) => ({
            ...prev,
            cursorPosition: prev.value.length,
          }));
        } else {
          // Regular right arrow
          setState((prev) => ({
            ...prev,
            cursorPosition: Math.min(prev.value.length, prev.cursorPosition + 1),
          }));
        }
        return;
      }

      // Handle home/end keys
      if (key.name === 'home' || (key.ctrl && key.name === 'a')) {
        setState((prev) => ({
          ...prev,
          cursorPosition: 0,
        }));
        return;
      }

      if (key.name === 'end' || (key.ctrl && key.name === 'e')) {
        setState((prev) => ({
          ...prev,
          cursorPosition: prev.value.length,
        }));
        return;
      }

      // Regular character input
      if (input && !key.ctrl && !key.meta && key.name !== 'up' && key.name !== 'down') {
        setState((prevState) => {
          const newValue =
            prevState.value.slice(0, prevState.cursorPosition) +
            input +
            prevState.value.slice(prevState.cursorPosition);
          return {
            value: newValue,
            cursorPosition: prevState.cursorPosition + input.length,
          };
        });
      }
    },
    [
      isProcessing,
      debugKeys,
      exitConfirmation,
      clearInput,
      onExit,
      onSubmit,
      onAbort,
      isMacOS,
      copyToClipboard,
      pasteFromClipboard,
      findWordBoundary,
    ],
  );

  useKeypress(handleKeypress, { isActive: true });

  return {
    input: state.value,
    cursorPosition: state.cursorPosition,
    clearInput,
    showExitConfirmation: exitConfirmation?.active ?? false,
    pastedBlocks,
  };
}

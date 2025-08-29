import { Text } from 'ink';
import { marked, type Renderer } from 'marked';
import { markedTerminal } from 'marked-terminal';
import type React from 'react';

export interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  try {
    // Configure marked with terminal renderer
    const renderer = markedTerminal({});

    // Use marked with options that include the renderer
    // We need to cast to unknown first because TerminalRenderer is compatible
    // at runtime but doesn't fully implement the _Renderer interface
    const fullRendered = marked(content, { renderer: renderer as unknown as Renderer }) as string;

    return <Text>{fullRendered.trim()}</Text>;
  } catch (_error) {
    return <Text>{content}</Text>;
  }
};

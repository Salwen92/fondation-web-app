import { Box, Text } from 'ink';
import type React from 'react';

interface CodeBlockProps {
  content: string;
  language?: string;
  showLineNumbers?: boolean;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ content, showLineNumbers = false }) => {
  const lines = content.split('\n');

  return (
    <Box borderStyle="single" paddingX={1}>
      <Text wrap="wrap">
        {showLineNumbers
          ? lines.map((line, i) => (
              <Text key={`line-${i}-${line.slice(0, 10).replace(/\s/g, '_')}`}>
                <Text color="gray">{String(i + 1).padStart(4, ' ')} │ </Text>
                {line}
                {i < lines.length - 1 ? '\n' : ''}
              </Text>
            ))
          : content}
      </Text>
    </Box>
  );
};

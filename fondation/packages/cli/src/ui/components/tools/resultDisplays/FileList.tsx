import { Box, Text } from 'ink';
import type React from 'react';

interface FileListProps {
  files: string[];
  showCount?: boolean;
}

export const FileList: React.FC<FileListProps> = ({ files, showCount = true }) => {
  return (
    <Box flexDirection="column">
      {showCount && <Text color="gray">{files.length} files</Text>}
      <Box flexDirection="column" marginTop={showCount ? 1 : 0}>
        {files.map((file) => (
          <Text key={file} color="cyan">
            • {file}
          </Text>
        ))}
      </Box>
    </Box>
  );
};

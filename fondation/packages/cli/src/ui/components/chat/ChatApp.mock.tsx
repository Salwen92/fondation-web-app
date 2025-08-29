import { Box } from 'ink';
import type React from 'react';
import { generateComprehensiveMockConversation } from '../../../utils/mockData';
import { ChatFooter } from './ChatFooter';
import { ChatHeader } from './ChatHeader';
import { ChatScrollableArea } from './ChatScrollableArea';

// Static component for demonstrating all UI states
export const ChatAppMock: React.FC = () => {
  // Generate comprehensive mock conversation with all tool types and states
  const mockConversation = generateComprehensiveMockConversation();

  // Static mock state - no interactivity
  const mockState = {
    messages: mockConversation.messages,
    currentInput: '',
    isProcessing: false,
    error: undefined,
    cursorPosition: 0,
  };

  return (
    <Box flexDirection="column">
      <ChatHeader />

      <ChatScrollableArea messages={mockState.messages} />

      <ChatFooter
        isProcessing={mockState.isProcessing}
        hasInput={mockState.currentInput.length > 0}
      />

      {/* No ChatInput component - this is purely for display */}
    </Box>
  );
};

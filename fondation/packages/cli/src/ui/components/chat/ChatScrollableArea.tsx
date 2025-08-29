import { Box, Text } from 'ink';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import type { Message } from '../../../types/chat';
import { ChatMessage } from './ChatMessage';
import { groupMessagesByTask, TaskGroupRenderer } from './TaskGroupRenderer';

interface TaskGroup {
  taskMessage: Message;
  childMessages: Message[];
}

export interface ChatScrollableAreaProps {
  messages: Message[];
  isProcessing?: boolean;
}

export const ChatScrollableArea: React.FC<ChatScrollableAreaProps> = ({
  messages,
  isProcessing,
}) => {
  // Use a local state to debounce message updates during streaming
  const [displayMessages, setDisplayMessages] = useState(messages);

  // Update display messages, with immediate updates when not streaming
  useEffect(() => {
    if (!isProcessing) {
      // Immediate update when not streaming
      setDisplayMessages(messages);
      return;
    }

    // Debounced update during streaming to prevent UI hanging
    const timer = setTimeout(() => {
      setDisplayMessages(messages);
    }, 50); // 50ms debounce

    return () => clearTimeout(timer);
  }, [messages, isProcessing]);
  // Memoize the rendered content to prevent unnecessary re-renders
  const renderedMessages = useMemo(() => {
    // Sort messages by timestamp to maintain chronological order
    const sortedMessages = [...displayMessages].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const { taskGroups } = groupMessagesByTask(sortedMessages);

    // Create a map for quick lookup of task groups by task message timestamp
    const taskGroupMap = new Map<string, TaskGroup>();
    taskGroups.forEach((group) => {
      taskGroupMap.set(group.taskMessage.id, group);
    });
    const renderedElements: React.ReactNode[] = [];
    const processedTaskIds = new Set<string>();

    sortedMessages.forEach((message) => {
      // If this is a Task message, render the entire task group
      if (message.toolUse?.name === 'Task' && !processedTaskIds.has(message.id)) {
        const taskGroup = taskGroupMap.get(message.id);
        if (taskGroup) {
          renderedElements.push(
            <TaskGroupRenderer key={`task-group-${message.id}`} taskGroups={[taskGroup]} />,
          );
          processedTaskIds.add(message.id);
          // Mark all child messages as processed to avoid duplicate rendering
          taskGroup.childMessages.forEach((child) => {
            processedTaskIds.add(child.id);
          });
        }
      }
      // If this message is not part of a task group and not already processed
      else if (!processedTaskIds.has(message.id) && !message.parentToolUseId) {
        renderedElements.push(<ChatMessage key={message.id} message={message} />);
      }
    });

    return renderedElements;
  }, [displayMessages]);

  return (
    <Box
      flexGrow={1}
      flexDirection="column"
      // borderStyle="single"
      // borderColor="gray"
      paddingX={1}
      paddingY={0}
    >
      {renderedMessages}

      {messages.length === 0 && (
        <Text dimColor italic>
          No messages to display
        </Text>
      )}
    </Box>
  );
};

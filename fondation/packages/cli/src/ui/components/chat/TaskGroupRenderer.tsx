import { Box, Text } from 'ink';
import type { Message } from '../../../types/chat';
import { Spinner } from '../spinners/Spinner';

interface TaskGroup {
  taskMessage: Message;
  childMessages: Message[];
}

interface TaskGroupRendererProps {
  taskGroups: TaskGroup[];
}

export function TaskGroupRenderer({ taskGroups }: TaskGroupRendererProps) {
  const getTaskStatus = (childMessages: Message[]) => {
    const toolMessages = childMessages.filter((msg) => msg.toolUse);
    if (toolMessages.length === 0) {
      return 'pending';
    }

    const completedTools = toolMessages.filter((msg) => msg.toolUse?.status === 'completed');
    if (completedTools.length === toolMessages.length) {
      return 'completed';
    }

    const inProgressTools = toolMessages.filter((msg) => msg.toolUse?.status === 'in_progress');
    if (inProgressTools.length > 0) {
      return 'in_progress';
    }

    return 'pending';
  };

  const getStatusIndicator = (status: string) => {
    switch (status) {
      case 'completed':
        return <Text color="green">⏺</Text>;
      case 'in_progress':
        return <Text color="white">⏺</Text>;
      default:
        return (
          <Text color="gray">
            <Spinner type="dots" />
          </Text>
        );
    }
  };

  return (
    <>
      {taskGroups.map(({ taskMessage, childMessages }) => {
        const taskStatus = getTaskStatus(childMessages);
        const toolCount = childMessages.filter((msg) => msg.toolUse).length;

        return (
          <Box key={taskMessage.id} flexDirection="column">
            <Box flexDirection="row" alignItems="center">
              {getStatusIndicator(taskStatus)}
              <Box marginLeft={1}>
                <Text bold>
                  Task(
                  {(taskMessage.toolUse?.input as { description?: string })?.description ??
                    'Unknown Task'}
                  )
                </Text>
              </Box>
            </Box>

            <Box flexDirection="row" marginLeft={2}>
              <Text color="gray">⎿</Text>
              <Box marginLeft={1}>
                <Text color="gray">
                  {toolCount > 0 ? `${toolCount} tool${toolCount === 1 ? '' : 's'}` : 'No tools'}
                </Text>
              </Box>
            </Box>
          </Box>
        );
      })}
    </>
  );
}

export function groupMessagesByTask(messages: Message[]): {
  taskGroups: TaskGroup[];
  ungroupedMessages: Message[];
} {
  const taskGroups: TaskGroup[] = [];
  const ungroupedMessages: Message[] = [];
  const messageMap = new Map<string, Message>();

  // Create a map of all messages by ID
  messages.forEach((msg) => {
    messageMap.set(msg.id, msg);
  });

  // Find all Task messages
  const taskMessages = messages.filter((msg) => msg.toolUse?.name === 'Task');

  // Group messages by their parent Task
  taskMessages.forEach((taskMessage) => {
    const childMessages = messages.filter(
      (msg) => msg.parentToolUseId === taskMessage.id && msg.id !== taskMessage.id,
    );

    taskGroups.push({
      taskMessage,
      childMessages,
    });
  });

  // Collect messages that aren't part of any task group
  const groupedMessageIds = new Set<string>();
  taskGroups.forEach((group) => {
    groupedMessageIds.add(group.taskMessage.id);
    group.childMessages.forEach((child) => {
      groupedMessageIds.add(child.id);
    });
  });

  messages.forEach((msg) => {
    if (!groupedMessageIds.has(msg.id)) {
      ungroupedMessages.push(msg);
    }
  });

  return { taskGroups, ungroupedMessages };
}

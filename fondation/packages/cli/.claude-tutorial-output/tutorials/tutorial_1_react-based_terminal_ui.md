Based on the project's testing patterns, here's how to validate your tutorial implementation:

### Exercise 4.1: Manual Testing Script

Create a test script to validate your components:

```typescript
#!/usr/bin/env bun
import { render } from 'ink';
import { TutorialInteractiveApp } from './tutorial-ui';

// Test Script - Run with: bun test-tutorial.tsx
const TestTutorialUI = () => {
  console.log('Testing Tutorial Terminal UI Components...');
  console.log('Press Ctrl+C to exit');
  
  return <TutorialInteractiveApp />;
};

render(<TestTutorialUI />);
```

### Exercise 4.2: Validation Checklist

Test each component against these criteria:

**Progress Display Component:**
- [ ] Shows correct icons for each task status
- [ ] Colors match the status (green=done, red=error, yellow=running)
- [ ] Current task is highlighted appropriately
- [ ] Layout doesn't break with long task names

**Monitor Component:**
- [ ] Real-time duration updates work correctly
- [ ] Cost formatting displays appropriate decimal places
- [ ] Status changes are reflected immediately
- [ ] Warning appears for long-running processes (>30 seconds)

**Main App Layout:**
- [ ] Two-column layout adapts to terminal width
- [ ] Header shows current time updating every second
- [ ] Error states display clearly with proper styling
- [ ] Footer remains visible at bottom

### Exercise 4.3: Edge Case Testing

Test these scenarios:

```typescript
// Test data for edge cases
const edgeCaseTests = {
  emptyTasks: {
    tasks: [],
    currentTaskIndex: 0,
    logs: [],
  },
  
  manyTasks: {
    tasks: Array.from({ length: 20 }, (_, i) => ({
      id: `task-${i}`,
      name: `Very Long Task Name That Should Wrap Correctly ${i}`,
      status: i < 5 ? 'completed' : i < 10 ? 'running' : 'pending',
    })),
  },
  
  expensiveProcess: {
    stats: {
      isActive: true,
      totalCost: 15.2847,
      duration: 120000, // 2 minutes
      status: 'processing',
    },
  },
};
```

### Exercise 4.4: Performance Validation

Ensure your implementation handles updates efficiently:

```typescript
// Add performance monitoring to your components
const TutorialMonitor: React.FC<{stats: TutorialStats}> = ({ stats }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  
  // Log excessive re-renders (helpful for debugging)
  if (renderCount.current > 50) {
    console.warn('TutorialMonitor: High render count detected');
  }
  
  // ... rest of component
};
```

## Success Criteria

Your implementation should meet these requirements:

- [ ] **Visual Consistency**: Components use the same color scheme as the original (green/red/yellow/blue)
- [ ] **Real-time Updates**: Time, progress, and costs update dynamically
- [ ] **Error Handling**: Error states display clearly with helpful messages
- [ ] **Responsive Layout**: Interface adapts to different terminal sizes
- [ ] **State Management**: Centralized state with proper callback functions
- [ ] **TypeScript Compliance**: All interfaces properly typed with no errors
- [ ] **Performance**: Components re-render only when necessary

### Debugging Tips

Common issues and solutions:

1. **Colors not showing**: Ensure your terminal supports ANSI colors
2. **Layout breaking**: Check `flexGrow`, `flexShrink`, and `minWidth` properties
3. **Updates not showing**: Verify state updates are immutable (using spread operator)
4. **Memory leaks**: Always clean up intervals and timers in `useEffect` cleanup functions

## Extension Challenges

### Challenge 1: Advanced Progress Indicators

Implement a progress bar similar to ProgressTracker.tsx:54-58:

```typescript
const createProgressBar = (percent: number, width: number = 25) => {
  const filled = Math.round(percent * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
};
```

### Challenge 2: Interactive Controls

Add keyboard shortcuts for controlling the demo:

```typescript
import { useInput } from 'ink';

const InteractiveDemo = () => {
  useInput((input, key) => {
    if (input === 'r') {
      // Reset demo
    }
    if (input === 'e') {
      // Trigger error state
    }
    if (key.space) {
      // Toggle pause/resume
    }
  });
  
  // ... component logic
};
```

### Challenge 3: Data Persistence

Save and restore UI state:

```typescript
const saveState = (state: TutorialState) => {
  localStorage.setItem('tutorial-state', JSON.stringify(state));
};

const loadState = (): TutorialState | null => {
  const saved = localStorage.getItem('tutorial-state');
  return saved ? JSON.parse(saved) : null;
};
```

### Challenge 4: Custom Spinners

Create animated spinners like the Spinner component:

```typescript
const customSpinners = {
  progress: ['▁', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃'],
  clock: ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'],
  arrow: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'],
};
```

### Challenge 5: Integration with Real Workflows

Connect your tutorial UI to an actual long-running process:

```typescript
const RealProcessDemo = () => {
  const [state, setState] = useState(initialState);
  
  const runRealProcess = async () => {
    // Connect to actual API or file processing
    // Update UI state as process progresses
    // Handle real errors and timeouts
  };
  
  // ... implementation
};
```

By completing these exercises, you'll have built a fully functional terminal UI system that demonstrates all the key concepts from the React-based Terminal UI abstraction. The patterns you've learned can be applied to any CLI tool that needs to provide rich user feedback during long-running operations.
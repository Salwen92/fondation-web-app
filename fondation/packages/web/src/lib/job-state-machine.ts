/**
 * Job State Machine
 * Enforces valid state transitions for job processing
 */

import { logger } from './logger';

export type JobState =
  | 'pending'
  | 'cloning'
  | 'analyzing'
  | 'gathering'
  | 'running'
  | 'completed'
  | 'failed'
  | 'canceled';

interface StateTransition {
  from: JobState[];
  to: JobState;
  condition?: (context?: unknown) => boolean;
}

/**
 * Valid state transitions for jobs
 */
const VALID_TRANSITIONS: StateTransition[] = [
  // Normal flow
  { from: ['pending'], to: 'cloning' },
  { from: ['cloning'], to: 'analyzing' },
  { from: ['analyzing'], to: 'gathering' },
  { from: ['gathering'], to: 'running' },
  { from: ['running'], to: 'completed' },

  // Error transitions (can fail from any active state)
  { from: ['pending', 'cloning', 'analyzing', 'gathering', 'running'], to: 'failed' },

  // Cancellation (can cancel from any active state)
  { from: ['pending', 'cloning', 'analyzing', 'gathering', 'running'], to: 'canceled' },

  // Allow retry from failed/canceled
  { from: ['failed', 'canceled'], to: 'pending' },
];

export class JobStateMachine {
  private currentState: JobState;
  private jobId: string;
  private transitionHistory: Array<{ from: JobState; to: JobState; timestamp: number }> = [];

  constructor(jobId: string, initialState: JobState = 'pending') {
    this.jobId = jobId;
    this.currentState = initialState;
    this.logTransition(initialState, initialState);
  }

  /**
   * Get current state
   */
  getState(): JobState {
    return this.currentState;
  }

  /**
   * Check if a transition is valid
   */
  canTransition(to: JobState, context?: unknown): boolean {
    const transition = VALID_TRANSITIONS.find(
      (t) => t.to === to && t.from.includes(this.currentState),
    );

    if (!transition) {
      return false;
    }

    if (transition.condition && !transition.condition(context)) {
      return false;
    }

    return true;
  }

  /**
   * Transition to a new state
   */
  transition(to: JobState, context?: unknown): boolean {
    if (!this.canTransition(to, context)) {
      logger.warn(`Invalid state transition attempted for job ${this.jobId}`, {
        extra: {
          from: this.currentState,
          to,
          jobId: this.jobId,
        },
      });
      return false;
    }

    const from = this.currentState;
    this.currentState = to;
    this.logTransition(from, to);

    logger.info(`Job state transition: ${from} -> ${to}`, {
      extra: {
        jobId: this.jobId,
        from,
        to,
      },
    });

    return true;
  }

  /**
   * Log state transition
   */
  private logTransition(from: JobState, to: JobState): void {
    this.transitionHistory.push({
      from,
      to,
      timestamp: Date.now(),
    });
  }

  /**
   * Get transition history
   */
  getHistory(): Array<{ from: JobState; to: JobState; timestamp: number }> {
    return [...this.transitionHistory];
  }

  /**
   * Check if job is in a terminal state
   */
  isTerminal(): boolean {
    return ['completed', 'failed', 'canceled'].includes(this.currentState);
  }

  /**
   * Check if job is active
   */
  isActive(): boolean {
    return ['pending', 'cloning', 'analyzing', 'gathering', 'running'].includes(this.currentState);
  }

  /**
   * Get next expected states
   */
  getNextStates(): JobState[] {
    return VALID_TRANSITIONS.filter((t) => t.from.includes(this.currentState)).map((t) => t.to);
  }

  /**
   * Reset to pending (for retries)
   */
  reset(): boolean {
    if (!this.isTerminal()) {
      logger.warn(`Cannot reset job ${this.jobId} - not in terminal state`, {
        extra: {
          currentState: this.currentState,
          jobId: this.jobId,
        },
      });
      return false;
    }

    return this.transition('pending');
  }
}

/**
 * Validate a state transition without a state machine instance
 */
export function isValidTransition(from: JobState, to: JobState): boolean {
  return VALID_TRANSITIONS.some((t) => t.to === to && t.from.includes(from));
}

/**
 * Get all valid next states from a given state
 */
export function getValidNextStates(from: JobState): JobState[] {
  return VALID_TRANSITIONS.filter((t) => t.from.includes(from)).map((t) => t.to);
}

/**
 * Create a state machine for a job
 */
export function createJobStateMachine(jobId: string, initialState?: JobState): JobStateMachine {
  return new JobStateMachine(jobId, initialState);
}

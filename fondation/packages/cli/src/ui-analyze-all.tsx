#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { render } from 'ink';
import React, { useCallback, useEffect, useState } from 'react';
import { generateChaptersFromYaml } from './chapter-generator';
import { reviewChaptersFromDirectory } from './chapter-reviewer';
import { getModelConfig } from './config';
import { env } from './env';
import { generateTutorialsFromDirectory } from './tutorial-generator';
import { App, type AppProps } from './ui/components/App';
import { ErrorBoundary } from './ui/components/ErrorBoundary';
import type { WorkflowStep } from './ui/components/ProgressTracker';
import type { QueryStats } from './ui/components/QueryMonitor';

interface AnalyzeAllState {
  command: string;
  projectPath: string;
  outputPath: string;
  currentStepIndex: number;
  overallProgress: number;
  queryStats: QueryStats;
  statusMessage: string;
  statusDetails?: string;
  logs: string[];
  workflowSteps: WorkflowStep[];
  error?: {
    message: string;
    details?: string;
    type?: 'claude-process' | 'general';
  };
  overwrite: boolean;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'abstractions',
    name: 'Extract Core Abstractions',
    description: 'Analyzing codebase to identify key abstractions and patterns',
    status: 'pending',
  },
  {
    id: 'relationships',
    name: 'Analyze Relationships',
    description: 'Understanding how abstractions relate to each other',
    status: 'pending',
  },
  {
    id: 'order',
    name: 'Order Chapters',
    description: 'Determining optimal order for tutorial chapters',
    status: 'pending',
  },
  {
    id: 'generate',
    name: 'Generate Chapters',
    description: 'Creating detailed tutorial chapters',
    status: 'pending',
  },
  {
    id: 'review',
    name: 'Review Chapters',
    description: 'Reviewing and refining generated chapters',
    status: 'pending',
  },
  {
    id: 'tutorials',
    name: 'Generate Tutorials',
    description: 'Creating interactive tutorials from reviewed chapters',
    status: 'pending',
  },
];

const AnalyzeAllApp: React.FC<{ projectDir: string; outputDir: string; overwrite: boolean }> = ({
  projectDir,
  outputDir,
  overwrite,
}) => {
  const [state, setState] = useState<AnalyzeAllState>({
    command: 'analyze-all',
    projectPath: projectDir,
    outputPath: outputDir,
    currentStepIndex: 0,
    overallProgress: 0,
    queryStats: {
      isActive: false,
      duration: 0,
      totalCost: 0,
      numTurns: 0,
      status: 'waiting',
    },
    statusMessage: 'Initializing complete codebase analysis workflow...',
    logs: [],
    workflowSteps: [...WORKFLOW_STEPS],
    overwrite,
  });

  const addLog = useCallback((message: string) => {
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, `${new Date().toLocaleTimeString()}: ${message}`],
    }));
  }, []);

  const updateQueryStats = React.useCallback((updates: Partial<QueryStats>) => {
    setState((prev) => ({
      ...prev,
      queryStats: { ...prev.queryStats, ...updates },
    }));
  }, []);

  const updateWorkflowStep = useCallback((stepId: string, status: WorkflowStep['status']) => {
    setState((prev) => ({
      ...prev,
      workflowSteps: prev.workflowSteps.map((step) =>
        step.id === stepId ? { ...step, status } : step,
      ),
    }));
  }, []);

  const runPromptWithUI = useCallback(
    async (
      promptPath: string,
      workingDirectory: string,
      variables?: Record<string, string>,
      stepId?: string,
    ): Promise<void> => {
      let promptContent = await readFile(promptPath, 'utf-8');

      if (variables) {
        for (const [key, value] of Object.entries(variables)) {
          promptContent = promptContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
        }
      }

      if (stepId) {
        updateWorkflowStep(stepId, 'running');
      }

      updateQueryStats({
        isActive: true,
        status: 'processing',
        startTime: new Date(),
        totalCost: 0,
        numTurns: 0,
      });

      const messages: SDKMessage[] = [];
      const modelConfig = getModelConfig();

      try {
        for await (const message of query({
          prompt: 'please respect you system prompt very carefully',
          abortController: new AbortController(),
          options: {
            customSystemPrompt: promptContent,
            allowedTools: ['Write', 'Read', 'LS', 'Glob', 'Grep', 'Edit', 'Bash'],
            cwd: workingDirectory,
            model: modelConfig.model,
          },
        })) {
          messages.push(message);

          // Only update UI for final assistant messages and results to prevent excessive re-renders
          if (message.type === 'assistant' && typeof message.message === 'string') {
            // Only update for text messages, not tool calls
            updateQueryStats({
              lastMessage: message.message,
            });
          } else if (message.type === 'result') {
            updateQueryStats({
              isActive: false,
              status: 'completed',
              duration: message.duration_ms,
              totalCost: message.total_cost_usd,
              numTurns: message.num_turns,
            });

            addLog(
              `Completed in ${message.duration_ms}ms (Cost: $${message.total_cost_usd.toFixed(4)})`,
            );

            if (stepId) {
              updateWorkflowStep(stepId, 'completed');
            }
          }
          // Skip UI updates for tool_use, tool_result, and other intermediate messages
        }
      } catch (error) {
        updateQueryStats({ isActive: false, status: 'error' });
        if (stepId) {
          updateWorkflowStep(stepId, 'error');
        }

        // Handle Claude Code process errors specifically
        if (
          error instanceof Error &&
          error.message.includes('Claude Code process exited with code null')
        ) {
          setState((prev) => ({
            ...prev,
            error: {
              message: 'Claude Code process was terminated unexpectedly',
              details: 'This may be due to system resource constraints or process limits',
              type: 'claude-process',
            },
          }));
        } else {
          setState((prev) => ({
            ...prev,
            error: {
              message: error instanceof Error ? error.message : 'Unknown error occurred',
              type: 'general',
            },
          }));
        }
        throw error;
      }
    },
    [addLog, updateQueryStats, updateWorkflowStep],
  );

  const ensureOutputDirectory = useCallback(
    async (outputDir: string): Promise<void> => {
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
        addLog(`Created output directory: ${outputDir}`);
      }
    },
    [addLog],
  );

  const runWorkflow = useCallback(async () => {
    try {
      await ensureOutputDirectory(outputDir);

      // Step 1: Extract core abstractions
      const abstractionsPrompt = resolve(process.cwd(), 'prompts/1-abstractions.md');
      const abstractionsOutput = join(outputDir, 'step1_abstractions.yaml');

      if (existsSync(abstractionsOutput) && !state.overwrite) {
        setState((prev) => ({
          ...prev,
          currentStepIndex: 0,
          statusMessage: 'Skipping core abstractions (file exists)...',
        }));
        updateWorkflowStep('abstractions', 'completed');
        addLog(`[SKIP] Using existing file: ${abstractionsOutput}`);
      } else {
        setState((prev) => ({
          ...prev,
          currentStepIndex: 0,
          statusMessage: 'Extracting core abstractions...',
        }));
        await runPromptWithUI(
          abstractionsPrompt,
          projectDir,
          { OUTPUT_PATH: abstractionsOutput },
          'abstractions',
        );

        if (!existsSync(abstractionsOutput)) {
          throw new Error('Step 1 failed: abstractions file was not created');
        }
      }
      setState((prev) => ({ ...prev, overallProgress: 1 / 6 }));

      // Step 2: Analyze relationships
      const relationshipsPrompt = resolve(process.cwd(), 'prompts/2-analyze-relationshipt.md');
      const relationshipsOutput = join(outputDir, 'step2_relationships.yaml');

      if (existsSync(relationshipsOutput) && !state.overwrite) {
        setState((prev) => ({
          ...prev,
          currentStepIndex: 1,
          statusMessage: 'Skipping relationships analysis (file exists)...',
        }));
        updateWorkflowStep('relationships', 'completed');
        addLog(`[SKIP] Using existing file: ${relationshipsOutput}`);
      } else {
        setState((prev) => ({
          ...prev,
          currentStepIndex: 1,
          statusMessage: 'Analyzing relationships...',
        }));
        await runPromptWithUI(
          relationshipsPrompt,
          projectDir,
          {
            OUTPUT_PATH: relationshipsOutput,
            ABSTRACTIONS_PATH: abstractionsOutput,
          },
          'relationships',
        );

        if (!existsSync(relationshipsOutput)) {
          throw new Error('Step 2 failed: relationships file was not created');
        }
      }
      setState((prev) => ({ ...prev, overallProgress: 2 / 6 }));

      // Step 3: Order chapters
      const orderPrompt = resolve(process.cwd(), 'prompts/3-order-chapters.md');
      const chapterOrderOutput = join(outputDir, 'step3_order.yaml');

      if (existsSync(chapterOrderOutput) && !state.overwrite) {
        setState((prev) => ({
          ...prev,
          currentStepIndex: 2,
          statusMessage: 'Skipping chapter ordering (file exists)...',
        }));
        updateWorkflowStep('order', 'completed');
        addLog(`[SKIP] Using existing file: ${chapterOrderOutput}`);
      } else {
        setState((prev) => ({
          ...prev,
          currentStepIndex: 2,
          statusMessage: 'Ordering chapters...',
        }));
        await runPromptWithUI(
          orderPrompt,
          projectDir,
          {
            OUTPUT_PATH: chapterOrderOutput,
            ABSTRACTIONS_PATH: abstractionsOutput,
            RELATIONSHIPS_PATH: relationshipsOutput,
          },
          'order',
        );

        if (!existsSync(chapterOrderOutput)) {
          throw new Error('Step 3 failed: chapter order file was not created');
        }
      }
      setState((prev) => ({ ...prev, overallProgress: 3 / 6 }));

      // Step 4: Generate chapters
      setState((prev) => ({
        ...prev,
        currentStepIndex: 3,
        statusMessage: 'Generating chapters...',
      }));
      updateWorkflowStep('generate', 'running');
      const chaptersDir = join(outputDir, 'chapters');
      const promptTemplatePath = resolve(process.cwd(), 'prompts/4-write-chapters.md');

      await generateChaptersFromYaml(
        abstractionsOutput,
        relationshipsOutput,
        chapterOrderOutput,
        chaptersDir,
        promptTemplatePath,
        projectDir,
        {
          overwrite: state.overwrite,
          onProgress: (message, type) => {
            if (type === 'skip') {
              addLog(`[SKIP] ${message}`);
            } else if (type === 'generate') {
              addLog(`[GENERATE] ${message}`);
            } else if (type === 'complete') {
              addLog(`[COMPLETE] ${message}`);
            }
            setState((prev) => ({ ...prev, statusDetails: message }));
          },
        },
      );
      updateWorkflowStep('generate', 'completed');
      setState((prev) => ({ ...prev, overallProgress: 4 / 6 }));

      // Step 5: Review chapters
      setState((prev) => ({
        ...prev,
        currentStepIndex: 4,
        statusMessage: 'Reviewing chapters...',
      }));
      updateWorkflowStep('review', 'running');
      const reviewedChaptersDir = join(outputDir, 'reviewed-chapters');
      const reviewPromptPath = resolve(process.cwd(), 'prompts/5-review-chapters.md');

      await reviewChaptersFromDirectory(
        chaptersDir,
        abstractionsOutput,
        chapterOrderOutput,
        reviewedChaptersDir,
        reviewPromptPath,
        projectDir,
        {
          overwrite: state.overwrite,
          onProgress: (message, type) => {
            if (type === 'skip') {
              addLog(`[SKIP] ${message}`);
            } else if (type === 'generate') {
              addLog(`[REVIEW] ${message}`);
            } else if (type === 'complete') {
              addLog(`[COMPLETE] ${message}`);
            }
            setState((prev) => ({ ...prev, statusDetails: message }));
          },
        },
      );
      updateWorkflowStep('review', 'completed');
      setState((prev) => ({ ...prev, overallProgress: 5 / 6 }));

      // Step 6: Generate interactive tutorials
      setState((prev) => ({
        ...prev,
        currentStepIndex: 5,
        statusMessage: 'Generating interactive tutorials...',
      }));
      updateWorkflowStep('tutorials', 'running');
      const tutorialsDir = join(outputDir, 'tutorials');
      const tutorialPromptPath = resolve(process.cwd(), 'prompts/6-tutorials.md');

      await generateTutorialsFromDirectory(
        reviewedChaptersDir,
        abstractionsOutput,
        chapterOrderOutput,
        tutorialsDir,
        tutorialPromptPath,
        projectDir,
        {
          overwrite: state.overwrite,
          onProgress: (message, type) => {
            if (type === 'skip') {
              addLog(`[SKIP] ${message}`);
            } else if (type === 'generate') {
              addLog(`[TUTORIAL] ${message}`);
            } else if (type === 'complete') {
              addLog(`[COMPLETE] ${message}`);
            }
            setState((prev) => ({ ...prev, statusDetails: message }));
          },
        },
      );
      updateWorkflowStep('tutorials', 'completed');
      setState((prev) => ({
        ...prev,
        overallProgress: 1.0,
        statusMessage: 'Complete workflow finished successfully!',
        statusDetails: `Check output at: ${outputDir}`,
      }));

      addLog('Complete workflow finished successfully!');
    } catch (error) {
      // Handle Claude Code process errors specifically
      if (
        error instanceof Error &&
        error.message.includes('Claude Code process exited with code null')
      ) {
        setState((prev) => ({
          ...prev,
          statusMessage: 'Claude Code process terminated',
          statusDetails: 'Process was terminated unexpectedly',
          error: {
            message: 'Claude Code process was terminated unexpectedly',
            details: 'This may be due to system resource constraints or process limits',
            type: 'claude-process',
          },
        }));
      } else {
        setState((prev) => ({
          ...prev,
          statusMessage: 'Workflow failed',
          statusDetails: error instanceof Error ? error.message : 'Unknown error',
          error: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            type: 'general',
          },
        }));
      }
      addLog(`Workflow failed: ${error}`);
    }
  }, [
    outputDir,
    projectDir,
    state.overwrite,
    addLog,
    ensureOutputDirectory,
    runPromptWithUI,
    updateWorkflowStep,
  ]);

  useEffect(() => {
    runWorkflow();
  }, [runWorkflow]);

  const appProps: AppProps = {
    command: state.command,
    projectPath: state.projectPath,
    outputPath: state.outputPath,
    workflowSteps: state.workflowSteps,
    currentStepIndex: state.currentStepIndex,
    overallProgress: state.overallProgress,
    queryStats: state.queryStats,
    statusMessage: state.statusMessage,
    logs: state.logs,
  };

  if (state.statusDetails) {
    appProps.statusDetails = state.statusDetails;
  }

  if (state.error) {
    appProps.error = state.error;
  }

  return (
    <ErrorBoundary>
      <App {...appProps} />
    </ErrorBoundary>
  );
};

async function main() {
  const args = process.argv.slice(2);
  let overwrite = false;
  let projectDirArg: string | undefined;

  // Parse command line arguments
  for (const arg of args) {
    if (arg === '--overwrite') {
      overwrite = true;
    } else if (!projectDirArg) {
      projectDirArg = arg;
    }
  }

  if (!projectDirArg) {
    process.exit(1);
  }

  const projectDir = resolve(process.cwd(), projectDirArg);
  const outputDirName = env.CLAUDE_OUTPUT_DIR;
  const outputDir = resolve(projectDir, outputDirName);

  if (!existsSync(projectDir)) {
    process.exit(1);
  }

  render(<AnalyzeAllApp projectDir={projectDir} outputDir={outputDir} overwrite={overwrite} />);
}

main().catch((_error) => {
  process.exit(1);
});

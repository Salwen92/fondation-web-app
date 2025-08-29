#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { generateChaptersFromYaml } from './chapter-generator.js';
import { reviewChaptersFromDirectory } from './chapter-reviewer.js';
import { getModelConfig } from './config';
import { generateTutorialsFromDirectory } from './tutorial-generator.js';

async function runPrompt(
  promptPath: string,
  workingDirectory: string,
  variables?: Record<string, string>,
): Promise<void> {
  let promptContent = await readFile(promptPath, 'utf-8');

  // Replace variables in the prompt
  if (variables) {
    for (const [key, value] of Object.entries(variables)) {
      promptContent = promptContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
  }

  const messages: SDKMessage[] = [];
  const modelConfig = getModelConfig();

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

    if (message.type === 'result') {
      // Result message handled by caller
    }
  }
}

async function ensureOutputDirectory(outputDir: string): Promise<void> {
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    process.exit(1);
  }

  const projectDir = resolve(process.cwd(), args[0] || '.');
  const outputDirName = process.env.CLAUDE_OUTPUT_DIR || '.claude-tutorial-output';
  const outputDir = resolve(projectDir, outputDirName);

  if (!existsSync(projectDir)) {
    process.exit(1);
  }

  try {
    // Ensure output directory exists
    await ensureOutputDirectory(outputDir);
    const abstractionsPrompt = resolve(process.cwd(), 'prompts/1-abstractions.md');
    const abstractionsOutput = join(outputDir, 'step1_abstractions.yaml');
    await runPrompt(abstractionsPrompt, projectDir, {
      OUTPUT_PATH: abstractionsOutput,
    });

    if (!existsSync(abstractionsOutput)) {
      throw new Error('Step 1 failed: abstractions file was not created');
    }
    const relationshipsPrompt = resolve(process.cwd(), 'prompts/2-analyze-relationshipt.md');
    const relationshipsOutput = join(outputDir, 'step2_relationships.yaml');
    await runPrompt(relationshipsPrompt, projectDir, {
      OUTPUT_PATH: relationshipsOutput,
      ABSTRACTIONS_PATH: abstractionsOutput,
    });

    if (!existsSync(relationshipsOutput)) {
      throw new Error('Step 2 failed: relationships file was not created');
    }
    const orderPrompt = resolve(process.cwd(), 'prompts/3-order-chapters.md');
    const chapterOrderOutput = join(outputDir, 'step3_order.yaml');
    await runPrompt(orderPrompt, projectDir, {
      OUTPUT_PATH: chapterOrderOutput,
      ABSTRACTIONS_PATH: abstractionsOutput,
      RELATIONSHIPS_PATH: relationshipsOutput,
    });

    if (!existsSync(chapterOrderOutput)) {
      throw new Error('Step 3 failed: chapter order file was not created');
    }
    const chaptersDir = join(outputDir, 'chapters');
    const promptTemplatePath = resolve(process.cwd(), 'prompts/4-write-chapters.md');

    await generateChaptersFromYaml(
      abstractionsOutput,
      relationshipsOutput,
      chapterOrderOutput,
      chaptersDir,
      promptTemplatePath,
      projectDir,
    );
    const reviewedChaptersDir = join(outputDir, 'reviewed-chapters');
    const reviewPromptPath = resolve(process.cwd(), 'prompts/5-review-chapters.md');

    await reviewChaptersFromDirectory(
      chaptersDir,
      abstractionsOutput,
      chapterOrderOutput,
      reviewedChaptersDir,
      reviewPromptPath,
      projectDir,
    );
    const tutorialsDir = join(outputDir, 'tutorials');
    const tutorialPromptPath = resolve(process.cwd(), 'prompts/6-tutorials.md');

    await generateTutorialsFromDirectory(
      reviewedChaptersDir,
      abstractionsOutput,
      chapterOrderOutput,
      tutorialsDir,
      tutorialPromptPath,
      projectDir,
    );
  } catch (_error) {
    process.exit(1);
  }
}

main().catch((error) => {
  process.stderr.write(String(error));
  process.exit(1);
});

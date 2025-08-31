import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import * as yaml from 'yaml';
import { z } from 'zod';
import { getModelConfig } from './config';
import {
  checkFileExists,
  createGeneratingMessage,
  createSkipMessage,
  type FileGenerationOptions,
} from './utils/file-generation';

// Reuse schemas from chapter-generator
const AbstractionSchema = z.object({
  name: z.string(),
  description: z.string(),
  file_paths: z.array(z.string()),
});

const AbstractionsYamlSchema = z.array(AbstractionSchema);

const ChapterOrderItemSchema = z.object({
  index: z.number(),
  name: z.string(),
  reasoning: z.string(),
});

const ChapterOrderYamlSchema = z.object({
  order: z.array(ChapterOrderItemSchema),
});

export interface ChapterReviewerOptions extends FileGenerationOptions {
  chaptersDir: string;
  abstractionsPath: string;
  chapterOrderPath: string;
  outputDir: string;
  promptTemplatePath: string;
  projectRootPath?: string;
  onProgress?: (message: string, type: 'skip' | 'generate' | 'complete') => void;
}

export class ChapterReviewer {
  constructor(private options: ChapterReviewerOptions) {}

  async reviewChapters(): Promise<void> {
    // Ensure output directory exists
    await mkdir(this.options.outputDir, { recursive: true });

    // Read abstractions and chapter order
    const abstractions = await this.readAbstractions();
    const chapterOrder = await this.readChapterOrder();

    // Read the review prompt template
    const promptTemplate = await readFile(this.options.promptTemplatePath, 'utf-8');

    // Get all chapter files
    const chapterFiles = await this.getChapterFiles();

    // Sort chapters by index to ensure correct ordering
    const sortedChapters = chapterOrder.order.sort((a, b) => a.index - b.index);

    // Create full chapter listing for cross-references
    const fullChapterListing = sortedChapters
      .map((ch) => {
        const filename = `chapter_${ch.index}_${ch.name.trim().toLowerCase().replace(/\s+/g, '_').replace(/\//g, '_')}.md`;
        return `- [Chapter ${ch.index}: ${ch.name}](${filename})`;
      })
      .join('\n');

    // Increase max listeners to handle parallel operations
    const originalMaxListeners = process.getMaxListeners();
    const requiredListeners = chapterFiles.length * 2; // Each query might create 2 listeners
    process.setMaxListeners(Math.max(originalMaxListeners, requiredListeners + 10));

    // Review all chapters in parallel
    const reviewPromises = chapterFiles.map(async (chapterFile) => {
      // Extract chapter number from filename
      const match = chapterFile.match(/chapter_(\d+)_/);
      if (!match) {
        // Skip files with invalid chapter format (UI shows progress)
        return null;
      }

      const chapterNum = Number.parseInt(match[1] ?? '0', 10);
      const chapterInfo = sortedChapters.find((ch) => ch.index === chapterNum);

      if (!chapterInfo) {
        // Skip chapters without metadata (UI shows progress)
        return null;
      }

      const abstraction = abstractions.find((a) => a.name.trim() === chapterInfo.name);

      if (!abstraction) {
        // Skip chapters with missing abstractions (UI shows progress)
        return null;
      }

      // Generate reviewed chapter path
      const reviewedChapterPath = resolve(this.options.outputDir, chapterFile);

      // Check if file exists and should skip
      const fileCheck = checkFileExists(reviewedChapterPath, this.options);

      if (fileCheck.shouldSkip) {
        // Notify about skipping if callback provided
        if (this.options.onProgress) {
          this.options.onProgress(createSkipMessage(chapterFile), 'skip');
        }
        return { index: chapterNum, filename: chapterFile, skipped: true };
      }

      // Notify about generating if callback provided
      if (this.options.onProgress) {
        this.options.onProgress(createGeneratingMessage(`Reviewing ${chapterFile}`), 'generate');
      }

      // Read the original chapter content
      const originalChapterPath = join(this.options.chaptersDir, chapterFile);
      const originalContent = await readFile(originalChapterPath, 'utf-8');

      // Review the chapter
      const reviewedContent = await this.reviewChapter(
        abstraction,
        chapterNum,
        originalContent,
        fullChapterListing,
        promptTemplate,
      );

      // Save reviewed chapter
      await writeFile(reviewedChapterPath, reviewedContent, 'utf-8');

      // Notify about completion if callback provided
      if (this.options.onProgress) {
        this.options.onProgress(`Completed review: ${chapterFile}`, 'complete');
      }

      return { index: chapterNum, filename: chapterFile };
    });

    try {
      // Wait for all reviews to complete
      const results = await Promise.all(reviewPromises);

      // Count successful reviews (for logging/debugging if needed)
      results.filter((r) => r !== null).length;

      // Review complete (UI shows final status)
    } finally {
      // Always reset max listeners to original value
      process.setMaxListeners(originalMaxListeners);
    }
  }

  private async getChapterFiles(): Promise<string[]> {
    const files = await readdir(this.options.chaptersDir);
    return files
      .filter((file) => file.startsWith('chapter_') && file.endsWith('.md'))
      .sort((a, b) => {
        const numA = Number.parseInt(a.match(/chapter_(\d+)_/)?.[1] || '0', 10);
        const numB = Number.parseInt(b.match(/chapter_(\d+)_/)?.[1] || '0', 10);
        return numA - numB;
      });
  }

  private async readAbstractions(): Promise<z.infer<typeof AbstractionsYamlSchema>> {
    const content = await readFile(this.options.abstractionsPath, 'utf-8');
    const data = yaml.parse(content);
    return AbstractionsYamlSchema.parse(data);
  }

  private async readChapterOrder(): Promise<z.infer<typeof ChapterOrderYamlSchema>> {
    const content = await readFile(this.options.chapterOrderPath, 'utf-8');
    const data = yaml.parse(content);
    return ChapterOrderYamlSchema.parse(data);
  }

  private async reviewChapter(
    abstraction: z.infer<typeof AbstractionSchema>,
    chapterNum: number,
    originalContent: string,
    fullChapterListing: string,
    promptTemplate: string,
  ): Promise<string> {
    // Use provided project root path or try to extract from abstractions path
    const projectRootPath =
      this.options.projectRootPath ||
      this.options.abstractionsPath.split('/').slice(0, -3).join('/') ||
      '.';
    const projectName = projectRootPath.split('/').pop() || 'project';

    // Interpolate variables into prompt template
    const prompt = promptTemplate
      .replace(/{project_name}/g, projectName)
      .replace(/{project_root_path}/g, projectRootPath)
      .replace(/{chapter_num}/g, chapterNum.toString())
      .replace(/{abstraction_name}/g, abstraction.name.trim())
      .replace(/{abstraction_description}/g, abstraction.description.trim())
      .replace(/{abstraction_file_paths}/g, abstraction.file_paths.join(', '))
      .replace(/{full_chapter_listing}/g, fullChapterListing)
      .replace(/{original_chapter_content}/g, originalContent)
      .replace(/{language}/g, 'English'); // Default to English

    // Use Claude SDK to review the chapter
    const messages: SDKMessage[] = [];
    let reviewedContent = '';
    const abortController = new AbortController();
    const modelConfig = getModelConfig();

    try {
      for await (const message of query({
        prompt: prompt,
        abortController,
        options: {
          allowedTools: ['Read', 'LS', 'Glob', 'Grep'],
          cwd: projectRootPath,
          model: modelConfig.model,
        },
      })) {
        messages.push(message);
        if (message.type === 'result' && message.subtype === 'success') {
          reviewedContent += message.result;
        }
      }
    } catch (error) {
      // Ensure abort controller is cleaned up on error
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
      throw error;
    }

    return reviewedContent;
  }
}

// Helper function for CLI usage
export async function reviewChaptersFromDirectory(
  chaptersDir: string,
  abstractionsPath: string,
  chapterOrderPath: string,
  outputDir: string,
  promptTemplatePath: string,
  projectRootPath?: string,
  options?: Partial<ChapterReviewerOptions>,
): Promise<void> {
  const reviewer = new ChapterReviewer({
    chaptersDir,
    abstractionsPath,
    chapterOrderPath,
    outputDir,
    promptTemplatePath,
    ...(projectRootPath !== undefined && { projectRootPath }),
    ...options,
  });

  await reviewer.reviewChapters();
}

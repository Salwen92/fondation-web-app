import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import * as yaml from 'yaml';
import { z } from 'zod';
import { getModelConfig } from './config';
import {
  checkFileExists,
  createGeneratingMessage,
  createSkipMessage,
  type FileGenerationOptions,
  generateChapterFileName,
} from './utils/file-generation';

// Zod schemas for strongly typed YAML data structures
const AbstractionSchema = z.object({
  name: z.string(),
  description: z.string(),
  file_paths: z.array(z.string()),
});

// The abstractions YAML is just an array of abstractions
const AbstractionsYamlSchema = z.array(AbstractionSchema);

const RelationshipSchema = z.object({
  from_abstraction: z.number(),
  to_abstraction: z.number(),
  label: z.string(),
  evidence: z.string(),
});

const RelationshipsYamlSchema = z.object({
  summary: z.string(),
  relationships: z.array(RelationshipSchema),
});

const ChapterOrderItemSchema = z.object({
  index: z.number(),
  name: z.string(),
  reasoning: z.string(),
});

const ChapterOrderYamlSchema = z.object({
  order: z.array(ChapterOrderItemSchema),
});

export interface ChapterGeneratorOptions extends FileGenerationOptions {
  abstractionsPath: string;
  relationshipsPath: string;
  chapterOrderPath: string;
  outputDir: string;
  promptTemplatePath: string;
  projectRootPath?: string;
  onProgress?: (message: string, type: 'skip' | 'generate' | 'complete') => void;
}

export class ChapterGenerator {
  constructor(private options: ChapterGeneratorOptions) {}

  async generateChapters(): Promise<void> {
    // Ensure output directory exists
    await mkdir(this.options.outputDir, { recursive: true });

    // Read and parse YAML files
    const abstractions = await this.readAbstractions();
    await this.readRelationships();
    const chapterOrder = await this.readChapterOrder();

    // Read the prompt template
    const promptTemplate = await readFile(this.options.promptTemplatePath, 'utf-8');

    // Generate chapters in parallel
    const chapters: string[] = [];

    // Sort chapters by index to ensure correct ordering
    const sortedChapters = chapterOrder.order.sort((a, b) => a.index - b.index);

    const originalMaxListeners = process.getMaxListeners();
    try {
      // Increase max listeners to handle parallel operations
      const requiredListeners = sortedChapters.length * 2; // Each query might create 2 listeners
      process.setMaxListeners(Math.max(originalMaxListeners, requiredListeners + 10));

      // Generate all chapters in parallel
      const chapterPromises = sortedChapters.map(async (chapter) => {
        const abstraction = abstractions.find((a) => a.name.trim() === chapter.name);

        if (!abstraction) {
          // Skip chapters with missing abstractions (UI will show progress)
          return null;
        }

        // Generate chapter filename
        const chapterFileName = generateChapterFileName(chapter.index, abstraction.name);
        const chapterPath = resolve(this.options.outputDir, chapterFileName);

        // Check if file exists and should skip
        const fileCheck = checkFileExists(chapterPath, this.options);

        if (fileCheck.shouldSkip) {
          // Notify about skipping if callback provided
          if (this.options.onProgress) {
            this.options.onProgress(createSkipMessage(chapterFileName), 'skip');
          }
          return null;
        }

        // Notify about generating if callback provided
        if (this.options.onProgress) {
          this.options.onProgress(createGeneratingMessage(chapterFileName), 'generate');
        }

        const chapterContent = await this.generateChapter(
          abstraction,
          chapter.index,
          abstractions,
          chapterOrder,
          [], // Empty array since we're generating in parallel
          promptTemplate,
        );

        // Save individual chapter
        await writeFile(chapterPath, chapterContent, 'utf-8');

        // Notify about completion if callback provided
        if (this.options.onProgress) {
          this.options.onProgress(`Completed: ${chapterFileName}`, 'complete');
        }

        return { index: chapter.index, content: chapterContent };
      });

      // Wait for all chapters to complete
      const chapterResults = await Promise.all(chapterPromises);

      // Filter out null results and sort by index to maintain order
      const validChapters = chapterResults
        .filter((result): result is { index: number; content: string } => result !== null)
        .sort((a, b) => a.index - b.index);

      // Extract just the content for the chapters array
      chapters.push(...validChapters.map((result) => result.content));

      // Generation complete (UI shows final status)
    } finally {
      // Always reset max listeners to original value
      process.setMaxListeners(originalMaxListeners);
    }
  }

  private async readAbstractions(): Promise<z.infer<typeof AbstractionsYamlSchema>> {
    const content = await readFile(this.options.abstractionsPath, 'utf-8');
    const data = yaml.parse(content);
    return AbstractionsYamlSchema.parse(data);
  }

  private async readRelationships(): Promise<z.infer<typeof RelationshipsYamlSchema>> {
    const content = await readFile(this.options.relationshipsPath, 'utf-8');
    const data = yaml.parse(content);
    return RelationshipsYamlSchema.parse(data);
  }

  private async readChapterOrder(): Promise<z.infer<typeof ChapterOrderYamlSchema>> {
    const content = await readFile(this.options.chapterOrderPath, 'utf-8');
    const data = yaml.parse(content);
    return ChapterOrderYamlSchema.parse(data);
  }

  private async generateChapter(
    abstraction: z.infer<typeof AbstractionSchema>,
    chapterNum: number,
    _abstractionsData: z.infer<typeof AbstractionsYamlSchema>,
    chapterOrder: z.infer<typeof ChapterOrderYamlSchema>,
    previousChapters: string[],
    promptTemplate: string,
  ): Promise<string> {
    // Prepare variables for prompt interpolation
    const conceptDetailsNote = ''; // concepts field no longer exists in schema
    const structureNote = ' for context';
    const prevSummaryNote = previousChapters.length > 0 ? ' to build on' : '';

    // Create full chapter listing
    const fullChapterListing = chapterOrder.order
      .map((ch) => `- Chapter ${ch.index}: ${ch.name}`)
      .join('\n');

    // Create previous chapters summary
    const previousChaptersSummary =
      previousChapters.length > 0
        ? `Previous chapters covered: ${chapterOrder.order
            .slice(0, chapterNum)
            .map((ch) => ch.name)
            .join(', ')}`
        : '';

    // Use provided project root path or try to extract from abstractions path
    const projectRootPath =
      this.options.projectRootPath ||
      this.options.abstractionsPath.split('/').slice(0, -3).join('/') ||
      '.';
    const projectName = projectRootPath.split('/').pop() || 'project';

    // Interpolate variables into prompt template
    const prompt = promptTemplate
      .replace(/{project_name}/g, projectName)
      .replace(/{abstraction_name}/g, abstraction.name.trim())
      .replace(/{chapter_num}/g, chapterNum.toString())
      .replace(/{project_root_path}/g, projectRootPath)
      .replace(/{concept_details_note}/g, conceptDetailsNote)
      .replace(/{abstraction_description}/g, abstraction.description.trim())
      .replace(/{abstraction_file_paths}/g, abstraction.file_paths.join(', '))
      .replace(/{structure_note}/g, structureNote)
      .replace(/{full_chapter_listing}/g, fullChapterListing)
      .replace(/{prev_summary_note}/g, prevSummaryNote)
      .replace(/{previous_chapters_summary}/g, previousChaptersSummary)
      .replace(/{language}/g, 'English'); // Default to TypeScript based on the project

    // Use Claude SDK to generate the chapter
    const messages: SDKMessage[] = [];
    let chapterContent = '';
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
          chapterContent += message.result;
        }
      }
    } catch (error) {
      // Ensure abort controller is cleaned up on error
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
      throw error;
    }

    return chapterContent;
  }
}

// CLI usage
export async function generateChaptersFromYaml(
  abstractionsPath: string,
  relationshipsPath: string,
  chapterOrderPath: string,
  outputDir: string,
  promptTemplatePath: string,
  projectRootPath?: string,
  options?: Partial<ChapterGeneratorOptions>,
): Promise<void> {
  const generator = new ChapterGenerator({
    abstractionsPath,
    relationshipsPath,
    chapterOrderPath,
    outputDir,
    promptTemplatePath,
    ...(projectRootPath !== undefined && { projectRootPath }),
    ...options,
  });

  await generator.generateChapters();
}

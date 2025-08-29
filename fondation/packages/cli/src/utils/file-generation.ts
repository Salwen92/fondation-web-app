import { existsSync } from 'node:fs';

export interface FileGenerationOptions {
  force?: boolean;
  overwrite?: boolean;
}

export interface FileExistenceCheck {
  exists: boolean;
  path: string;
  shouldSkip: boolean;
}

export function checkFileExists(
  filePath: string,
  options: FileGenerationOptions = {},
): FileExistenceCheck {
  const exists = existsSync(filePath);
  const shouldSkip = exists && !options.overwrite && !options.force;

  return {
    exists,
    path: filePath,
    shouldSkip,
  };
}

export function normalizeFileName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_');
}

export function generateChapterFileName(chapterIndex: number, chapterName: string): string {
  const normalized = normalizeFileName(chapterName);
  return `chapter_${chapterIndex}_${normalized}.md`;
}

export function generateReviewedChapterFileName(chapterIndex: number, chapterName: string): string {
  const normalized = normalizeFileName(chapterName);
  return `reviewed_chapter_${chapterIndex}_${normalized}.md`;
}

export function generateTutorialFileName(chapterIndex: number, chapterName: string): string {
  const normalized = normalizeFileName(chapterName);
  return `tutorial_${chapterIndex}_${normalized}.md`;
}

export function createSkipMessage(fileName: string): string {
  return `Skipping existing file: ${fileName}`;
}

export function createGeneratingMessage(fileName: string): string {
  return `Generating: ${fileName}`;
}

export interface GenerationMetadata {
  generatedAt: string;
  modelUsed?: string;
  promptVersion?: string;
  sourceHash?: string;
}

export function createMetadata(modelUsed?: string, promptVersion?: string): GenerationMetadata {
  return {
    generatedAt: new Date().toISOString(),
    ...(modelUsed !== undefined && { modelUsed }),
    ...(promptVersion !== undefined && { promptVersion }),
  };
}

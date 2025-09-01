/**
 * CLI Output Parser
 * 
 * Shared logic for parsing CLI output files across different execution strategies
 */

import { join } from "node:path";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import * as yaml from "js-yaml";
import type { CLIResult } from "./base-strategy.js";

export class OutputParser {
  /**
   * Parse generated files from .claude-tutorial-output directory
   */
  static async parseOutputFiles(repoPath: string): Promise<CLIResult['documents']> {
    const documents: NonNullable<CLIResult['documents']> = [];
    const outputDir = join(repoPath, ".claude-tutorial-output");
    
    if (!existsSync(outputDir)) {
      console.log('📁 No output directory found:', outputDir);
      return documents;
    }

    try {
      console.log('📁 Parsing output files from:', outputDir);
      
      // 1. Parse YAML files
      const yamlFiles = [
        { path: "step1_abstractions.yaml", kind: "yaml" as const, title: "Abstractions" },
        { path: "step2_relationships.yaml", kind: "yaml" as const, title: "Relationships" },
        { path: "step3_order.yaml", kind: "yaml" as const, title: "Chapter Order" }
      ];

      for (const yamlFile of yamlFiles) {
        const filePath = join(outputDir, yamlFile.path);
        if (existsSync(filePath)) {
          try {
            const content = readFileSync(filePath, "utf-8");
            const parsed = yaml.load(content);
            documents.push({
              slug: yamlFile.path,
              title: yamlFile.title,
              content: JSON.stringify(parsed, null, 2),
              kind: yamlFile.kind,
              chapterIndex: -1 // YAML files don't have chapter index
            });
            console.log('✅ Parsed YAML file:', yamlFile.path);
          } catch (err) {
            console.warn(`Failed to parse YAML file ${yamlFile.path}:`, err instanceof Error ? err.message : err);
            // Continue processing other files
          }
        }
      }

      // 2. Parse chapters directory
      const chaptersDir = join(outputDir, "chapters");
      if (existsSync(chaptersDir)) {
        const chapterFiles = readdirSync(chaptersDir)
          .filter(f => f.endsWith(".md"))
          .sort();
        
        console.log(`📚 Found ${chapterFiles.length} chapter files`);
        
        for (let i = 0; i < chapterFiles.length; i++) {
          const fileName = chapterFiles[i];
          const filePath = join(chaptersDir, fileName);
          const content = readFileSync(filePath, "utf-8");
          
          // Extract title from first H1 heading or filename
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : fileName.replace(/\.md$/, "").replace(/_/g, " ");
          
          documents.push({
            slug: `chapters/${fileName}`,
            title,
            content,
            kind: "chapter",
            chapterIndex: i
          });
        }
        console.log('✅ Parsed chapter files:', chapterFiles.length);
      }

      // 3. Parse reviewed chapters directory
      const reviewedDir = join(outputDir, "reviewed-chapters");
      if (existsSync(reviewedDir)) {
        const reviewedFiles = readdirSync(reviewedDir)
          .filter(f => f.endsWith(".md"))
          .sort();
        
        console.log(`📖 Found ${reviewedFiles.length} reviewed chapter files`);
        
        for (let i = 0; i < reviewedFiles.length; i++) {
          const fileName = reviewedFiles[i];
          const filePath = join(reviewedDir, fileName);
          const content = readFileSync(filePath, "utf-8");
          
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : fileName.replace(/\.md$/, "").replace(/_/g, " ");
          
          documents.push({
            slug: `reviewed-chapters/${fileName}`,
            title: `Reviewed: ${title}`,
            content,
            kind: "chapter",
            chapterIndex: i
          });
        }
        console.log('✅ Parsed reviewed chapter files:', reviewedFiles.length);
      }

      // 4. Parse tutorials directory
      const tutorialsDir = join(outputDir, "tutorials");
      if (existsSync(tutorialsDir)) {
        const tutorialFiles = readdirSync(tutorialsDir)
          .filter(f => f.endsWith(".md"))
          .sort();
        
        console.log(`🎓 Found ${tutorialFiles.length} tutorial files`);
        
        for (let i = 0; i < tutorialFiles.length; i++) {
          const fileName = tutorialFiles[i];
          const filePath = join(tutorialsDir, fileName);
          const content = readFileSync(filePath, "utf-8");
          
          const titleMatch = content.match(/^#\s+(.+)$/m);
          const title = titleMatch ? titleMatch[1] : fileName.replace(/\.md$/, "").replace(/_/g, " ");
          
          documents.push({
            slug: `tutorials/${fileName}`,
            title: `Tutorial: ${title}`,
            content,
            kind: "tutorial",
            chapterIndex: i
          });
        }
        console.log('✅ Parsed tutorial files:', tutorialFiles.length);
      }
      
      console.log(`📊 Total documents parsed: ${documents.length}`);
      return documents;

    } catch (error) {
      console.error('Error parsing output files:', error instanceof Error ? error.message : error);
      return documents; // Return partial results
    }
  }
}
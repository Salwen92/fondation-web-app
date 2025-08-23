"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  GitBranch, 
  Book, 
  Star, 
  GitFork, 
  Code2, 
  Sparkles,
  ExternalLink,
  FileText
} from "lucide-react";
import { type Id } from "../../../convex/_generated/dataModel";
import { motion } from "framer-motion";

interface RepoCardProps {
  repo: {
    _id: Id<"repositories">;
    name: string;
    fullName: string;
    description?: string;
    defaultBranch: string;
  };
  onGenerate: (repoId: Id<"repositories">) => void;
  isGenerating?: boolean;
}

export function RepoCard({ repo, onGenerate, isGenerating }: RepoCardProps) {
  const languages = ["TypeScript", "React", "Node.js"]; // Mock data - should come from GitHub API
  const stats = {
    stars: Math.floor(Math.random() * 1000),
    forks: Math.floor(Math.random() * 100),
    docs: Math.floor(Math.random() * 10)
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="glass glass-hover h-full backdrop-blur-xl transition-all duration-300 overflow-hidden group">
        {/* Gradient border effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative p-6 h-full flex flex-col">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                  <Book className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{repo.name}</h3>
                  <p className="text-xs text-muted-foreground">{repo.fullName}</p>
                </div>
              </div>
              <a 
                href={`https://github.com/${repo.fullName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            </div>
          </div>

          {/* Description */}
          {repo.description && (
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2 flex-grow">
              {repo.description}
            </p>
          )}

          {/* Languages */}
          <div className="flex flex-wrap gap-1 mb-4">
            {languages.map((lang) => (
              <span 
                key={lang}
                className="px-2 py-1 text-xs rounded-full bg-muted/50 text-muted-foreground"
              >
                {lang}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Star className="h-3.5 w-3.5" />
                <span>{stats.stars}</span>
              </div>
              <div className="flex items-center space-x-1">
                <GitFork className="h-3.5 w-3.5" />
                <span>{stats.forks}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FileText className="h-3.5 w-3.5" />
                <span>{stats.docs}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <GitBranch className="h-3.5 w-3.5" />
              <span>{repo.defaultBranch}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => onGenerate(repo._id)}
              disabled={isGenerating}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              size="sm"
            >
              {isGenerating ? (
                <>
                  <div className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Docs
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="glass"
            >
              <Code2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

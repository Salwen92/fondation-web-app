"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitBranch, Book } from "lucide-react";
import { type Id } from "../../../convex/_generated/dataModel";

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
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5" />
          {repo.name}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {repo.fullName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {repo.description && (
          <p className="text-sm text-muted-foreground mb-4">{repo.description}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <GitBranch className="h-4 w-4" />
            <span>{repo.defaultBranch}</span>
          </div>
          <Button 
            onClick={() => onGenerate(repo._id)}
            disabled={isGenerating}
            size="sm"
          >
            Generate Docs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
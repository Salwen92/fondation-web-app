import { Book, ExternalLink } from "lucide-react";
import type { Id } from "@convex/generated/dataModel";

interface RepoCardHeaderProps {
  repo: {
    _id: Id<"repositories">;
    name: string;
    fullName: string;
    description?: string;
  };
}

export function RepoCardHeader({ repo }: RepoCardHeaderProps) {
  return (
    <>
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
      
      {repo.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {repo.description}
        </p>
      )}
    </>
  );
}
import { FileText, GitBranch } from "lucide-react";
import { translateStatus } from "@/lib/i18n";

interface RepoCardStatsProps {
  docsCount: number;
  languages: string[];
  stats?: {
    stars: number;
    forks: number;
    issues: number;
  };
  jobStatus?: {
    status: string;
    emoji: string;
  };
  defaultBranch: string;
}

export function RepoCardStats({ 
  docsCount, 
  languages, 
  stats, 
  jobStatus, 
  defaultBranch 
}: RepoCardStatsProps) {
  return (
    <>
      {/* Languages */}
      {languages.length > 0 && (
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
      )}

      {/* Stats */}
      <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
        <div className="flex items-center space-x-3">
          {docsCount > 0 && (
            <div className="flex items-center space-x-1">
              <FileText className="h-3.5 w-3.5" />
              <span>{docsCount} docs</span>
            </div>
          )}
          {stats && (
            <>
              <div className="flex items-center space-x-1">
                <span>⭐ {stats.stars}</span>
              </div>
              <div className="flex items-center space-x-1">
                <span>🍴 {stats.forks}</span>
              </div>
            </>
          )}
          {jobStatus && (
            <div className="flex items-center space-x-1">
              <span className="text-xs">{jobStatus.emoji}</span>
              <span className="capitalize">{translateStatus(jobStatus.status)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <GitBranch className="h-3.5 w-3.5" />
          <span>{defaultBranch}</span>
        </div>
      </div>
    </>
  );
}
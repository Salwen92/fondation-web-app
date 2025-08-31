'use client';

import { useQuery } from 'convex/react';
import { api } from '@convex/generated/api';
import { type Id } from '@convex/generated/dataModel';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Book, 
  FileText,
  Calendar,
  ExternalLink,
  Loader2,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function DocsPage() {
  const { data: session } = useSession();
  
  // Get all completed jobs for the user
  const jobs = useQuery(api.jobs.listUserJobs, 
    session?.user?.id ? { userId: session.user.id as Id<"users"> } : 'skip'
  );
  
  // Get repository details for each job - moved to top level to fix hook rules
  const repositories = useQuery(api.repositories.listUserRepositories,
    session?.user?.id ? { userId: session.user.id as Id<"users"> } : 'skip'
  );
  
  const completedJobs = jobs?.filter(job => job.status === 'completed') ?? [];
  
  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }
  
  if (completedJobs.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
            Documentation
          </h1>
          <p className="text-muted-foreground">
            Tous vos cours générés à partir de vos dépôts GitHub
          </p>
        </div>
        
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card className="glass p-12 text-center max-w-md">
            <FolderOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Aucun cours disponible</h2>
            <p className="text-muted-foreground mb-6">
              Commencez par générer un cours depuis vos dépôts GitHub.
            </p>
            <Link href="/dashboard/repositories">
              <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white">
                <Sparkles className="mr-2 h-4 w-4" />
                Voir les dépôts
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }
  
  const repoMap = new Map(repositories?.map(r => [r._id, r]) ?? []);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
          Documentation
        </h1>
        <p className="text-muted-foreground">
          {completedJobs.length} cours générés à partir de vos dépôts
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {completedJobs.map((job, index) => {
          const repo = repoMap.get(job.repositoryId);
          if (!repo) return null;
          
          return (
            <motion.div
              key={job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="glass glass-hover h-full overflow-hidden group">
                <div className="p-6 flex flex-col h-full">
                  {/* Header */}
                  <div className="mb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                          <Book className="h-5 w-5 text-green-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{repo.name}</h3>
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
                    
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      <FileText className="mr-1 h-3 w-3" />
                      {job.docsCount ?? 0} documents
                    </Badge>
                  </div>
                  
                  {/* Description */}
                  {repo.description && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {repo.description}
                    </p>
                  )}
                  
                  {/* Spacer */}
                  <div className="flex-grow" />
                  
                  {/* Footer */}
                  <div className="space-y-3">
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      Généré le {new Date(job.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                    
                    <div className="flex gap-2">
                      <Link 
                        href={`/course/${repo.fullName.split('/')[0]}/${repo.fullName.split('/')[1]}/latest`}
                        className="flex-1"
                      >
                        <Button 
                          size="sm"
                          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                        >
                          <Book className="mr-2 h-4 w-4" />
                          Voir le cours
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
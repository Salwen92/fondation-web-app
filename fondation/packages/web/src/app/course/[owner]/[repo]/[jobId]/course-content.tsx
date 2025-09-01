'use client';

import { useQuery, } from 'convex/react';
import { api } from '@convex/generated/api';
import type { Id } from '@convex/generated/dataModel';
import { notFound, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import dynamic from 'next/dynamic';
import { logger } from '@/lib/logger';
import { RegenerateModal } from '@/components/repos/regenerate-modal';
import { useRegenerate } from '@/hooks/use-regenerate';

const MermaidRenderer = dynamic(
  () => import('@/components/markdown/mermaid-renderer').then(mod => mod.MermaidRenderer),
  { ssr: false }
);

interface CourseContentProps {
  owner: string;
  repo: string;
  jobId: string;
}

export default function CourseContent({ owner, repo, jobId }: CourseContentProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Fetch job details
  const job = useQuery(api.jobs.getById, { 
    id: jobId as Id<'jobs'> 
  });

  // Fetch repository info
  const fullName = `${owner}/${repo}`;
  const repositories = useQuery(
    api.repositories.getByFullName,
    { fullName }
  );
  const repository = repositories?.[0];

  // Use custom hook for regeneration logic
  const {
    isModalOpen,
    handleRegenerateClick,
    handleComplete,
    handleClose,
    canRegenerate
  } = useRegenerate(repository, {
    onComplete: (newJobId) => {
      router.push(`/course/${owner}/${repo}/${newJobId}`);
    }
  });

  // Fetch docs for this job
  const docs = useQuery(api.docs.listByJobId, { 
    jobId: jobId as Id<'jobs'> 
  });

  // Fetch specific doc content if a slug is selected
  const selectedDoc = useQuery(
    api.docs.getBySlug,
    selectedSlug ? { 
      jobId: jobId as Id<'jobs'>,
      slug: selectedSlug 
    } : 'skip'
  );

  // Content fetch guard - handle empty content scenarios
  useEffect(() => {
    if (selectedDoc && selectedSlug) {
      if (!selectedDoc.content || selectedDoc.content.length === 0) {
        logger.warn('[Empty Content] Document has no content', {
          id: selectedDoc._id,
          slug: selectedDoc.slug,
          title: selectedDoc.title
        });
        
        // Try to find a canonical counterpart with content
        if (docs && docs.length > 0) {
          const normalizedTitle = selectedDoc.title.toLowerCase().trim();
          const canonical = docs.find(doc => 
            doc.title.toLowerCase().trim() === normalizedTitle &&
            doc.content && doc.content.length > 0 &&
            doc._id !== selectedDoc._id
          );
          
          if (canonical) {
            logger.info('[Fallback] Switching to canonical document with content', {
              from: selectedDoc._id,
              to: canonical._id,
              slug: canonical.slug
            });
            setSelectedSlug(canonical.slug);
          }
        }
      }
    }
  }, [selectedDoc, selectedSlug, docs]);

  // Regeneration logic now handled by useRegenerate hook

  // Get status icon and color
  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', label: 'Terminé' };
      case 'running':
        return { icon: Clock, color: 'text-blue-500', label: 'Génération...' };
      case 'claimed':
        return { icon: Clock, color: 'text-blue-500', label: 'Réclamé par le worker...' };
      case 'cloning':
        return { icon: Clock, color: 'text-blue-500', label: 'Clonage du dépôt...' };
      case 'analyzing':
        return { icon: Clock, color: 'text-blue-500', label: 'Analyse en cours...' };
      case 'gathering':
        return { icon: Clock, color: 'text-blue-500', label: 'Collecte des données...' };
      case 'failed':
      case 'dead':
        return { icon: XCircle, color: 'text-red-500', label: 'Échoué' };
      case 'canceled':
        return { icon: XCircle, color: 'text-gray-500', label: 'Annulé' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500', label: 'En attente' };
      default:
        return { icon: AlertCircle, color: 'text-gray-500', label: 'Inconnu' };
    }
  };

  if (docs === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Chargement du cours...</div>
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    // If job is still running, show generating state
    const activeStatuses = ['pending', 'claimed', 'cloning', 'analyzing', 'gathering', 'running'];
    if (job?.status && activeStatuses.includes(job.status)) {
      const statusDisplay = getStatusDisplay(job?.status);
      const StatusIcon = statusDisplay.icon;
      
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass backdrop-blur-xl rounded-xl shadow-lg p-8 max-w-md w-full border border-border/40">
            <div className="flex flex-col items-center text-center">
              <StatusIcon className={`w-12 h-12 ${statusDisplay.color} mb-4`} />
              <h2 className="text-2xl font-bold text-foreground mb-2">Génération du cours en cours</h2>
              <p className="text-muted-foreground mb-4">
                Votre cours pour {owner}/{repo} est en cours de génération. Ce processus prend généralement 30 à 60 minutes.
              </p>
              
              {job?.currentStep && (
                <div className="w-full mb-6">
                  <div className="text-sm text-muted-foreground mb-2">
                    Étape {job.currentStep} sur {job.totalSteps ?? 6}: {job.progress ?? 'En cours'}
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full">
                    <div 
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${(job.currentStep / (job.totalSteps ?? 6)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
                >
                  Retour au tableau de bord
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Actualiser le statut
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    
    // If job failed or completed but no docs, show error
    return notFound();
  }

  // De-duplication logic for docs with same title
  const deduplicateDocs = (docList: typeof docs) => {
    const seen = new Map<string, typeof docs[0]>();
    const duplicates: Array<{id: string, slug: string, title: string}> = [];
    
    for (const doc of docList) {
      const normalizedTitle = doc.title.toLowerCase().trim();
      const existing = seen.get(normalizedTitle);
      
      if (existing) {
        // Duplicate found - apply canonical selection rules
        const existingHasContent = existing.content && existing.content.length > 0;
        const docHasContent = doc.content && doc.content.length > 0;
        
        let keepExisting = true;
        
        // Rule 1: Prefer non-empty content
        if (!existingHasContent && docHasContent) {
          keepExisting = false;
        } else if (existingHasContent && !docHasContent) {
          keepExisting = true;
        } else {
          // Rule 2: Prefer reviewed-* prefix
          const existingIsReviewed = existing.slug.includes('reviewed-');
          const docIsReviewed = doc.slug.includes('reviewed-');
          
          if (!existingIsReviewed && docIsReviewed) {
            keepExisting = false;
          } else if (existingIsReviewed && !docIsReviewed) {
            keepExisting = true;
          } else {
            // Rule 3: Prefer most recent
            keepExisting = (existing.createdAt || 0) >= (doc.createdAt || 0);
          }
        }
        
        if (!keepExisting) {
          // Log the duplicate being suppressed
          duplicates.push({
            id: existing._id,
            slug: existing.slug,
            title: existing.title
          });
          seen.set(normalizedTitle, doc);
        } else {
          duplicates.push({
            id: doc._id,
            slug: doc.slug,
            title: doc.title
          });
        }
        
        logger.info('[De-duplication] Duplicate detected', {
          kept: keepExisting ? existing._id : doc._id,
          suppressed: keepExisting ? doc._id : existing._id,
          title: doc.title,
          slugs: [existing.slug, doc.slug]
        });
      } else {
        seen.set(normalizedTitle, doc);
      }
    }
    
    if (duplicates.length > 0) {
      logger.warn('[Data Issue] Duplicates found and suppressed', { duplicates });
    }
    
    return Array.from(seen.values());
  };

  // Organize docs by type with de-duplication
  const chapters = deduplicateDocs(docs.filter(doc => doc.kind === 'chapter'))
    .sort((a, b) => a.chapterIndex - b.chapterIndex);
  const tutorials = deduplicateDocs(docs.filter(doc => doc.kind === 'tutorial'));
  const yamls = deduplicateDocs(docs.filter(doc => doc.kind === 'yaml'));
  const tocs = deduplicateDocs(docs.filter(doc => doc.kind === 'toc'));
  
  // Track if there were duplicates for UI indication
  const hasDuplicates = docs.length > (chapters.length + tutorials.length + yamls.length + tocs.length);

  const statusDisplay = getStatusDisplay(job?.status);
  const StatusIcon = statusDisplay.icon;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 glass backdrop-blur-xl rounded-xl shadow-lg border border-border/40 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Cours: {owner}/{repo}
              </h1>
              <div className="flex items-center gap-4 mb-2">
                <p className="text-muted-foreground">
                  {chapters.length} chapitres • {tutorials.length} tutoriels
                </p>
                {job && (
                  <div className={`flex items-center gap-2 ${statusDisplay.color}`}>
                    <StatusIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">{statusDisplay.label}</span>
                  </div>
                )}
                {hasDuplicates && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs">
                    <AlertCircle className="w-3 h-3" />
                    <span>Problème de données détecté</span>
                  </div>
                )}
              </div>
              {job?.status === 'running' && job.currentStep && (
                <div className="mt-2">
                  <div className="text-sm text-muted-foreground">
                    Étape {job.currentStep} sur {job.totalSteps ?? 6}: {job.progress ?? 'En cours'}
                  </div>
                  <div className="w-64 h-2 bg-muted rounded-full mt-1">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${(job.currentStep / (job.totalSteps ?? 6)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRegenerateClick}
                disabled={job?.status === 'running' || !canRegenerate}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:opacity-90 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Régénérer le cours
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-muted/50 backdrop-blur-sm text-foreground rounded-lg hover:bg-muted/70 transition-all duration-300 border border-border/40"
              >
                Retour au tableau de bord
              </button>
            </div>
          </div>
          
          {job?.status === 'failed' && job.error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">Échec de la génération</p>
                  <p className="text-sm text-destructive/80 mt-1">{job.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <div className="w-80 flex-shrink-0">
            <div className="glass glass-hover backdrop-blur-xl rounded-xl shadow-lg border border-border/40 p-6 sticky top-8 transition-all duration-300 hover:scale-[1.01]">
              <h2 className="text-lg font-semibold text-foreground mb-4">Contenu du cours</h2>
              
              {/* Chapters */}
              {chapters.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Chapitres</h3>
                  <div className="space-y-2">
                    {chapters.map((doc) => (
                      <button
                        key={doc._id}
                        onClick={() => setSelectedSlug(doc.slug)}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 ${
                          selectedSlug === doc.slug
                            ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-foreground border-l-2 border-purple-500 pl-5'
                            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:translate-x-1'
                        }`}
                      >
                        <div className="font-medium">{doc.chapterIndex}. {doc.title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tutorials */}
              {tutorials.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Tutoriels</h3>
                  <div className="space-y-2">
                    {tutorials.map((doc) => (
                      <button
                        key={doc._id}
                        onClick={() => setSelectedSlug(doc.slug)}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 ${
                          selectedSlug === doc.slug
                            ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-foreground border-l-2 border-blue-500 pl-5'
                            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:translate-x-1'
                        }`}
                      >
                        <div className="font-medium">🎯 {doc.title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Configuration Files */}
              {(yamls.length > 0 || tocs.length > 0) && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Références</h3>
                  <div className="space-y-2">
                    {[...yamls, ...tocs].map((doc) => (
                      <button
                        key={doc._id}
                        onClick={() => setSelectedSlug(doc.slug)}
                        className={`w-full text-left p-3 rounded-lg text-sm transition-all duration-200 ${
                          selectedSlug === doc.slug
                            ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-foreground border-l-2 border-green-500 pl-5'
                            : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:translate-x-1'
                        }`}
                      >
                        <div className="font-medium">📄 {doc.title}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {selectedDoc === undefined && selectedSlug ? (
              <div className="glass backdrop-blur-xl rounded-xl shadow-lg border border-border/40 p-8">
                <div className="text-center text-muted-foreground">Chargement du contenu...</div>
              </div>
            ) : selectedDoc && selectedSlug ? (
              <div className="glass backdrop-blur-xl rounded-xl shadow-lg border border-border/40 overflow-hidden">
                <div className="p-6 border-b border-border/40 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl">
                  <h1 className="text-3xl font-bold text-foreground mb-3">{selectedDoc.title}</h1>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-sm ${
                      selectedDoc.kind === 'chapter' ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 border border-purple-500/30' :
                      selectedDoc.kind === 'tutorial' ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {selectedDoc.kind === 'chapter' ? '📚 Chapitre' :
                       selectedDoc.kind === 'tutorial' ? '🎯 Tutoriel' :
                       selectedDoc.kind === 'yaml' ? '⚙️ Configuration' : '📄 Document'}
                    </span>
                    {selectedDoc.kind === 'chapter' && (
                      <span className="font-medium">#{selectedDoc.chapterIndex}</span>
                    )}
                  </div>
                </div>
                <div className="p-8 bg-background/50">
                  <article className="prose prose-gray dark:prose-invert max-w-none
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h1:mb-8 prose-h1:mt-8 prose-h1:border-b prose-h1:pb-4
                    prose-h2:text-2xl prose-h2:mb-6 prose-h2:mt-8
                    prose-h3:text-xl prose-h3:mb-4 prose-h3:mt-6
                    prose-p:leading-relaxed prose-p:mb-4
                    prose-pre:bg-gray-900 dark:prose-pre:bg-gray-950 prose-pre:text-gray-100 prose-pre:p-0 prose-pre:rounded-lg prose-pre:overflow-x-auto prose-pre:border prose-pre:border-border/20
                    prose-code:bg-purple-100 dark:prose-code:bg-purple-500/10 prose-code:text-purple-600 dark:prose-code:text-purple-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-['']
                    prose-ul:my-4 prose-ul:space-y-2
                    prose-li:leading-relaxed
                    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-purple-500/50 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:rounded-r-lg
                    prose-img:rounded-lg prose-img:shadow-md
                    prose-table:w-full prose-table:border-collapse
                    prose-th:border prose-th:border-border/50 prose-th:p-2 prose-th:bg-muted/50
                    prose-td:border prose-td:border-border/50 prose-td:p-2
                    [&_pre]:!bg-gray-900 dark:[&_pre]:!bg-gray-950 [&_pre]:!text-gray-100
                    [&_[data-line]]:px-4 [&_[data-line]]:py-0.5
                    [&_[data-highlighted-line]]:bg-gray-800/50 [&_[data-highlighted-line]]:border-l-2 [&_[data-highlighted-line]]:border-purple-500
                    [&_[data-line-numbers]_[data-line]]:before:content-[attr(data-line-number)] [&_[data-line-numbers]_[data-line]]:before:text-gray-500 [&_[data-line-numbers]_[data-line]]:before:mr-4
                    [&_[data-highlighted-chars]]:bg-yellow-500/20 [&_[data-highlighted-chars]]:rounded [&_[data-highlighted-chars]]:px-1">
                    {selectedDoc.content && selectedDoc.content.length > 0 ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[
                          rehypeSlug,
                          [rehypeAutolinkHeadings, { behavior: 'wrap' }],
                          rehypeHighlight
                        ]}
                        components={{
                          // Handle code blocks with mermaid
                          code: (props) => {
                            const { children, className, ...rest } = props as { children?: React.ReactNode; className?: string; node?: unknown };
                            const inline = !(rest as { node?: { position?: { start?: { line?: number } } } }).node?.position;
                            
                            const match = /language-(\w+)/.exec(className ?? '');
                            const codeString = typeof children === 'string' 
                              ? children.replace(/\n$/, '') 
                              : Array.isArray(children) 
                              ? children.join('').replace(/\n$/, '')
                              : '';
                            
                            // Check if it's a mermaid diagram
                            if (!inline && match && match[1] === 'mermaid') {
                              return <MermaidRenderer chart={codeString} />;
                            }
                            
                            // Check if it looks like a graph/flowchart
                            if (!inline && (codeString.includes('graph TD') || codeString.includes('graph LR'))) {
                              return <MermaidRenderer chart={codeString} />;
                            }
                            
                            // Regular code block
                            return (
                              <code className={className} {...rest}>
                                {children}
                              </code>
                            );
                          },
                          // Better heading rendering
                          h1: ({ children }) => (
                            <h1 className="text-4xl font-bold text-foreground mb-6 mt-8 pb-4 border-b border-border/30">
                              {children}
                            </h1>
                          ),
                          h2: ({ children }) => (
                            <h2 className="text-3xl font-semibold text-foreground mb-4 mt-6">
                              {children}
                            </h2>
                          ),
                          h3: ({ children }) => (
                            <h3 className="text-2xl font-semibold text-foreground mb-3 mt-4">
                              {children}
                            </h3>
                          ),
                          // Better list rendering
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside space-y-2 my-4 text-muted-foreground">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal list-inside space-y-2 my-4 text-muted-foreground">
                              {children}
                            </ol>
                          ),
                          li: ({ children }) => (
                            <li className="ml-4">
                              {children}
                            </li>
                          ),
                          // Better paragraph spacing
                          p: ({ children }) => (
                            <p className="mb-4 leading-relaxed text-foreground/90">
                              {children}
                            </p>
                          ),
                          // Better blockquote styling
                          blockquote: ({ children }) => (
                            <blockquote className="border-l-4 border-purple-500/50 pl-4 py-2 my-4 italic bg-muted/30 rounded-r-lg">
                              {children}
                            </blockquote>
                          ),
                        }}
                      >
                        {selectedDoc.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="text-muted-foreground italic mb-4">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted" />
                          Contenu indisponible pour ce document
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Problème de données. Le document existe mais n&apos;a pas de contenu.
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Document ID: {selectedDoc._id}
                        </div>
                      </div>
                    )}
                  </article>
                </div>
              </div>
            ) : (
              <div className="glass backdrop-blur-xl rounded-xl shadow-lg border border-border/40 p-8">
                <div className="text-center">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
                    Bienvenue dans votre cours
                  </h2>
                  <p className="text-muted-foreground mb-6 text-lg">
                    Sélectionnez un chapitre ou tutoriel dans la barre latérale pour commencer l&apos;apprentissage.
                  </p>
                  <div className="text-sm text-muted-foreground/80">
                    Ce cours a été généré à partir du dépôt {owner}/{repo}.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Regenerate Modal */}
      {repository && (
        <RegenerateModal 
          repository={repository}
          isOpen={isModalOpen}
          onClose={handleClose}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../../../../convex/_generated/api';
import type { Id } from '../../../../../../convex/_generated/dataModel';
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

interface CourseContentProps {
  owner: string;
  repo: string;
  jobId: string;
}

export default function CourseContent({ owner, repo, jobId }: CourseContentProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
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

  // Mutation to trigger regeneration
  const triggerAnalyze = useMutation(api.repositories.triggerAnalyze);

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
        console.warn('[Empty Content] Document has no content:', {
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
            console.info('[Fallback] Switching to canonical document with content:', {
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

  // Handle regenerate
  const handleRegenerate = async () => {
    if (!repository) return;
    
    setIsRegenerating(true);
    try {
      const result = await triggerAnalyze({ 
        repositoryId: repository._id 
      });
      
      // Trigger the Cloud Run service to actually process the job
      if (result.jobId) {
        const response = await fetch("/api/analyze-proxy", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobId: result.jobId,
            repositoryUrl: `https://github.com/${repository.fullName}`,
            branch: repository.defaultBranch || "main",
            callbackUrl: `http://localhost:3000/api/webhook/job-callback`,
            callbackToken: result.callbackToken,
          }),
        });
        
        if (!response.ok) {
          throw new Error("Failed to start analysis service");
        }
      }
      
      toast({
        title: "Regeneration Started",
        description: "Your course is being regenerated. This may take 30-60 minutes.",
      });

      // Navigate to new job - use result.jobId not the entire result object
      router.push(`/course/${owner}/${repo}/${result.jobId}`);
    } catch (error) {
      console.error('Failed to regenerate:', error);
      toast({
        title: "Regeneration Failed",
        description: "Failed to start regeneration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  // Get status icon and color
  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', label: 'Completed' };
      case 'running':
        return { icon: Clock, color: 'text-blue-500', label: 'Generating...' };
      case 'failed':
        return { icon: XCircle, color: 'text-red-500', label: 'Failed' };
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500', label: 'Pending' };
      default:
        return { icon: AlertCircle, color: 'text-gray-500', label: 'Unknown' };
    }
  };

  if (docs === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading course...</div>
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    // If job is still running, show generating state
    if (job?.status === 'running' || job?.status === 'pending') {
      const statusDisplay = getStatusDisplay(job?.status);
      const StatusIcon = statusDisplay.icon;
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
            <div className="flex flex-col items-center text-center">
              <StatusIcon className={`w-12 h-12 ${statusDisplay.color} mb-4`} />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Generation in Progress</h2>
              <p className="text-gray-600 mb-4">
                Your course for {owner}/{repo} is being generated. This process typically takes 30-60 minutes.
              </p>
              
              {job?.currentStep && (
                <div className="w-full mb-6">
                  <div className="text-sm text-gray-500 mb-2">
                    Step {job.currentStep} of {job.totalSteps}: {job.statusMessage}
                  </div>
                  <div className="w-full h-3 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-purple-600 rounded-full transition-all duration-500"
                      style={{ width: `${(job.currentStep / job.totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back to Dashboard
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Refresh Status
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
        
        console.info('[De-duplication] Duplicate detected:', {
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
      console.warn('[Data Issue] Duplicates found and suppressed:', duplicates);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Course: {owner}/{repo}
              </h1>
              <div className="flex items-center gap-4 mb-2">
                <p className="text-gray-600">
                  {chapters.length} chapters • {tutorials.length} tutorials
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
                    <span>Data issue detected</span>
                  </div>
                )}
              </div>
              {job?.status === 'running' && job.currentStep && (
                <div className="mt-2">
                  <div className="text-sm text-gray-500">
                    Step {job.currentStep} of {job.totalSteps}: {job.statusMessage}
                  </div>
                  <div className="w-64 h-2 bg-gray-200 rounded-full mt-1">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-300"
                      style={{ width: `${(job.currentStep / job.totalSteps) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating || job?.status === 'running'}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? 'Starting...' : 'Regenerate Course'}
              </button>
              
              <button
                onClick={() => router.push('/')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
          
          {job?.status === 'failed' && job.error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Generation Failed</p>
                  <p className="text-sm text-red-700 mt-1">{job.error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-8">
          {/* Sidebar - Table of Contents */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-6 sticky top-8">
              <h2 className="text-lg font-semibold mb-4">Course Content</h2>
              
              {/* Chapters */}
              {chapters.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Chapters</h3>
                  <div className="space-y-2">
                    {chapters.map((doc) => (
                      <button
                        key={doc._id}
                        onClick={() => setSelectedSlug(doc.slug)}
                        className={`w-full text-left p-3 rounded-md text-sm transition-colors ${
                          selectedSlug === doc.slug
                            ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                            : 'hover:bg-gray-50 text-gray-700'
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
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Tutorials</h3>
                  <div className="space-y-2">
                    {tutorials.map((doc) => (
                      <button
                        key={doc._id}
                        onClick={() => setSelectedSlug(doc.slug)}
                        className={`w-full text-left p-3 rounded-md text-sm transition-colors ${
                          selectedSlug === doc.slug
                            ? 'bg-green-50 text-green-700 border-l-2 border-green-500'
                            : 'hover:bg-gray-50 text-gray-700'
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
                  <h3 className="text-sm font-medium text-gray-700 mb-3">References</h3>
                  <div className="space-y-2">
                    {[...yamls, ...tocs].map((doc) => (
                      <button
                        key={doc._id}
                        onClick={() => setSelectedSlug(doc.slug)}
                        className={`w-full text-left p-3 rounded-md text-sm transition-colors ${
                          selectedSlug === doc.slug
                            ? 'bg-gray-100 text-gray-800 border-l-2 border-gray-400'
                            : 'hover:bg-gray-50 text-gray-600'
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
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="text-center text-gray-500">Loading content...</div>
              </div>
            ) : selectedDoc && selectedSlug ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 overflow-hidden">
                <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                  <h1 className="text-3xl font-bold text-gray-900 mb-3">{selectedDoc.title}</h1>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                      selectedDoc.kind === 'chapter' ? 'bg-blue-500 text-white' :
                      selectedDoc.kind === 'tutorial' ? 'bg-green-500 text-white' :
                      'bg-gray-500 text-white'
                    }`}>
                      {selectedDoc.kind === 'chapter' ? '📚 Chapter' :
                       selectedDoc.kind === 'tutorial' ? '🎯 Tutorial' :
                       selectedDoc.kind === 'yaml' ? '⚙️ Config' : '📄 Document'}
                    </span>
                    {selectedDoc.kind === 'chapter' && (
                      <span className="font-medium">#{selectedDoc.chapterIndex}</span>
                    )}
                  </div>
                </div>
                <div className="p-8">
                  <article className="prose prose-slate dark:prose-invert max-w-none
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h1:mb-8 prose-h1:mt-8 prose-h1:border-b prose-h1:pb-4
                    prose-h2:text-2xl prose-h2:mb-6 prose-h2:mt-8
                    prose-h3:text-xl prose-h3:mb-4 prose-h3:mt-6
                    prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4
                    prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-0 prose-pre:rounded-lg prose-pre:overflow-x-auto
                    prose-code:bg-purple-100 dark:prose-code:bg-purple-900/30 prose-code:text-purple-600 dark:prose-code:text-purple-400 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-sm prose-code:before:content-[''] prose-code:after:content-['']
                    prose-ul:my-4 prose-ul:space-y-2
                    prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:leading-relaxed
                    prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-purple-400 prose-blockquote:pl-4 prose-blockquote:italic
                    prose-img:rounded-lg prose-img:shadow-md
                    prose-table:w-full prose-table:border-collapse
                    prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:p-2 prose-th:bg-gray-100 dark:prose-th:bg-gray-800
                    prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:p-2
                    [&_pre]:!bg-gray-900 [&_pre]:!text-gray-100
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
                      >
                        {selectedDoc.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="text-gray-500 italic mb-4">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          No content available for this document
                        </div>
                        <div className="text-sm text-gray-400">
                          This appears to be a data integrity issue. The document exists but has no content.
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Document ID: {selectedDoc._id}
                        </div>
                      </div>
                    )}
                  </article>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border p-8">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Welcome to your course
                  </h2>
                  <p className="text-gray-600 mb-4">
                    Select a chapter or tutorial from the sidebar to begin learning.
                  </p>
                  <div className="text-sm text-gray-500">
                    This course was generated from the {owner}/{repo} repository.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
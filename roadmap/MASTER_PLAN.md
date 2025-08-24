# Fondation Web App Master Plan

## Executive Summary

Fondation Web App provides a web interface for generating comprehensive AI-powered course documentation from GitHub repositories using the Fondation CLI's analyze command. The analyze command orchestrates a 6-step workflow that takes 30-60+ minutes to generate complete tutorial courses.

## Core Architecture Decision

**We will run Fondation CLI from source** within Docker containers, not use the bundled version. This is because:
1. The analyze command requires `@anthropic-ai/claude-code` SDK
2. Running from source is proven to work (7-minute test succeeded)
3. Modifying CLI bundling adds unnecessary complexity

## Version Roadmap

### V0.1: Authentication & Repository Setup (Week 1)
**Goal**: Basic authentication and repository listing
**Duration**: 1 week
**Bundle Size Target**: <200KB

#### Core Features
- GitHub OAuth authentication via NextAuth.js v5
- Repository fetching from GitHub API
- Basic job creation interface
- Convex backend setup

#### Implementation Details
```typescript
// Convex Schema
users: defineTable({
  githubId: v.string(),
  username: v.string(),
  email: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  githubToken: v.string(), // Store encrypted
  createdAt: v.number(),
}).index("by_github_id", ["githubId"]),

repositories: defineTable({
  userId: v.id("users"),
  githubRepoId: v.string(),
  name: v.string(),
  fullName: v.string(),
  description: v.optional(v.string()),
  defaultBranch: v.string(),
  isPrivate: v.boolean(),
}).index("by_user", ["userId"]),

jobs: defineTable({
  userId: v.id("users"),
  repositoryId: v.id("repositories"),
  status: v.string(), // "pending", "cloning", "analyzing", "completed", "failed"
  startedAt: v.optional(v.number()),
  completedAt: v.optional(v.number()),
  outputPath: v.optional(v.string()),
  error: v.optional(v.string()),
  progress: v.optional(v.string()), // Current step being processed
  estimatedCompletion: v.optional(v.number()),
  callbackToken: v.string(),
  githubToken: v.string(), // Encrypted token for private repos
}).index("by_user", ["userId"]),
```

#### Key UI Components
- Login page with GitHub OAuth
- Repository grid with "Generate Course" buttons
- Basic job status display

#### Success Criteria
- [ ] GitHub OAuth flow completes
- [ ] Private repositories accessible
- [ ] Jobs created with proper tokens
- [ ] Basic UI renders correctly

### V0.2: Cloud Run Integration & Long-Running Jobs (Week 2)
**Goal**: Execute analyze command with proper handling for 30-60 minute runtimes
**Duration**: 1 week
**Bundle Size Target**: <250KB

#### Docker Configuration
```dockerfile
FROM node:20-alpine

# Install bun for TypeScript execution
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Copy Fondation source with dependencies
WORKDIR /fondation
COPY --from=fondation-source . .
RUN bun install

# Setup webhook server
WORKDIR /app
COPY server.js .
RUN npm install express body-parser

EXPOSE 8080
CMD ["node", "server.js"]
```

#### Webhook Server Implementation
```javascript
// server.js - Key parts
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

app.post('/analyze', async (req, res) => {
  const { jobId, repoUrl, githubToken, callbackUrl, callbackToken } = req.body;
  
  // Quick response
  res.json({ status: 'started', jobId });
  
  // Clone repository with token for private access
  const repoPath = `/tmp/repos/${jobId}`;
  const cloneCommand = githubToken 
    ? `git clone https://${githubToken}@github.com/${repoUrl}.git ${repoPath}`
    : `git clone https://github.com/${repoUrl}.git ${repoPath}`;
    
  exec(cloneCommand, async (error) => {
    if (error) {
      await notifyCallback(callbackUrl, callbackToken, {
        jobId,
        type: 'error',
        error: 'Failed to clone repository'
      });
      return;
    }
    
    // Start analyze command
    const outputDir = `/tmp/outputs/${jobId}`;
    const analyzeCommand = `cd /fondation && bun run src/analyze-all.ts ${repoPath} --output-dir ${outputDir}`;
    
    const analyzeProcess = exec(analyzeCommand, {
      timeout: 3600000, // 60 minutes
      maxBuffer: 50 * 1024 * 1024, // 50MB
      env: {
        ...process.env,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        CLAUDE_OUTPUT_DIR: outputDir
      }
    });
    
    // Monitor progress via file creation
    const progressMonitor = setInterval(async () => {
      await checkProgress(outputDir, jobId, callbackUrl, callbackToken);
    }, 10000); // Check every 10 seconds
    
    analyzeProcess.on('exit', async (code) => {
      clearInterval(progressMonitor);
      
      if (code === 0) {
        // Upload results
        const files = await gatherOutputFiles(outputDir);
        await notifyCallback(callbackUrl, callbackToken, {
          jobId,
          type: 'complete',
          files
        });
      } else {
        await notifyCallback(callbackUrl, callbackToken, {
          jobId,
          type: 'error',
          error: 'Analysis failed'
        });
      }
      
      // Cleanup
      await cleanup(repoPath, outputDir);
    });
  });
});

async function checkProgress(outputDir, jobId, callbackUrl, callbackToken) {
  const steps = [
    { file: 'step1_abstractions.yaml', message: 'Extracting core abstractions (Step 1/6)' },
    { file: 'step2_relationships.yaml', message: 'Analyzing relationships (Step 2/6)' },
    { file: 'step3_order.yaml', message: 'Determining chapter order (Step 3/6)' },
    { file: 'chapters/', message: 'Generating chapters (Step 4/6)' },
    { file: 'reviewed-chapters/', message: 'Reviewing content (Step 5/6)' },
    { file: 'tutorials/', message: 'Creating interactive tutorials (Step 6/6)' }
  ];
  
  for (const step of steps) {
    const filePath = path.join(outputDir, step.file);
    if (await fileExists(filePath)) {
      await notifyCallback(callbackUrl, callbackToken, {
        jobId,
        type: 'progress',
        message: step.message
      });
      return; // Only report the latest step
    }
  }
}
```

#### UI Updates for Long-Running Jobs
```typescript
// Repository Card Component
export function RepoCard({ repo }) {
  const [showWarning, setShowWarning] = useState(false);
  const generateCourse = useMutation(api.jobs.create);
  
  const handleGenerate = () => {
    setShowWarning(true);
  };
  
  const confirmGenerate = async () => {
    await generateCourse({
      repositoryId: repo.id,
      estimatedMinutes: repo.size > 100000 ? 60 : 30
    });
    toast.success("Course generation started. You'll receive an email when complete.");
    setShowWarning(false);
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{repo.name}</CardTitle>
          {repo.isPrivate && <Badge>Private</Badge>}
        </CardHeader>
        <CardContent>
          <p>{repo.description}</p>
          <Button onClick={handleGenerate}>
            Generate Full Course
          </Button>
        </CardContent>
      </Card>
      
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Comprehensive Course?</AlertDialogTitle>
            <AlertDialogDescription>
              This will analyze your entire codebase and generate a complete tutorial course.
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Estimated time: 30-60 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>You'll receive an email when complete</span>
                </div>
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  <span>Uses advanced AI analysis (token costs apply)</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGenerate}>
              Start Generation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

#### Progress Tracking
```typescript
// Job Status Page
export function JobStatus({ jobId }) {
  const job = useQuery(api.jobs.get, { id: jobId });
  
  const progressSteps = [
    { key: 'cloning', label: 'Cloning repository' },
    { key: 'step1', label: 'Extracting abstractions' },
    { key: 'step2', label: 'Analyzing relationships' },
    { key: 'step3', label: 'Ordering chapters' },
    { key: 'step4', label: 'Generating chapters' },
    { key: 'step5', label: 'Reviewing content' },
    { key: 'step6', label: 'Creating tutorials' }
  ];
  
  const currentStep = progressSteps.findIndex(s => s.label === job?.progress) + 1;
  const progressPercent = (currentStep / progressSteps.length) * 100;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Generation Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={progressPercent} className="mb-4" />
        <div className="space-y-2">
          {progressSteps.map((step, index) => (
            <div key={step.key} className="flex items-center gap-2">
              {index < currentStep ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : index === currentStep ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300" />
              )}
              <span className={index <= currentStep ? 'font-medium' : 'text-gray-500'}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
        
        {job?.estimatedCompletion && (
          <div className="mt-4 text-sm text-gray-600">
            Estimated completion: {formatDistance(job.estimatedCompletion, Date.now())}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### V0.3: Results Display & Download (Week 3)
**Goal**: Display and manage generated course content
**Duration**: 1 week
**Bundle Size Target**: <350KB

#### Features
- View generated tutorials in-app
- Download course as structured files
- Markdown preview with syntax highlighting
- Course versioning (regenerate with updates)

#### Implementation
```typescript
// Course Viewer Component
export function CourseViewer({ jobId }) {
  const files = useQuery(api.files.getByJob, { jobId });
  const [selectedFile, setSelectedFile] = useState(null);
  
  const fileTree = buildFileTree(files);
  
  return (
    <div className="grid grid-cols-4 gap-4 h-[600px]">
      <div className="col-span-1 border-r overflow-y-auto">
        <FileTree 
          files={fileTree}
          onSelect={setSelectedFile}
        />
      </div>
      <div className="col-span-3 overflow-y-auto">
        {selectedFile && (
          <MarkdownPreview content={selectedFile.content} />
        )}
      </div>
    </div>
  );
}
```

### V0.4: Team Features (Week 4)
**Goal**: Multi-user support and collaboration
**Duration**: 1 week
**Bundle Size Target**: <400KB

#### Features
- Organization/team support
- Shared repository access
- Usage quotas and limits
- Basic analytics dashboard

### V1.0: Production Ready (Week 5-6)
**Goal**: Polish, monitoring, and billing
**Duration**: 2 weeks
**Bundle Size Target**: <450KB

#### Features
- Stripe billing integration
- Usage-based pricing tiers
- Error tracking with Sentry
- Performance monitoring
- Email notifications via Resend
- Rate limiting and abuse prevention

## Technical Stack

### Core Dependencies
```json
{
  "next": "^15.0.1",
  "react": "^18.3.1",
  "convex": "^1.0.0",
  "next-auth": "5.0.0-beta.25",
  "@octokit/rest": "^21.1.1",
  "tailwindcss": "^4.0.0",
  "shadcn-ui": "latest"
}
```

### Cloud Infrastructure
- **Frontend**: Vercel (Next.js hosting)
- **Backend**: Convex (real-time database)
- **Job Execution**: Google Cloud Run (60-minute timeout)
- **File Storage**: Convex file storage
- **Monitoring**: Vercel Analytics, Sentry

## Key Implementation Considerations

### 1. Handling Long-Running Jobs
- 30-60+ minute execution times require background processing
- Progress updates via file monitoring, not stdout
- Email notifications for completion
- Allow users to navigate away during processing

### 2. Private Repository Access
- Store encrypted GitHub tokens per user
- Pass tokens to CLI for repository cloning
- Implement token refresh mechanism
- Clear security warnings about token storage

### 3. Cost Management
- Each analyze run uses significant AI tokens
- Implement usage quotas by tier
- Show cost estimates before execution
- Cache results for identical repository states

### 4. Error Recovery
- Jobs may fail due to timeout, API limits, or CLI errors
- Implement retry mechanism with exponential backoff
- Provide clear error messages
- Allow manual retry from last successful step

### 5. Scalability
- Cloud Run auto-scales but has instance limits
- Implement job queue to prevent overwhelming
- Consider regional deployment for global users
- Monitor and optimize Docker image size

## Development Workflow

### Phase 1: Local Development
```bash
# Start all services
bun run dev          # Next.js frontend
npx convex dev       # Convex backend
docker build -t fondation-worker .  # Build worker
docker run -p 8080:8080 fondation-worker  # Test worker
```

### Phase 2: Staging Deployment
```bash
# Deploy to staging
npx convex deploy --prod
vercel --env=preview
gcloud run deploy fondation-worker-staging
```

### Phase 3: Production Deployment
```bash
# Production deployment with monitoring
npx convex deploy --prod
vercel --prod
gcloud run deploy fondation-worker --region=us-central1
```

## Success Metrics

### Technical Metrics
- Job success rate >95%
- Average completion time <45 minutes
- Bundle size <450KB
- Lighthouse score >85

### Business Metrics
- User activation rate >60%
- Job completion rate >80%
- User retention (30-day) >40%
- Paid conversion rate >5%

## Risk Mitigation

### Technical Risks
1. **Cloud Run timeout (60 minutes)**
   - Mitigation: Optimize CLI performance, implement chunking for very large repos
   
2. **High API costs**
   - Mitigation: Implement strict quotas, show cost estimates, cache results

3. **Docker image size**
   - Mitigation: Multi-stage builds, Alpine Linux, minimize dependencies

### Business Risks
1. **Long wait times deter users**
   - Mitigation: Clear expectations, email notifications, background processing

2. **Complexity of generated content**
   - Mitigation: Provide preview/summary, allow customization in future versions

## Future Enhancements (Post-V1.0)

### V1.1: Advanced Features
- Custom prompts and templates
- Incremental updates (only analyze changes)
- Multiple output formats (PDF, EPUB, HTML)
- Integration with documentation platforms

### V1.2: AI Enhancements
- GPT-4 Vision for diagram analysis
- Voice narration generation
- Interactive code examples
- Automated video tutorials

### V2.0: Platform Evolution
- Multi-language support
- Plugin system for custom analyzers
- White-label solution for enterprises
- API for third-party integrations

## Conclusion

This master plan provides a clear, realistic path to building Fondation Web App. The key insight is that we're not building a quick documentation generator, but rather a comprehensive course creation platform that requires significant processing time but delivers exceptional value. By setting proper expectations and building the right infrastructure, we can deliver a successful product that leverages the full power of the Fondation CLI's analyze command.
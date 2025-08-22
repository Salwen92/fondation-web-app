# API Documentation

## Overview

Fondation uses a combination of Next.js API routes for authentication and Convex functions for data management. This document covers all available APIs and their usage.

## Authentication APIs

### NextAuth.js Routes

All authentication is handled through NextAuth.js with the following endpoints:

#### `GET/POST /api/auth/signin`
Initiates GitHub OAuth flow.

**Response**: Redirects to GitHub for authentication

#### `GET /api/auth/signout`
Signs out the current user.

**Response**: Clears session and redirects to home

#### `GET /api/auth/session`
Returns current user session.

**Response**:
```typescript
{
  user: {
    id: string;
    name: string;
    email: string;
    image: string;
    githubId: string;
  };
  accessToken: string;
  expires: string;
}
```

#### `GET /api/auth/callback/github`
GitHub OAuth callback endpoint (handled automatically).

## Convex Functions

### User Management

#### `users.createOrUpdateUser`
**Type**: Mutation  
**Description**: Creates or updates a user record based on GitHub ID.

```typescript
// Arguments
{
  githubId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

// Returns
userId: Id<"users">
```

#### `users.getUserByGithubId`
**Type**: Query  
**Description**: Retrieves a user by their GitHub ID.

```typescript
// Arguments
{
  githubId: string;
}

// Returns
{
  _id: Id<"users">;
  githubId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  createdAt: number;
}
```

#### `users.getCurrentUser`
**Type**: Query  
**Description**: Gets the current user based on optional GitHub ID.

```typescript
// Arguments
{
  githubId?: string;
}

// Returns
User | null
```

### Repository Management

#### `repositories.fetchGitHubRepositories`
**Type**: Action  
**Description**: Fetches repositories from GitHub API and stores them in the database.

```typescript
// Arguments
{
  accessToken: string;
  userId: Id<"users">;
}

// Returns
Array<{
  githubRepoId: string;
  name: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
}>
```

**Implementation Details**:
- Fetches up to 100 repositories
- Sorts by last updated
- Checks for existing repositories to avoid duplicates
- Stores new repositories in Convex

#### `repositories.listUserRepositories`
**Type**: Query  
**Description**: Lists all repositories for a specific user.

```typescript
// Arguments
{
  userId: Id<"users">;
}

// Returns
Array<{
  _id: Id<"repositories">;
  userId: Id<"users">;
  githubRepoId: string;
  name: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
}>
```

#### `repositories.getByGithubId` (Internal)
**Type**: Internal Query  
**Description**: Retrieves a repository by GitHub ID (used internally by actions).

```typescript
// Arguments
{
  githubRepoId: string;
  userId: Id<"users">;
}

// Returns
Repository | null
```

#### `repositories.create` (Internal)
**Type**: Internal Mutation  
**Description**: Creates a new repository record (used internally by actions).

```typescript
// Arguments
{
  userId: Id<"users">;
  githubRepoId: string;
  name: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
}

// Returns
repositoryId: Id<"repositories">
```

### Job Management

#### `jobs.create`
**Type**: Mutation  
**Description**: Creates a new documentation generation job.

```typescript
// Arguments
{
  userId: Id<"users">;
  repositoryId: Id<"repositories">;
  prompt: string;
}

// Returns
{
  jobId: Id<"jobs">;
  callbackToken: string;
}
```

**Features**:
- Generates unique callback token using UUID v4
- Sets initial status to "pending"
- Records creation timestamp

#### `jobs.listUserJobs`
**Type**: Query  
**Description**: Lists all jobs for a specific user.

```typescript
// Arguments
{
  userId: Id<"users">;
}

// Returns
Array<{
  _id: Id<"jobs">;
  userId: Id<"users">;
  repositoryId: Id<"repositories">;
  status: "pending" | "running" | "completed" | "failed";
  prompt: string;
  callbackToken: string;
  createdAt: number;
}>
```

**Features**:
- Orders by creation date (newest first)
- Returns all user's jobs

#### `jobs.getJob`
**Type**: Query  
**Description**: Retrieves a specific job by ID.

```typescript
// Arguments
{
  jobId: Id<"jobs">;
}

// Returns
Job | null
```

#### `jobs.updateStatus`
**Type**: Mutation  
**Description**: Updates job status (typically called by the execution backend).

```typescript
// Arguments
{
  jobId: Id<"jobs">;
  status: "pending" | "running" | "completed" | "failed";
  callbackToken: string;
}

// Returns
{
  success: boolean;
}
```

**Security**:
- Validates callback token before updating
- Returns error if token doesn't match

## Usage Examples

### Client-Side Usage with Convex React Hooks

```typescript
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../convex/_generated/api";

// Query example
const repositories = useQuery(api.repositories.listUserRepositories, { 
  userId: "user_id_here" 
});

// Mutation example
const createJob = useMutation(api.jobs.create);
await createJob({
  userId: "user_id_here",
  repositoryId: "repo_id_here",
  prompt: "Generate documentation"
});

// Action example
const fetchRepos = useAction(api.repositories.fetchGitHubRepositories);
await fetchRepos({
  accessToken: session.accessToken,
  userId: "user_id_here"
});
```

### Server-Side Usage

```typescript
import { auth } from "@/server/auth";

// Get session server-side
const session = await auth();
if (!session) {
  // Handle unauthenticated state
}

// Access user data
const userId = session.user.id;
const githubId = session.user.githubId;
const accessToken = session.accessToken;
```

## Error Handling

All Convex functions include error handling:

### Common Error Responses

1. **Invalid Arguments**: Convex automatically validates arguments against schema
2. **Not Found**: Functions return `null` for missing records
3. **Unauthorized**: Callback token validation in job updates
4. **GitHub API Errors**: Wrapped with descriptive error messages

### Error Format

```typescript
// Convex errors thrown as:
throw new Error("Descriptive error message");

// Client-side handling:
try {
  await someConvexFunction(args);
} catch (error) {
  console.error("Operation failed:", error);
  toast.error(error.message);
}
```

## Rate Limiting

### GitHub API Limits
- Authenticated requests: 5,000 per hour
- Repository list: Max 100 per request (pagination not yet implemented)

### Convex Limits
- Bandwidth: Based on Convex plan
- Function execution: Based on Convex plan
- Real-time subscriptions: Unlimited on dev, based on plan in production

## Webhooks (Future Implementation)

The system is designed to support webhooks for job status updates:

### Callback Endpoint (To Be Implemented)
```typescript
POST /api/jobs/callback
Headers:
  X-Job-Token: string
Body:
{
  jobId: string;
  type: "status" | "log" | "complete";
  status?: "running" | "completed" | "failed";
  message?: string;
  exitCode?: number;
}
```

## Best Practices

1. **Always validate session** before making authenticated requests
2. **Use proper TypeScript types** from generated Convex files
3. **Handle loading and error states** in UI components
4. **Cache data appropriately** using React Query or Convex subscriptions
5. **Validate environment variables** before deployment
6. **Use callback tokens** for secure job updates
7. **Implement proper error boundaries** in React components

## API Versioning

Currently at v0.1. Future versions will maintain backward compatibility where possible, with deprecation notices for breaking changes.
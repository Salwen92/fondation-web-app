import type { Id } from '@convex/generated/dataModel';

export interface CourseJob {
  _id: Id<'jobs'>;
  repositoryId: Id<'repositories'>;
  status: string;
  createdAt: number;
  docsCount?: number;
  error?: string;
  progress?: string;
  currentStep?: number;
  totalSteps?: number;
}

export interface CourseRepository {
  _id: Id<'repositories'>;
  name: string;
  fullName: string;
  description?: string;
}

export type CourseWithRepo = CourseJob & {
  repository?: CourseRepository;
};

export type CourseStatus = 'all' | 'completed' | 'failed' | 'in_progress';
export type CourseSortBy = 'date' | 'name' | 'docsCount';

export const courseStatusOptions = [
  { value: 'all' as const, label: 'Tous les cours' },
  { value: 'completed' as const, label: 'Terminés' },
  { value: 'failed' as const, label: 'Échoués' },
  { value: 'in_progress' as const, label: 'En cours' },
];

export const courseSortOptions = [
  { value: 'date' as const, label: 'Date de création' },
  { value: 'name' as const, label: 'Nom du dépôt' },
  { value: 'docsCount' as const, label: 'Nombre de documents' },
];

export function searchCourses(courses: CourseWithRepo[], searchQuery: string): CourseWithRepo[] {
  if (!searchQuery.trim()) {
    return courses;
  }

  const query = searchQuery.toLowerCase();
  return courses.filter((course) => {
    const repo = course.repository;
    if (!repo) {
      return false;
    }

    return (
      repo.name.toLowerCase().includes(query) ||
      repo.fullName.toLowerCase().includes(query) ||
      repo.description?.toLowerCase().includes(query)
    );
  });
}

export function filterCoursesByStatus(
  courses: CourseWithRepo[],
  status: CourseStatus,
): CourseWithRepo[] {
  if (status === 'all') {
    return courses;
  }

  return courses.filter((course) => {
    switch (status) {
      case 'completed':
        return course.status === 'completed';
      case 'failed':
        return course.status === 'failed' || course.status === 'dead';
      case 'in_progress':
        return (
          course.status === 'running' ||
          course.status === 'claimed' ||
          course.status === 'cloning' ||
          course.status === 'analyzing' ||
          course.status === 'gathering' ||
          course.status === 'pending'
        );
      default:
        return true;
    }
  });
}

export function sortCourses(courses: CourseWithRepo[], sortBy: CourseSortBy): CourseWithRepo[] {
  const sortedCourses = [...courses];

  switch (sortBy) {
    case 'date':
      return sortedCourses.sort((a, b) => b.createdAt - a.createdAt);
    case 'name':
      return sortedCourses.sort((a, b) => {
        const nameA = a.repository?.name || '';
        const nameB = b.repository?.name || '';
        return nameA.localeCompare(nameB);
      });
    case 'docsCount':
      return sortedCourses.sort((a, b) => {
        const countA = a.docsCount || 0;
        const countB = b.docsCount || 0;
        return countB - countA;
      });
    default:
      return sortedCourses;
  }
}

export function getStatusFilter(allJobs: CourseJob[], status: CourseStatus): CourseJob[] {
  if (status === 'all') {
    return allJobs;
  }

  return allJobs.filter((job) => {
    switch (status) {
      case 'completed':
        return job.status === 'completed';
      case 'failed':
        return job.status === 'failed' || job.status === 'dead';
      case 'in_progress':
        return (
          job.status === 'running' ||
          job.status === 'claimed' ||
          job.status === 'cloning' ||
          job.status === 'analyzing' ||
          job.status === 'gathering' ||
          job.status === 'pending'
        );
      default:
        return true;
    }
  });
}

export function getLatestJobPerRepo(jobs: CourseJob[]): CourseJob[] {
  const jobsByRepo = new Map<Id<'repositories'>, CourseJob>();

  for (const job of jobs) {
    const existingJob = jobsByRepo.get(job.repositoryId);
    if (!existingJob || job.createdAt > existingJob.createdAt) {
      jobsByRepo.set(job.repositoryId, job);
    }
  }

  return Array.from(jobsByRepo.values());
}

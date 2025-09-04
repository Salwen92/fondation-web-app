import CourseContent from './course-content';

interface CoursePageProps {
  params: Promise<{
    owner: string;
    repo: string;
    jobId: string;
  }>;
}

export default async function CoursePage({ params }: CoursePageProps) {
  const { owner, repo, jobId } = await params;

  return <CourseContent owner={owner} repo={repo} jobId={jobId} />;
}

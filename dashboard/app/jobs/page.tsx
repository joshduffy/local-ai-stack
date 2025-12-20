import { JobQueue } from '@/components/jobs/JobQueue';

export default function JobsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Job Queue</h1>
      <JobQueue />
    </div>
  );
}

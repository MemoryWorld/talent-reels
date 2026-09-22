export type JobFeed = { job: { id: string } };

export function visibleFeed<T extends JobFeed>(feed: T | null, selectedJob: string): T | null {
  return feed?.job.id === selectedJob ? feed : null;
}

export function canMutate(feed: JobFeed | null, selectedJob: string, loading: boolean, busy: boolean, error: string): boolean {
  return !!visibleFeed(feed, selectedJob) && !loading && !busy && !error;
}

export function sameContext(requestJob: string, selectedJob: string, modalJob?: string): boolean {
  return requestJob === selectedJob && (modalJob === undefined || modalJob === requestJob);
}

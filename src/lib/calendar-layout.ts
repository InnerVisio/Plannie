import type { Post } from '../types';

// ---------- Geometry constants ----------

export const DAY_START_HOUR = 6;      // first visible hour
export const DAY_END_HOUR = 23;       // last visible hour (exclusive end boundary)
export const HOUR_HEIGHT = 56;        // px per hour — desktop
export const HOUR_HEIGHT_SM = 44;     // px per hour — mobile single-day
export const GUTTER_WIDTH = 56;       // px, the time labels column

export const totalGridHeight = (hourHeight: number) => (DAY_END_HOUR - DAY_START_HOUR) * hourHeight;

const minutesFromTop = (date: Date) => (date.getHours() - DAY_START_HOUR) * 60 + date.getMinutes();

export const topPx = (date: Date, hourHeight: number) => (minutesFromTop(date) / 60) * hourHeight;

export const heightPx = (durationMin: number, hourHeight: number) =>
  Math.max((durationMin / 60) * hourHeight, 24);

/**
 * Display-only block length in minutes. Not persisted — the data model has no duration.
 * Never write these numbers to Firestore, and never show an "end time" as if it were real.
 */
export const getDisplayDuration = (post: Post): number => {
  if (post.postType === 'event') return 60;
  if (post.postType === 'reel' || post.postType === 'video') return 45;
  if (post.postType === 'carousel') return 60;
  return 45; // post, image, anything else
};

// ---------- Overlap layout ----------

export interface LaidOutPost {
  post: Post;
  top: number;
  height: number;
  column: number;
  columns: number;
}

/**
 * Groups posts into clusters of mutually-overlapping items, then assigns each a column
 * so they render side by side. Posts are assumed pre-filtered to a single day.
 */
export const layoutDayPosts = (posts: Post[], hourHeight: number): LaidOutPost[] => {
  const sorted = [...posts].sort((a, b) => a.scheduledDate - b.scheduledDate);

  interface Interval { post: Post; start: number; end: number }
  const intervals: Interval[] = sorted.map((post) => {
    const start = post.scheduledDate;
    const end = start + getDisplayDuration(post) * 60_000;
    return { post, start, end };
  });

  const result: LaidOutPost[] = [];
  let clusterStart = 0;

  const flushCluster = (clusterIntervals: Interval[]) => {
    // Assign each post the lowest column index whose last post has already ended.
    const columnEndTimes: number[] = [];
    const assigned: { interval: Interval; column: number }[] = [];

    clusterIntervals.forEach((interval) => {
      let column = columnEndTimes.findIndex((endTime) => endTime <= interval.start);
      if (column === -1) {
        column = columnEndTimes.length;
        columnEndTimes.push(interval.end);
      } else {
        columnEndTimes[column] = interval.end;
      }
      assigned.push({ interval, column });
    });

    const columns = columnEndTimes.length;
    assigned.forEach(({ interval, column }) => {
      result.push({
        post: interval.post,
        top: topPx(new Date(interval.start), hourHeight),
        height: heightPx(getDisplayDuration(interval.post), hourHeight),
        column,
        columns,
      });
    });
  };

  let i = 0;
  while (i < intervals.length) {
    clusterStart = i;
    let clusterMaxEnd = intervals[i].end;
    let j = i + 1;
    while (j < intervals.length && intervals[j].start < clusterMaxEnd) {
      clusterMaxEnd = Math.max(clusterMaxEnd, intervals[j].end);
      j++;
    }
    flushCluster(intervals.slice(clusterStart, j));
    i = j;
  }

  return result;
};

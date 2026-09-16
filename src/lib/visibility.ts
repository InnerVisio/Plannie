import type { Post } from '../types';

/** Posts the client is allowed to see. Drafts are the agency's private workspace. */
export const isClientVisible = (post: Post) => post.status !== 'draft';

export const filterForClient = (posts: Post[], isAdmin: boolean) =>
  isAdmin ? posts : posts.filter(isClientVisible);

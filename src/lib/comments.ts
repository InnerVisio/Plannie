import type { Comment, Post } from '../types';

/**
 * Older comment documents were written before `clientId` existed. Fall back to looking the
 * post up by `postId` rather than assuming the field is present. Returns '' if neither the
 * field nor the post lookup resolves — callers should treat that as "unknown client".
 */
export const getCommentClientId = (comment: Comment, postMap: Record<string, Post>): string =>
  comment.clientId || postMap[comment.postId]?.clientId || '';

/** Only client comments are ever "outstanding" — an admin reply is never unresolved. */
export const isUnresolvedClientComment = (comment: Comment): boolean =>
  comment.authorType === 'client' && !comment.resolvedAt;

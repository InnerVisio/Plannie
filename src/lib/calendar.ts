import { Post } from '../types';

export const getGoogleCalendarUrl = (post: Post, clientName: string) => {
  const title = encodeURIComponent(`[${clientName}] ${post.title}`);
  
  // Default duration for social media post/event is 1 hour
  const startDate = new Date(post.scheduledDate);
  const endDate = new Date(post.scheduledDate + 60 * 60 * 1000);
  
  // Format dates to YYYYMMDDTHHMMSSZ (UTC)
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  };

  const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;
  
  const details = encodeURIComponent(
    `Příspěvek/Událost pro klienta: ${clientName}\n\n${post.description || ''}`
  );

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
};

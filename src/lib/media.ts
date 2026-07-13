export const getEmbedUrl = (url: string) => {
  if (!url) return '';
  
  // Google Drive File
  const driveFileRegex = /(?:https?:\/\/)?(?:drive|docs)\.google\.com\/(?:(?:file|presentation|document|spreadsheets)\/d\/|open\?id=)([-\w]{25,})/;
  const fileMatch = url.match(driveFileRegex);
  if (fileMatch && fileMatch[1]) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }

  // Google Drive Folder
  const driveFolderRegex = /(?:https?:\/\/)?drive\.google\.com\/(?:drive\/)?folders\/([-\w]{25,})/;
  const folderMatch = url.match(driveFolderRegex);
  if (folderMatch && folderMatch[1]) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
  }

  // Canva
  const canvaRegex = /(?:https?:\/\/)?(?:www\.)?canva\.com\/design\/([a-zA-Z0-9]+)\/([a-zA-Z0-9_-]+)\/(?:edit|view)/;
  const canvaMatch = url.match(canvaRegex);
  if (canvaMatch && canvaMatch[1]) {
    // Return Canva embed URL
    return `https://www.canva.com/design/${canvaMatch[1]}/${canvaMatch[2]}/view?embed`;
  }

  // If it's already an embed link from Canva
  if (url.includes('canva.com') && url.includes('view?embed')) {
    return url;
  }

  return url;
};

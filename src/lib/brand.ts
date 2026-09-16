export const BRAND_COLORS: Record<string, string> = {
  slate: '#475467', indigo: '#4F46E5', emerald: '#059669', rose: '#E11D48', amber: '#D97706',
  violet: '#7C3AED', cyan: '#0891B2', blue: '#2563EB', zinc: '#52525B', neutral: '#525252',
};

export const getBrandColor = (id?: string) => BRAND_COLORS[id ?? 'slate'] ?? BRAND_COLORS.slate;

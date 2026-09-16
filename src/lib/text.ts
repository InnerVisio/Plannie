/** Diacritic-insensitive, case-insensitive normalization for search (e.g. "cerny" matches "Černý"). */
export const normalizeForSearch = (str: string) =>
  str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const matchesSearch = (haystack: string, query: string) =>
  normalizeForSearch(haystack).includes(normalizeForSearch(query));

/**
 * Czech plural forms: 1 = singular, 2-4 = "few" form, 5+ (and 0) = "many" form.
 * e.g. pluralize(1, 'koncept', 'koncepty', 'konceptů') => '1 koncept'
 */
export const pluralize = (n: number, one: string, few: string, many: string): string => {
  const form = n === 1 ? one : n >= 2 && n <= 4 ? few : many;
  return `${n} ${form}`;
};

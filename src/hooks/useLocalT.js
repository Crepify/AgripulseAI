import { T } from '../data/translations';

/**
 * Shallow-merged translation lookup: complete sections come from the selected
 * language, while NEW sections (mandiLive / weatherLive, currently translated
 * for en + hi only) gracefully fall back to English for the other 13 langs.
 */
export function useTranslation(lang) {
  return { ...T.en, ...(T[lang] || {}) };
}

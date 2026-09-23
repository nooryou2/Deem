// src/hooks/useItemName.ts
//
// An item's name is saved in whichever language was active when it was
// created. For names the user typed that's right — "Vacuum Bedroom" should
// stay exactly as written. But names generated from a built-in template (e.g.
// "AC Unit – Filter Cleaning") are really system labels, so they should follow
// the current language instead of staying frozen in the original one.
//
// This recognises a template-generated name in either language and renders it
// in the current one. Anything it doesn't recognise is returned unchanged.

import { useMemo } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { ar } from '@/i18n/ar';
import { MAINTENANCE_TEMPLATES } from '@/utils/maintenanceTemplates';

// Must match the separator AddEditMaintenanceScreen uses when it builds a name.
const SEP = ' – ';

/** Collapses spacing and dash variants so small differences still match. */
function normalise(name: string): string {
  return name.trim().replace(/\s*[–—-]\s*/g, SEP).replace(/\s+/g, ' ');
}

export function useItemName() {
  const { t } = useLanguage();

  // Every template name, in both languages, mapped back to its parts.
  const known = useMemo(() => {
    const map = new Map<string, { itemName: string; taskName: string }>();
    for (const tpl of MAINTENANCE_TEMPLATES) {
      const parts = { itemName: tpl.itemName, taskName: tpl.taskName };
      map.set(normalise(`${tpl.itemName}${SEP}${tpl.taskName}`), parts);
      const arItem = ar[tpl.itemName];
      const arTask = ar[tpl.taskName];
      if (arItem && arTask) map.set(normalise(`${arItem}${SEP}${arTask}`), parts);
    }
    return map;
  }, []);

  return (name: string): string => {
    const match = known.get(normalise(name));
    return match ? `${t(match.itemName)}${SEP}${t(match.taskName)}` : name;
  };
}

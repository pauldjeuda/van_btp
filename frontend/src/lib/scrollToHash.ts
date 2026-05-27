/** Défile jusqu'à l'élément ciblé par un hash (#business-alerts, etc.) */
export function scrollToHashElement(hash: string, behavior: ScrollBehavior = 'smooth') {
  const id = hash.replace(/^#/, '');
  if (!id) return;
  window.setTimeout(() => {
    document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
  }, 150);
}

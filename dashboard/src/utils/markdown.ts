function escapeHtmlAttr(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function addClassToTag(tag: string, className: string): string {
  const classRe = /\bclass=("([^"]*)"|'([^']*)')/i;
  const match = tag.match(classRe);
  if (match) {
    const existing = (match[2] ?? match[3] ?? '').trim();
    const classes = new Set(existing.split(/\s+/).filter(Boolean));
    classes.add(className);
    const updated = `class="${escapeHtmlAttr(Array.from(classes).join(' '))}"`;
    return tag.replace(classRe, updated);
  }

  return tag.replace(/^(<\w+)/, `$1 class="${escapeHtmlAttr(className)}"`);
}

function isCounterUrl(url: string): boolean {
  return /count\.getloli\.com/i.test(url);
}

function chooseImgClass(url: string): 'md-badge' | 'md-counter' {
  return isCounterUrl(url) ? 'md-counter' : 'md-badge';
}

function stripCenterDivBlock(text: string): string {
  const centerDivBlockRe = /\n?\s*<div\b[^>]*\balign=("|')center\1[^>]*>\s*([\s\S]*?)\s*<\/div>\s*\n?/gi;
  if (!centerDivBlockRe.test(text)) return text;
  return text.replace(centerDivBlockRe, (_m, _q, inner: string) => `\n${inner}\n`);
}

export function proxyBadgeUrls<T extends string | null | undefined>(content: T): T {
  if (!content || typeof content !== 'string') return content;

  const firstHeadingIndex = content.search(/^\s{0,3}#{1,6}\s/m);
  const badgePart = firstHeadingIndex === -1 ? content : content.slice(0, firstHeadingIndex);
  const restPart = firstHeadingIndex === -1 ? '' : content.slice(firstHeadingIndex);

  let out = stripCenterDivBlock(badgePart);

  const mdImageRe = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g;
  const mdLinkedImageRe = /\[!\[([^\]]*)\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)\]\(([^)\s]+)\)/g;

  out = out
    .replace(mdLinkedImageRe, (_m, alt: string, imgUrl: string, href: string) => {
      const safeAlt = escapeHtmlAttr(alt || 'badge');
      const safeHref = escapeHtmlAttr(href);
      const safeSrc = escapeHtmlAttr(imgUrl);
      const imgClass = chooseImgClass(imgUrl);
      return `<a class="md-badge-link" href="${safeHref}"><img class="${imgClass}" alt="${safeAlt}" src="${safeSrc}" /></a>`;
    })
    .replace(mdImageRe, (_m, alt: string, imgUrl: string) => {
      const safeAlt = escapeHtmlAttr(alt || 'badge');
      const safeSrc = escapeHtmlAttr(imgUrl);
      const imgClass = chooseImgClass(imgUrl);
      return `<img class="${imgClass}" alt="${safeAlt}" src="${safeSrc}" />`;
    });

  out = out.replace(/<a\b([^>]*)>\s*(<img\b[^>]*>)\s*<\/a>/gi, (_m, aAttrs: string, imgTag: string) => {
    const imgSrc = imgTag.match(/\bsrc=("([^"]*)"|'([^']*)')/i)?.[2] ?? imgTag.match(/\bsrc=("([^"]*)"|'([^']*)')/i)?.[3] ?? '';
    const imgClass = chooseImgClass(imgSrc);
    const newImg = addClassToTag(imgTag, imgClass);
    const newA = addClassToTag(`<a${aAttrs}>`, 'md-badge-link');
    return `${newA}${newImg}</a>`;
  });

  out = out.replace(/<img\b[^>]*>/gi, (imgTag) => {
    const srcMatch = imgTag.match(/\bsrc=("([^"]*)"|'([^']*)')/i);
    const src = (srcMatch?.[2] ?? srcMatch?.[3] ?? '').trim();
    if (!src) return imgTag;
    if (!/^https?:\/\//i.test(src)) return imgTag;
    const imgClass = chooseImgClass(src);
    return addClassToTag(imgTag, imgClass);
  });

  return (out + restPart) as T;
}

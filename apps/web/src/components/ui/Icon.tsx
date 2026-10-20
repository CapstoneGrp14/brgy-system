import type { CSSProperties } from 'react';

/**
 * Line icons for navigation and dashboard tiles.
 *
 * These replace the emoji the sidebar used to render. Emoji are drawn by the
 * operating system, so the set looked different on every device, sat on the
 * baseline inconsistently, and carried colour that competed with the status
 * pills. These inherit `currentColor` and share one 1.6px stroke weight, so a
 * row reads as one typeface rather than a row of stickers.
 *
 * Panel feedback asked for a cleaner, larger-type interface for senior
 * residents; consistent monochrome glyphs at a slightly larger size do more for
 * legibility than the emoji did.
 */

export type IconName =
  | 'home' | 'megaphone' | 'document' | 'scale' | 'calendar'
  | 'pill' | 'student' | 'siren' | 'user' | 'paperclip'
  | 'clipboard' | 'book' | 'people' | 'folder' | 'box'
  | 'chart' | 'report' | 'staff' | 'shield' | 'robot'
  | 'settings' | 'map' | 'lock';

/** Single-path or multi-element bodies, drawn on a 24×24 grid. */
const PATHS: Record<IconName, string> = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/>',
  megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l9 5V5L6 10H4a1 1 0 0 0-1 1Z"/><path d="M18 8a4 4 0 0 1 0 8"/><path d="M6.5 14v4.5"/>',
  document: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7Z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h6"/>',
  scale: '<path d="M12 4v16"/><path d="M7 20h10"/><path d="M5 7h14"/><path d="M5 7 2.5 13h5Z"/><path d="M19 7l-2.5 6h5Z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4M16 3v4"/>',
  pill: '<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M9.2 9.2 14.8 14.8"/>',
  student: '<path d="M12 4 2.5 9 12 14l9.5-5Z"/><path d="M6.5 11.3V16c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-4.7"/><path d="M21.5 9v5"/>',
  siren: '<path d="M6 19v-6a6 6 0 0 1 12 0v6"/><path d="M4 19h16"/><path d="M12 3.5V2"/><path d="M19 6l1-1M5 6 4 5"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c0-3.6 3.4-5.6 7.5-5.6s7.5 2 7.5 5.6"/>',
  paperclip: '<path d="M20 11.5 12.4 19a4.5 4.5 0 0 1-6.4-6.4l8-8a3 3 0 0 1 4.3 4.3l-8 8a1.5 1.5 0 0 1-2.2-2.1l7.3-7.3"/>',
  clipboard: '<rect x="5.5" y="4.5" width="13" height="16" rx="2"/><path d="M9 4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5H9Z"/><path d="M9 12h6M9 16h4"/>',
  book: '<path d="M4 4.5h6a2.5 2.5 0 0 1 2.5 2.5v13A2 2 0 0 0 10.5 18H4Z"/><path d="M20 4.5h-6A2.5 2.5 0 0 0 11.5 7v13A2 2 0 0 1 13.5 18H20Z"/>',
  people: '<circle cx="9" cy="8.5" r="3.3"/><path d="M2.5 19.5c0-3.2 2.9-5 6.5-5s6.5 1.8 6.5 5"/><path d="M16 5.4a3.3 3.3 0 0 1 0 6.3"/><path d="M17.5 14.8c2.4.5 4 1.9 4 4.7"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
  box: '<path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5Z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><path d="M12 12v9"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7.5" y="12" width="3" height="5"/><rect x="13" y="8.5" width="3" height="8.5"/><rect x="18" y="14" width="2.5" height="3"/>',
  report: '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7Z"/><path d="M14 3v4h4"/><path d="M9 17v-3M12 17v-5M15 17v-2"/>',
  staff: '<circle cx="12" cy="7.5" r="3.3"/><path d="M5 20c0-3.5 3.2-5.5 7-5.5s7 2 7 5.5"/><path d="M15.5 17.5h5"/><path d="M18 15v5"/>',
  shield: '<path d="M12 3 5 6v6c0 4 3 7.3 7 9 4-1.7 7-5 7-9V6Z"/><path d="M9.3 12.2 11.3 14l3.6-3.8"/>',
  robot: '<rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M12 8V4.8"/><circle cx="12" cy="3.6" r="1.3"/><path d="M9 13v1.5M15 13v1.5"/><path d="M1.8 12.5v3M22.2 12.5v3"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.4M12 19.1v2.4M4.2 7.3l2 1.2M17.8 15.5l2 1.2M4.2 16.7l2-1.2M17.8 8.5l2-1.2"/>',
  map: '<path d="M9 4 3.5 6.3v13.4L9 17.4l6 2.3 5.5-2.3V4L15 6.3Z"/><path d="M9 4v13.4M15 6.3v13.4"/>',
  lock: '<rect x="4.8" y="10.5" width="14.4" height="10" rx="2"/><path d="M8.3 10.5V7.8a3.7 3.7 0 0 1 7.4 0v2.7"/>',
};

export function Icon({
  name,
  size = 19,
  style,
  title,
}: {
  name: IconName;
  size?: number;
  style?: CSSProperties;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Decorative beside a text label; screen readers read the label instead.
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      style={{ flexShrink: 0, display: 'block', ...style }}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title}</title>` : '') + PATHS[name] }}
    />
  );
}

// Purpose-built stroke icons; no external icon font.
const paths = {
  today:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2"/>',
  stack:
    '<rect x="6" y="7" width="14" height="14" rx="2"/><path d="M16 3H5a2 2 0 0 0-2 2v11"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z"/>',
  folder:
    '<path d="M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m5 9 7 7 7-7"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  refresh:
    '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  settings:
    '<path d="m9 3-.5 3-2 1.2-2.7-1L1.5 10l2.3 2-2.3 2 2.3 3.8 2.7-1 2 1.2.5 3h5l.5-3 2-1.2 2.7 1 2.3-3.8-2.3-2 2.3-2-2.3-3.8-2.7 1-2-1.2L14 3H9z"/><circle cx="11.5" cy="12" r="3"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/>',
  leaf: '<path d="M20 3C10 2 3 7 4 14c0 4 4 7 8 5 6-2 8-8 8-16zM4 21l11-12"/>',
  bulb: '<path d="M9 18h6M9 21h6M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2z"/>',
  book: '<path d="M12 5C9 3 5 3 2 4v16c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1v16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  edit: '<path d="m14 4 6 6M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15l-1 5z"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  play: '<path d="m8 4 12 8-12 8V4z"/>',
  shuffle:
    '<path d="M3 5h3l12 14h3M3 19h3l12-14h3M18 2l3 3-3 3M18 16l3 3-3 3"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11"/>',
  devices:
    '<rect x="3" y="3" width="12" height="11" rx="1.5"/><path d="M2 18h11M9 14v4"/><rect x="16" y="9" width="5" height="12" rx="1"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  tag: '<path d="M3 3h9l9 9-9 9-9-9V3z"/><circle cx="7.5" cy="7.5" r="1"/>',
};
export const icon = (name, cls = "") =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"${cls ? ` class="${cls}"` : ""}>${paths[name] ?? paths.stack}</svg>`;

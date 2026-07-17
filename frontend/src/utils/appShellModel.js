export function getRouteContext(pathname) {
  if (pathname === '/') return { section: 'Workspace', page: 'Analysis Hub' };
  if (pathname === '/new-analysis') return { section: 'Workspace', page: 'Configuration Hub' };
  if (pathname.startsWith('/analysis/')) return { section: 'Analysis', page: 'Scan Confidence' };
  if (pathname.startsWith('/report/')) return { section: 'Analysis', page: 'Confidence Report' };
  return { section: 'Workspace', page: 'Compliance Autopilot' };
}

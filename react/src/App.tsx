import { lazy, Suspense, useEffect, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Factory, CalendarClock, ClipboardList, ShieldCheck, KanbanSquare, Moon, Sun, RotateCcw } from 'lucide-react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { AppShell, type NavItem } from './AppShell';
import { LoadingState } from './components/LoadingState';
import { useTheme } from './theme';

const CommandPage = lazy(() => import('./pages/CommandPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const QualityPage = lazy(() => import('./pages/QualityPage'));
const FloorPage = lazy(() => import('./pages/FloorPage'));

export const PAGES: NavItem[] = [
  { id: 'command', label: 'Command', href: '/', icon: Factory },
  { id: 'schedule', label: 'Schedule', href: '/schedule', icon: CalendarClock },
  { id: 'orders', label: 'Orders', href: '/orders', icon: ClipboardList },
  { id: 'quality', label: 'Quality', href: '/quality', icon: ShieldCheck },
  { id: 'floor', label: 'Floor', href: '/floor', icon: KanbanSquare }
];

const PAGE_FOR: Record<string, typeof CommandPage> = {
  command: CommandPage, schedule: SchedulePage, orders: OrdersPage, quality: QualityPage, floor: FloorPage
};

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const current = PAGES.find(page => page.href === location.pathname) ?? PAGES[0];
  const Page = PAGE_FOR[current.id];

  useEffect(() => { document.title = `${current.label} · Precision Plant`; }, [current.label]);

  const onNavigate = (id: string, event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const page = PAGES.find(item => item.id === id);
    if (page) navigate(page.href);
  };

  return (
    <AppShell
      appName="Precision Plant"
      appSubtitle="Line, schedule, quality"
      logo={<Factory aria-hidden="true" />}
      items={PAGES}
      currentId={current.id}
      onNavigate={onNavigate}
      storageKey="precision-plant-nav-collapsed"
      headerEnd={
        <>
          <ButtonComponent cssClass="e-flat" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
          </ButtonComponent>
          <ButtonComponent cssClass="e-flat" disabled aria-label="Reset session">
            <RotateCcw size={16} aria-hidden="true" /> Reset
          </ButtonComponent>
        </>
      }
    >
      <Suspense key={current.id} fallback={<LoadingState label={`Loading ${current.label}…`} />}>
        <Page />
      </Suspense>
    </AppShell>
  );
}

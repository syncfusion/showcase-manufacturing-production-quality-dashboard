import { useMemo, useState } from 'react';
import {
  ScheduleComponent, ViewsDirective, ViewDirective, ResourcesDirective, ResourceDirective,
  Inject, TimelineViews
} from '@syncfusion/ej2-react-schedule';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { CalendarClock, PauseCircle, Users, TriangleAlert } from 'lucide-react';
import { PageHeading } from '../components/PageHeading';
import { useSession } from '../domain/session';
import type { Shift } from '../domain/types';
import { useTheme } from '../theme';
import { bandFor, palette, type Tone } from '../palette';

const SHIFT_START: Record<string, string> = { morning: '06:00', afternoon: '14:00', night: '22:00' };
const PLAN_BANDS = [
  { min: 95, tone: 'success' as const },
  { min: 90, tone: 'warning' as const },
  { tone: 'danger' as const }
];
const SCENARIO_AFTERNOON = '2026-10-20';

interface LineResource {
  id: string;
  text: string;
  cell: string;
  state: 'running' | 'held' | 'changeover';
}

interface ShiftEvent {
  Id: string;
  Subject: string;
  StartTime: Date;
  EndTime: Date;
  LineId: string;
  ShiftName: string;
  Lead: string;
  Crew: number;
  Planned: number;
  Good: number;
  Scrap: number;
  DowntimeMin: number;
  PlanPct: number;
}

function planPct(shift: Shift): number {
  if (shift.plannedUnits === 0) return 0;
  return Math.round((shift.goodUnits / shift.plannedUnits) * 100);
}

function shiftEnd(shift: Shift): Date {
  if (shift.shift === 'night') {
    const end = new Date(`${shift.date}T06:00:00`);
    end.setDate(end.getDate() + 1);
    return end;
  }
  const endAt = shift.shift === 'morning' ? '14:00' : '22:00';
  return new Date(`${shift.date}T${endAt}:00`);
}

function resourceHeader(props: { resourceData?: LineResource }) {
  const line = props.resourceData;
  if (!line) return null;
  const label = line.state === 'held' ? 'Held' : line.state === 'changeover' ? 'Changeover' : 'Running';
  const tone = line.state === 'held' ? 'e-badge-danger' : line.state === 'changeover' ? 'e-badge-warning' : 'e-badge-success';
  return (
    <div className="shift-resource">
      <span className="shift-resource__name">{line.text}</span>
      <span className="shift-resource__cell">{line.cell}</span>
      <span className={`e-badge ${tone}`}>{label}</span>
    </div>
  );
}

function eventTemplate(props: ShiftEvent) {
  return (
    <div className="shift-block">
      <span className="shift-block__title">{props.ShiftName} · {props.Lead}</span>
      <span className="shift-block__meta">{props.PlanPct}% of plan · {props.Crew} crew</span>
    </div>
  );
}

function quickInfoContent(props: ShiftEvent) {
  if (!props.Lead) return <div className="shift-quick" />;
  return (
    <dl className="shift-quick">
      <div><dt>Lead</dt><dd>{props.Lead}</dd></div>
      <div><dt>Crew</dt><dd>{props.Crew}</dd></div>
      <div><dt>Planned</dt><dd>{props.Planned}</dd></div>
      <div><dt>Good</dt><dd>{props.Good}</dd></div>
      <div><dt>Scrap</dt><dd>{props.Scrap}</dd></div>
      <div><dt>Downtime</dt><dd>{props.DowntimeMin} min</dd></div>
      <div><dt>Of plan</dt><dd>{props.PlanPct}%</dd></div>
    </dl>
  );
}

function quickInfoFooter() {
  return <span className="shift-quick__none" />;
}

export default function SchedulePage() {
  const { plant } = useSession();
  const { theme } = useTheme();
  const colors = palette(theme);
  const [lineId, setLineId] = useState('all');
  const resources = useMemo<LineResource[]>(
    () => plant.lines.map(line => ({ id: line.id, text: line.name, cell: line.cell, state: line.state })),
    [plant.lines]
  );
  const visibleResources = lineId === 'all' ? resources : resources.filter(line => line.id === lineId);
  const visibleShifts = useMemo(
    () => plant.shifts.filter(shift => lineId === 'all' || shift.lineId === lineId),
    [plant.shifts, lineId]
  );
  const events = useMemo<ShiftEvent[]>(
    () => visibleShifts.map(shift => ({
      Id: shift.id,
      Subject: `${shift.shiftName} · ${shift.lead}`,
      StartTime: new Date(`${shift.date}T${SHIFT_START[shift.shift]}:00`),
      EndTime: shiftEnd(shift),
      LineId: shift.lineId,
      ShiftName: shift.shiftName,
      Lead: shift.lead,
      Crew: shift.crew,
      Planned: shift.plannedUnits,
      Good: shift.goodUnits,
      Scrap: shift.scrapUnits,
      DowntimeMin: shift.downtimeMin,
      PlanPct: planPct(shift)
    })),
    [visibleShifts]
  );
  const underPlan = visibleShifts.filter(shift => planPct(shift) < 95).length;
  const held = visibleResources.filter(line => line.state === 'held').length;
  const crewNow = visibleShifts
    .filter(shift => shift.date === SCENARIO_AFTERNOON && shift.shift === 'afternoon')
    .reduce((sum, shift) => sum + shift.crew, 0);

  const onEventRendered = (args: { data: Record<string, unknown>; element: HTMLElement }) => {
    const tone: Tone = bandFor(Number(args.data.PlanPct), PLAN_BANDS).tone;
    args.element.style.backgroundColor = colors[tone];
    args.element.style.color = 'var(--color-sf-bg-primary)';
    args.element.style.borderColor = 'transparent';
    args.element.dataset.band = tone;
  };

  const onPopupOpen = (args: { type?: string; cancel: boolean; data?: { Id?: string } }) => {
    if (args.type === 'Editor' || args.type === 'DeleteAlert' || (!args.data?.Id && args.type === 'QuickInfo')) args.cancel = true;
  };

  return (
    <section className="page">
      <div className="page-head">
        <PageHeading title="Schedule" subtitle="Crew and shift coverage by line" />
      </div>
      <div className="kpi-row schedule-kpis">
        <article className="kpi e-card">
          <span className="kpi__icon" data-tone="info"><CalendarClock size={18} aria-hidden="true" /></span>
          <span className="kpi__body">
            <span className="kpi__title">Shifts scheduled</span>
            <strong className="kpi__value">{visibleShifts.length}</strong>
            <span className="kpi__note">Mon–Fri, filtered lines</span>
          </span>
        </article>
        <article className="kpi e-card">
          <span className="kpi__icon" data-tone="info"><Users size={18} aria-hidden="true" /></span>
          <span className="kpi__body">
            <span className="kpi__title">Crew this afternoon</span>
            <strong className="kpi__value">{crewNow}</strong>
            <span className="kpi__note">Oct 20, afternoon shift</span>
          </span>
        </article>
        <article className="kpi e-card">
          <span className="kpi__icon" data-tone={underPlan === 0 ? 'good' : 'watch'}><TriangleAlert size={18} aria-hidden="true" /></span>
          <span className="kpi__body">
            <span className="kpi__title">Under plan</span>
            <strong className="kpi__value">{underPlan}</strong>
            <span className="kpi__note">Below 95% of plan</span>
          </span>
        </article>
        <article className="kpi e-card">
          <span className="kpi__icon" data-tone={held === 0 ? 'good' : 'bad'}><PauseCircle size={18} aria-hidden="true" /></span>
          <span className="kpi__body">
            <span className="kpi__title">Lines held</span>
            <strong className="kpi__value">{held}</strong>
            <span className="kpi__note">{held === 0 ? 'No line is held' : 'Line state is held'}</span>
          </span>
        </article>
      </div>
      <div className="filter-bar e-card">
        <DropDownListComponent
          dataSource={[{ id: 'all', text: 'All lines' }, ...resources.map(line => ({ id: line.id, text: line.text }))]}
          fields={{ text: 'text', value: 'id' }}
          value={lineId}
          width="160px"
          placeholder="Line"
          id="schedule-line"
          htmlAttributes={{ 'aria-label': 'Line' }}
          created={() => document.getElementById('schedule-line')?.querySelector('input')?.setAttribute('aria-label', 'Line')}
          change={(args: { value?: string }) => setLineId(args.value || 'all')}
        />
        <ul className="shift-legend" aria-label="Shift result">
          <li><span className="shift-legend__swatch" data-tone="good" /> Good, 95% of plan and above</li>
          <li><span className="shift-legend__swatch" data-tone="watch" /> Watch, 90–95%</li>
          <li><span className="shift-legend__swatch" data-tone="bad" /> Below plan, under 90%</li>
        </ul>
      </div>
      <ScheduleComponent
        id="plant-schedule"
        key={`${lineId}-${theme}`}
        width="100%"
        height="640px"
        readonly
        selectedDate={new Date('2026-10-20T12:00:00')}
        minDate={new Date('2026-10-19T00:00:00')}
        maxDate={new Date('2026-10-24T06:00:00')}
        currentView="TimelineWeek"
        firstDayOfWeek={1}
        workDays={[1, 2, 3, 4, 5, 6]}
        showWeekend={false}
        startHour="00:00"
        endHour="24:00"
        workHours={{ highlight: true, start: '06:00', end: '22:00' }}
        timeFormat="h a"
        timeScale={{ interval: 120, slotCount: 1 }}
        eventSettings={{ dataSource: events, template: eventTemplate }}
        group={{ resources: ['Lines'] }}
        cssClass="plant-schedule"
        resourceHeaderTemplate={resourceHeader}
        quickInfoTemplates={{ content: quickInfoContent, footer: quickInfoFooter }}
        eventRendered={onEventRendered}
        cellClick={(args: { cancel: boolean }) => { args.cancel = true; }}
        popupOpen={onPopupOpen}
      >
        <ResourcesDirective>
          <ResourceDirective field="LineId" title="Line" name="Lines" dataSource={visibleResources} textField="text" idField="id" />
        </ResourcesDirective>
        <ViewsDirective>
          <ViewDirective option="TimelineDay" />
          <ViewDirective option="TimelineWeek" />
        </ViewsDirective>
        <Inject services={[TimelineViews]} />
      </ScheduleComponent>
    </section>
  );
}

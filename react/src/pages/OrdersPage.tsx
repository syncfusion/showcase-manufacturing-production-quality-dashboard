import { useEffect, useMemo, useRef, type ReactElement } from 'react';
import {
  GanttComponent, ColumnsDirective, ColumnDirective, Inject, Selection, CriticalPath, DayMarkers, Toolbar
} from '@syncfusion/ej2-react-gantt';
import {
  GridComponent, ColumnsDirective as GridColumns, ColumnDirective as GridColumn,
  Inject as GridInject, Filter, Sort, Group, Aggregate, ExcelExport, Page
} from '@syncfusion/ej2-react-grids';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { PageHeading } from '../components/PageHeading';
import { useSession } from '../domain/session';

interface GanttTask {
  TaskID: number;
  TaskName: string;
  customer: string;
  StartDate: Date;
  Duration: number;
  Progress: number;
  qty: number;
  due: string;
  status: string;
  isExpand?: boolean;
  BaselineStartDate?: Date;
  BaselineEndDate?: Date;
  subtasks?: GanttTask[];
}

interface StatusCarrier {
  status?: string;
  state?: string;
  taskData?: { status?: string; state?: string };
}

const STATUS: Record<string, { text: string; tone: string }> = {
  open: { text: 'On plan', tone: 'e-badge-success' },
  'at-risk': { text: 'At risk', tone: 'e-badge-warning' },
  late: { text: 'Late', tone: 'e-badge-danger' },
  complete: { text: 'Done', tone: 'e-badge-secondary' },
  queued: { text: 'Queued', tone: 'e-badge-info' },
  running: { text: 'Running', tone: 'e-badge-success' },
  held: { text: 'Hold', tone: 'e-badge-danger' },
  done: { text: 'Done', tone: 'e-badge-secondary' }
};

function statusValue(data: StatusCarrier | string | undefined): string {
  if (!data || typeof data === 'string') return typeof data === 'string' ? data : '';
  return data.status || data.taskData?.status || data.state || data.taskData?.state || '';
}

function statusTemplate(data: StatusCarrier | string): ReactElement {
  const raw = statusValue(data);
  const mapped = STATUS[raw];
  return <span className={`e-badge e-badge-pill order-status ${mapped?.tone ?? 'e-badge-info'}`}>{mapped?.text ?? raw}</span>;
}

function barLabel(props: {
  TaskName?: string;
  Progress?: number;
  taskData?: { TaskName?: string; Progress?: number };
  ganttProperties?: { taskName?: string; progress?: number };
}): ReactElement {
  const task = props.taskData ?? props;
  const name = task.TaskName || props.ganttProperties?.taskName || props.TaskName || '';
  const progress = task.Progress ?? props.ganttProperties?.progress ?? props.Progress ?? 0;
  return (
    <span className="gantt-bar-label">
      <span className="gantt-bar-label__name">{name}</span>
      <span className="gantt-bar-label__progress">{progress}%</span>
    </span>
  );
}

export default function OrdersPage() {
  const { plant } = useSession();
  const gantt = useRef<GanttComponent>(null);
  const fitted = useRef(false);
  useEffect(() => {
    const node = document.getElementById('order-line');
    const input = node instanceof HTMLInputElement ? node : node?.querySelector('input');
    input?.setAttribute('aria-label', 'Line');
  }, []);
  const tasks = useMemo(() => {
    let nextId = plant.orders.length + 1;
    return plant.orders.map((order, index): GanttTask => {
      const children = plant.jobs
        .filter(job => job.orderId === order.id)
        .map(job => ({
          TaskID: nextId++,
          TaskName: `${job.id} · ${job.station}`,
          customer: order.customer,
          StartDate: new Date('2026-10-20T12:00:00'),
          Duration: 4,
          Progress: Math.round((job.done / Math.max(job.qty, 1)) * 100),
          qty: job.qty,
          due: order.due,
          status: job.state
        }));
      return {
        TaskID: index + 1,
        TaskName: `${order.id} ${order.sku}`,
        customer: order.customer,
        StartDate: new Date('2026-10-19T12:00:00'),
        Duration: 16 + index * 4,
        Progress: Math.round((order.done / Math.max(order.qty, 1)) * 100),
        qty: order.qty,
        due: order.due,
        status: order.state,
        isExpand: true,
        BaselineStartDate: new Date('2026-10-19T12:00:00'),
        BaselineEndDate: new Date(`${order.due}T12:00:00`),
        ...(children.length ? { subtasks: children } : {})
      };
    });
  }, [plant.orders, plant.jobs]);
  const rows = plant.orders.map(order => ({
    ...order,
    remaining: order.qty - order.done
  }));

  return (
    <section className="page">
      <div className="page-head">
        <PageHeading title="Orders" subtitle="Promise dates against the hour plan" />
      </div>
      <div className="filter-bar e-card">
        <DropDownListComponent id="order-line" dataSource={plant.lines.map(item => ({ text: item.name, id: item.id }))} fields={{ text: 'text', value: 'id' }} placeholder="All lines" width="160px" htmlAttributes={{ 'aria-label': 'Line' }} created={() => {
          const node = document.getElementById('order-line');
          const input = node instanceof HTMLInputElement ? node : node?.querySelector('input');
          input?.setAttribute('aria-label', 'Line');
        }} />
      </div>
      <GanttComponent
        id="order-gantt"
        width="100%"
        dataSource={tasks}
        taskFields={{
          id: 'TaskID',
          name: 'TaskName',
          startDate: 'StartDate',
          duration: 'Duration',
          progress: 'Progress',
          baselineStartDate: 'BaselineStartDate',
          baselineEndDate: 'BaselineEndDate',
          child: 'subtasks',
          expandState: 'isExpand'
        }}
        ref={gantt}
        height="460px"
        rowHeight={40}
        treeColumnIndex={0}
        splitterSettings={{ position: '730px' }}
        dataBound={() => {
          if (fitted.current) return;
          fitted.current = true;
          gantt.current?.fitToProject();
        }}
        durationUnit="Hour"
        taskMode="Manual"
        includeWeekend
        renderBaseline
        enableCriticalPath
        toolbar={['ExpandAll', 'CollapseAll', 'ZoomIn', 'ZoomOut', 'ZoomToFit']}
        labelSettings={{ rightLabel: barLabel }}
        tooltipSettings={{ showTooltip: true }}
        timelineSettings={{
          timelineUnitSize: 52,
          topTier: { unit: 'Day', format: 'MMM dd' },
          bottomTier: { unit: 'Hour', format: 'h a' }
        }}
        eventMarkers={[{ day: new Date('2026-10-20T15:00:00'), label: 'Now', top: '0px' }]}
      >
        <ColumnsDirective>
          <ColumnDirective field="TaskName" headerText="Order" width="220" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="customer" headerText="Customer" width="140" clipMode="EllipsisWithTooltip" />
          <ColumnDirective field="due" headerText="Due" width="108" />
          <ColumnDirective field="qty" headerText="Qty" width="64" format="N0" />
          <ColumnDirective field="status" headerText="Status" width="112" template={statusTemplate} />
          <ColumnDirective field="Duration" headerText="Hours" width="80" />
        </ColumnsDirective>
        <Inject services={[Selection, CriticalPath, DayMarkers, Toolbar]} />
      </GanttComponent>
      <GridComponent dataSource={rows} allowFiltering allowSorting allowGrouping allowExcelExport allowPaging height="280">
        <GridColumns>
          <GridColumn field="id" headerText="Order" width="88" isPrimaryKey />
          <GridColumn field="customer" headerText="Customer" width="120" clipMode="EllipsisWithTooltip" />
          <GridColumn field="skuName" headerText="Product" width="140" clipMode="EllipsisWithTooltip" />
          <GridColumn field="qty" headerText="Qty" width="68" format="N0" textAlign="Right" />
          <GridColumn field="done" headerText="Done" width="68" format="N0" textAlign="Right" />
          <GridColumn field="due" headerText="Due" width="96" />
          <GridColumn field="state" headerText="Status" width="88" template={statusTemplate} />
        </GridColumns>
        <GridInject services={[Filter, Sort, Group, Aggregate, ExcelExport, Page]} />
      </GridComponent>
    </section>
  );
}

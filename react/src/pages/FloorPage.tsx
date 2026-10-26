import { useMemo, useRef, useState, type ReactElement } from 'react';
import { KanbanComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-react-kanban';
type FloorBoard = KanbanComponent;
import {
  DiagramComponent, NodeModel, ConnectorModel, Inject, DataBinding, HierarchicalTree,
  NodeConstraints, ConnectorConstraints, AnnotationConstraints, DiagramTools, SelectorConstraints,
  SnapConstraints, IClickEventArgs, IDropEventArgs, ILayoutUpdatedEventArgs
} from '@syncfusion/ej2-react-diagrams';
import { ToastComponent } from '@syncfusion/ej2-react-notifications';
import { PlantAssistant } from '../components/PlantAssistant';
import { PageHeading } from '../components/PageHeading';
import type { Job } from '../domain/types';
import { useSession } from '../domain/session';
import { useTheme } from '../theme';
import { palette } from '../palette';

const COLUMN: Record<string, string> = { queued: 'Queued', running: 'Running', held: 'Hold', done: 'Done' };
const TONE: Record<string, string> = { Queued: 'e-badge-info', Setup: 'e-badge-warning', Running: 'e-badge-success', Hold: 'e-badge-danger', Done: 'e-badge-secondary' };
const ROUTE = ['Station 1', 'Station 2', 'Station 3', 'Station 4', 'Pack'] as const;
const ROUTE_NODE = NodeConstraints.Select | NodeConstraints.PointerEvents | NodeConstraints.ReadOnly | NodeConstraints.InConnect | NodeConstraints.OutConnect;
const ROUTE_CONNECTOR = ConnectorConstraints.Select | ConnectorConstraints.PointerEvents | ConnectorConstraints.ReadOnly;

function routeStations(job: Job | undefined): string[] {
  const stations: string[] = [...ROUTE];
  if (job && !stations.includes(job.station)) stations.splice(stations.length - 1, 0, job.station);
  return stations;
}

interface FloorCard {
  operationId: string;
  status: string;
  orderId: string;
  customer: string;
  skuName: string;
  station: string;
  qty: number;
  done: number;
  heldReason: string;
  lineName: string;
}

function cardTemplate(props: FloorCard): ReactElement {
  return (
    <div className="floor-card">
      <p className="floor-card__order">{props.orderId} · {props.customer}</p>
      <p className="floor-card__product">{props.skuName}</p>
      <p className="floor-card__meta">{props.station} · {props.done} of {props.qty} done</p>
      <div className="floor-card__foot">
        <span className={`e-badge ${TONE[props.status] ?? 'e-badge-info'}`}>{props.status}</span>
      </div>
      {props.heldReason ? <p className="floor-card__hold">{props.heldReason}</p> : null}
    </div>
  );
}

export default function FloorPage() {
  const { plant } = useSession();
  const { theme } = useTheme();
  const colors = palette(theme);
  const boardRef = useRef<FloorBoard | null>(null);
  const diagramRef = useRef<DiagramComponent | null>(null);
  const fittedFor = useRef('');
  const [selected, setSelected] = useState(plant.jobs[0]?.orderId ?? '');
  const cards = useMemo(
    () => plant.jobs.map(job => {
      const order = plant.orders.find(item => item.id === job.orderId);
      const line = plant.lines.find(item => item.id === job.lineId);
      return {
        operationId: job.id,
        status: COLUMN[job.state] ?? 'Queued',
        orderId: job.orderId,
        customer: order?.customer ?? '',
        skuName: order?.skuName ?? job.sku,
        station: job.station,
        qty: job.qty,
        done: job.done,
        heldReason: job.heldReason ?? '',
        lineName: line?.name ?? job.lineId
      };
    }),
    [plant.jobs, plant.orders, plant.lines]
  );
  const route = useMemo(() => {
    const order = plant.orders.find(item => item.id === selected) ?? plant.orders[0];
    const job = plant.jobs.find(item => item.orderId === order?.id);
    const stations = routeStations(job);
    const current = job ? stations.indexOf(job.station) : -1;
    const ink = theme === 'dark' ? '#e5e7eb' : '#172033';
    const onLive = theme === 'dark' ? '#0b1220' : '#ffffff';
    const surface = theme === 'dark' ? '#1e293b' : '#f8fafc';
    const edge = theme === 'dark' ? '#475569' : '#d0d5dd';
    const liveFill = job?.state === 'held' ? colors.warning : job?.state === 'done' ? colors.success : colors.info;
    const shape = { type: 'Basic' as const, shape: 'Rectangle' as const, cornerRadius: 8 };
    const nodes: NodeModel[] = [
      {
        id: 'route-order',
        shape,
        addInfo: { operationId: job?.id ?? '' },
        annotations: [{
          content: order?.id ?? 'Order',
          constraints: AnnotationConstraints.ReadOnly,
          style: { color: '#ffffff', fontSize: 13, bold: true }
        }],
        style: { fill: theme === 'dark' ? '#475569' : '#1d2939', strokeColor: theme === 'dark' ? '#64748b' : '#1d2939', strokeWidth: 1 }
      },
      ...stations.map((station, index) => {
        const live = index === current;
        return {
          id: `route-step-${index}`,
          shape,
          addInfo: { operationId: job?.id ?? '' },
          annotations: [{
            content: station,
            constraints: AnnotationConstraints.ReadOnly,
            style: { color: live ? onLive : ink, fontSize: 12, bold: live }
          }],
          style: {
            fill: live ? liveFill : surface,
            strokeColor: live ? liveFill : edge,
            strokeWidth: live ? 2 : 1
          }
        };
      })
    ];
    const connectors: ConnectorModel[] = nodes.slice(1).map((node, index) => ({
      id: `route-link-${index}`,
      sourceID: nodes[index].id,
      targetID: node.id
    }));
    return { nodes, connectors };
  }, [plant.orders, plant.jobs, selected, theme, colors]);
  const selectCard = (operationId: string) => {
    const job = plant.jobs.find(item => item.id === operationId);
    if (job) setSelected(job.orderId);
    const card = document.querySelector(`#floor-board .e-kanban-content .e-card[data-id="${CSS.escape(operationId)}"]`);
    if (!(card instanceof HTMLElement) || !boardRef.current) return;
    if (!card.classList.contains('e-selection')) boardRef.current.actionModule.cardSelection(card, false, false);
    card.scrollIntoView({ block: 'nearest', inline: 'center' });
  };

  return (
    <section className="page">
      <div className="page-head">
        <PageHeading title="Floor" subtitle="Live jobs by stage and line" />
      </div>
      <article className="e-card panel">
        <div className="panel-toolbar">
          <h2 className="e-card-header-title">Route</h2>
          <button type="button" className="text-button" onClick={() => document.getElementById('floor-route')?.scrollIntoView({ block: 'nearest' })}>Show route</button>
        </div>
        <p className="panel-subtitle">Station 1 through Pack for the selected order. The filled step is the live job. Choosing a step selects that card.</p>
        <DiagramComponent
          id="floor-route"
          ref={diagramRef}
          key={`${selected}-${theme}`}
          width="100%"
          height="220px"
          pageSettings={{ background: { color: 'transparent' } }}
          tool={DiagramTools.SingleSelect}
          snapSettings={{ constraints: SnapConstraints.None }}
          selectedItems={{ constraints: SelectorConstraints.None }}
          scrollSettings={{ scrollLimit: 'Diagram', minZoom: 0.25, maxZoom: 1 }}
          layout={{
            type: 'HierarchicalTree',
            orientation: 'LeftToRight',
            horizontalSpacing: 28,
            verticalSpacing: 24,
            margin: { left: 8, top: 12, right: 8, bottom: 12 }
          }}
          nodes={route.nodes}
          connectors={route.connectors}
          getNodeDefaults={(node: NodeModel) => {
            node.width = 124;
            node.height = 52;
            node.constraints = ROUTE_NODE;
            return node;
          }}
          getConnectorDefaults={(connector: ConnectorModel) => {
            connector.type = 'Orthogonal';
            connector.constraints = ROUTE_CONNECTOR;
            connector.style = { strokeColor: colors.neutral, strokeWidth: 1.5 };
            connector.targetDecorator = {
              shape: 'Arrow',
              width: 8,
              height: 8,
              style: { fill: colors.neutral, strokeColor: colors.neutral }
            };
            return connector;
          }}
          click={(args: IClickEventArgs) => {
            const operationId = ((args.actualObject as NodeModel).addInfo as { operationId?: string } | undefined)?.operationId;
            if (operationId) selectCard(operationId);
          }}
          drop={(args: IDropEventArgs) => { args.cancel = true; }}
          layoutUpdated={(args: ILayoutUpdatedEventArgs) => {
            if (args.state !== 'Completed') return;
            const diagram = diagramRef.current;
            if (!diagram) return;
            const token = `${selected}-${theme}`;
            if (fittedFor.current === token) return;
            const placed = diagram.nodes?.some(node => (node.offsetX ?? 0) > 1 || (node.offsetY ?? 0) > 1);
            if (!placed) return;
            fittedFor.current = token;
            diagram.fitToPage({
              mode: 'Width',
              region: 'Content',
              margin: { left: 8, right: 8, top: 4, bottom: 4 },
              canZoomIn: false,
              canZoomOut: true
            });
          }}
        >
          <Inject services={[DataBinding, HierarchicalTree]} />
        </DiagramComponent>
      </article>
      <div className="floor-board-scroll">
      <KanbanComponent
        id="floor-board"
        ref={boardRef}
        width="100%"
        height="640px"
        keyField="status"
        dataSource={cards}
        cardSettings={{ headerField: 'operationId', contentField: 'skuName', template: cardTemplate }}
        dialogSettings={{
          fields: [
            { key: 'operationId', text: 'Operation', type: 'TextBox' },
            { key: 'orderId', text: 'Order', type: 'TextBox' },
            { key: 'customer', text: 'Customer', type: 'TextBox' },
            { key: 'skuName', text: 'Product', type: 'TextBox' },
            { key: 'station', text: 'Station', type: 'TextBox' },
            { key: 'status', text: 'Status', type: 'DropDown' },
            { key: 'qty', text: 'Quantity', type: 'Numeric' },
            { key: 'done', text: 'Done', type: 'Numeric' },
            { key: 'heldReason', text: 'Hold reason', type: 'TextBox' }
          ]
        }}
        swimlaneSettings={{ keyField: 'lineName', textField: 'lineName' }}
        cardClick={args => {
          const job = plant.jobs.find(item => item.id === args.data?.operationId);
          if (job) setSelected(job.orderId);
        }}
      >
        <ColumnsDirective>
          <ColumnDirective headerText="Queued" keyField="Queued" transitionColumns={['Setup']} />
          <ColumnDirective headerText="Setup" keyField="Setup" transitionColumns={['Queued', 'Running']} />
          <ColumnDirective headerText="Running" keyField="Running" transitionColumns={['Hold', 'Done']} />
          <ColumnDirective headerText="Hold" keyField="Hold" transitionColumns={['Running']} />
          <ColumnDirective headerText="Done" keyField="Done" transitionColumns={['Done']} />
        </ColumnsDirective>
      </KanbanComponent>
      </div>
      <ToastComponent id="floor-toast" title="Floor" />
      <PlantAssistant />
    </section>
  );
}

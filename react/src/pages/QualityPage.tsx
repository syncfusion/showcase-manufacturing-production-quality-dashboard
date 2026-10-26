import { useMemo } from 'react';
import {
  PivotViewComponent, Inject, FieldList, CalculatedField, GroupingBar, PivotChart, DrillThrough,
  Toolbar, PDFExport, ExcelExport
} from '@syncfusion/ej2-react-pivotview';
import {
  ChartComponent, SeriesCollectionDirective, SeriesDirective, Inject as ChartInject,
  ColumnSeries, StackingColumnSeries, LineSeries, Category, Tooltip, Legend, DataLabel,
  AxesDirective, AxisDirective,
  BulletChartComponent, BulletRangeCollectionDirective, BulletRangeDirective, BulletTooltip
} from '@syncfusion/ej2-react-charts';
import {
  GridComponent, ColumnsDirective, ColumnDirective, Inject as GridInject, Page
} from '@syncfusion/ej2-react-grids';
import { PlantAssistant } from '../components/PlantAssistant';
import { PageHeading } from '../components/PageHeading';
import { downtimeByLine, paretoPoints } from '../domain/selectors';
import { useSession } from '../domain/session';
import { useTheme } from '../theme';
import { chartTheme, palette } from '../palette';

export default function QualityPage() {
  const { plant } = useSession();
  const { theme } = useTheme();
  const colors = palette(theme);
  const frame = chartTheme(theme);
  const pareto = useMemo(() => paretoPoints(plant), [plant]);
  const downtime = useMemo(() => downtimeByLine(plant), [plant]);
  const good = plant.shifts.reduce((sum, shift) => sum + shift.goodUnits, 0);
  const made = plant.shifts.reduce((sum, shift) => sum + shift.goodUnits + shift.scrapUnits, 0);
  const yieldPct = made === 0 ? 0 : Math.round((good / made) * 1000) / 10;
  const top = pareto[0];
  const labelChip = theme === 'dark' ? '#111827' : '#ffffff';
  const labelEdge = theme === 'dark' ? '#334155' : '#e5e9f0';
  const labelInk = theme === 'dark' ? '#e5e7eb' : '#172033';
  const pointLabel = (format: string) => ({
    visible: true,
    position: 'Top' as const,
    format,
    fill: labelChip,
    border: { width: 1, color: labelEdge },
    rx: 4,
    ry: 4,
    margin: { left: 3, right: 3, top: 1, bottom: 1 },
    font: { color: labelInk, size: '11px', fontWeight: '600' },
    labelIntersectAction: 'None' as const
  });

  return (
    <section className="page">
      <div className="page-head">
        <PageHeading title="Quality" subtitle="Defects, downtime, and yield" />
      </div>
      <article className="e-card panel quality-pivot">
        <div className="panel-toolbar">
          <h2 className="e-card-header-title">Defect pivot</h2>
          <button type="button" className="text-button" onClick={() => document.getElementById('defect-rows')?.scrollIntoView({ block: 'start' })}>Drill through</button>
        </div>
        <p className="panel-subtitle">Count by defect code, line, and day. The chart uses the same pivot.</p>
        <PivotViewComponent
          id="defect-pivot"
          width="100%"
          height="520"
          dataSourceSettings={{
            dataSource: plant.defects as unknown as Record<string, string | number>[],
            rows: [{ name: 'type', caption: 'Defect code' }, { name: 'lineId', caption: 'Line' }],
            columns: [{ name: 'date', caption: 'Date' }],
            values: [{ name: 'count', caption: 'Count' }],
            formatSettings: [{ name: 'count', format: 'N0' }]
          }}
          displayOption={{ view: 'Both', primary: 'Table' }}
          chartSettings={{
            title: 'Defect count by code and line',
            chartSeries: { type: 'Column' },
            primaryXAxis: { title: 'Defect code' },
            primaryYAxis: { title: 'Count' },
            tooltip: { enable: true },
            legendSettings: { visible: true, padding: 16, textWrap: 'Wrap', maximumLabelWidth: 120 },
            palettes: [...colors.series],
            theme: frame
          }}
          chartTypes={['Column', 'Bar', 'Line', 'StackingColumn', 'StackingBar', 'Area']}
          showToolbar
          toolbar={['Grid', 'Chart', 'Export', 'SubTotal', 'GrandTotal', 'FieldList']}
          allowExcelExport
          allowPdfExport
          allowDrillThrough
          showFieldList
          showGroupingBar
          dataBound={() => {
            const park = () => {
              const chart = document.getElementById('defect-pivot_chart');
              if (!chart || chart.parentElement?.id === 'defect-pivot-chart-host') return;
              const host = document.createElement('div');
              host.id = 'defect-pivot-chart-host';
              chart.before(host);
              host.append(chart);
            };
            park();
            requestAnimationFrame(park);
          }}
        >
          <Inject services={[FieldList, CalculatedField, GroupingBar, PivotChart, DrillThrough, Toolbar, PDFExport, ExcelExport]} />
        </PivotViewComponent>
      </article>
      <div className="chart-grid quality-charts">
        <article className="e-card panel">
          <h2 className="e-card-header-title">First-pass yield</h2>
          <p className="panel-subtitle">{yieldPct}% good against a 98% target. Watch from 95, good at 98 and above.</p>
          <BulletChartComponent
            id="first-pass-yield"
            width="100%"
            height="120px"
            title="Yield"
            titleStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#101828', size: '13px', fontWeight: '600' }}
            valueField="value"
            targetField="target"
            categoryField="category"
            minimum={90}
            maximum={100}
            labelFormat="{value}%"
            theme={frame}
            tooltip={{ enable: true }}
            dataSource={[{ value: yieldPct, target: 98, category: 'Good count / total count' }]}
          >
            <BulletRangeCollectionDirective>
              <BulletRangeDirective end={95} color={colors.danger} />
              <BulletRangeDirective end={98} color={colors.warning} />
              <BulletRangeDirective end={100} color={colors.success} />
            </BulletRangeCollectionDirective>
            <Inject services={[BulletTooltip]} />
          </BulletChartComponent>
        </article>
        <article className="e-card panel">
          <h2 className="e-card-header-title">Defect Pareto</h2>
          <p className="panel-subtitle">{top ? `${top.code} is ${top.share}% of defects` : 'No defects in this period'}</p>
          <div className="e-card-content">
            <ChartComponent
              key={theme}
              width="100%"
              height="320px"
              theme={frame}
              palettes={[colors.series[0], colors.series[1]]}
              primaryXAxis={{ valueType: 'Category', title: 'Defect code', labelIntersectAction: 'Rotate45' }}
              primaryYAxis={{ title: 'Defect count', labelFormat: '{value}' }}
              tooltip={{ enable: true }}
              legendSettings={{ visible: true, position: 'Bottom', padding: 16 }}
            >
              <AxesDirective>
                <AxisDirective name="share" opposedPosition title="Cumulative share" minimum={0} maximum={100} labelFormat="{value}%" />
              </AxesDirective>
              <ChartInject services={[ColumnSeries, LineSeries, Category, Tooltip, Legend, DataLabel]} />
              <SeriesCollectionDirective>
                <SeriesDirective dataSource={pareto} xName="code" yName="count" type="Column" name="Count" fill={colors.series[0]} marker={{ dataLabel: pointLabel('{value}') }} />
                <SeriesDirective dataSource={pareto} xName="code" yName="cumulative" yAxisName="share" type="Line" name="Cumulative %" fill={colors.series[1]} marker={{ visible: true, dataLabel: pointLabel('{value}%') }} />
              </SeriesCollectionDirective>
            </ChartComponent>
          </div>
        </article>
        <article className="e-card panel">
          <h2 className="e-card-header-title">Downtime by reason</h2>
          <p className="panel-subtitle">Hours lost on each line during the week</p>
          <div className="e-card-content">
            <ChartComponent
              key={theme}
              width="100%"
              height="320px"
              theme={frame}
              palettes={[colors.series[0], colors.series[1], colors.series[4], colors.series[2]]}
              primaryXAxis={{ valueType: 'Category', title: 'Line', majorGridLines: { width: 0 } }}
              primaryYAxis={{ title: 'Hours', labelFormat: '{value}' }}
              tooltip={{ enable: true, format: '${series.name}: ${point.y} h' }}
              legendSettings={{ visible: true, position: 'Bottom' }}
            >
              <ChartInject services={[StackingColumnSeries, Category, Tooltip, Legend, DataLabel]} />
              <SeriesCollectionDirective>
                <SeriesDirective dataSource={downtime} xName="line" yName="Changeover" type="StackingColumn" name="Changeover" fill={colors.series[0]} marker={{ dataLabel: { ...pointLabel('{value}'), position: 'Middle', showZero: false } }} />
                <SeriesDirective dataSource={downtime} xName="line" yName="Breakdown" type="StackingColumn" name="Breakdown" fill={colors.series[1]} marker={{ dataLabel: { ...pointLabel('{value}'), position: 'Middle', showZero: false } }} />
                <SeriesDirective dataSource={downtime} xName="line" yName="Material" type="StackingColumn" name="Material" fill={colors.series[4]} marker={{ dataLabel: { ...pointLabel('{value}'), position: 'Middle', showZero: false } }} />
                <SeriesDirective dataSource={downtime} xName="line" yName="Quality hold" type="StackingColumn" name="Quality hold" fill={colors.series[2]} marker={{ dataLabel: { ...pointLabel('{value}'), position: 'Middle', showZero: false } }} />
              </SeriesCollectionDirective>
            </ChartComponent>
          </div>
        </article>
      </div>
      <article className="e-card panel" id="defect-rows">
        <h2 className="e-card-header-title">Defect rows</h2>
        <p className="panel-subtitle">Each defect record behind the pivot.</p>
        <GridComponent dataSource={plant.defects} allowPaging pageSettings={{ pageSize: 8 }} height="280">
          <ColumnsDirective>
            <ColumnDirective field="date" headerText="Date" width="110" />
            <ColumnDirective field="type" headerText="Code" width="90" />
            <ColumnDirective field="lineId" headerText="Line" width="90" />
            <ColumnDirective field="station" headerText="Station" width="140" />
            <ColumnDirective field="count" headerText="Count" width="90" format="N0" textAlign="Right" />
            <ColumnDirective field="disposition" headerText="Disposition" width="130" />
          </ColumnsDirective>
          <GridInject services={[Page]} />
        </GridComponent>
      </article>
      <PlantAssistant />
    </section>
  );
}

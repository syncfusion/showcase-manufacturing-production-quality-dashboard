import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gauge, CalendarCheck, PauseCircle, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import {
  BulletChartComponent, BulletRangeCollectionDirective, BulletRangeDirective, BulletTooltip,
  ChartComponent, SeriesCollectionDirective, SeriesDirective, Inject,
  ColumnSeries, WaterfallSeries, Category, Tooltip, DataLabel, Legend
} from '@syncfusion/ej2-react-charts';
import { ListViewComponent } from '@syncfusion/ej2-react-lists';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { SkeletonComponent } from '@syncfusion/ej2-react-notifications';
import { DateRangePickerComponent } from '@syncfusion/ej2-react-calendars';
import type { SelectEventArgs } from '@syncfusion/ej2-lists';
import { attentionItems, lineStatus, plantOee, previousDay, scenarioDay, scrapCost } from '../domain/selectors';
import { money } from '../domain/format';
import { useSession } from '../domain/session';
import { PlantAssistant } from '../components/PlantAssistant';
import { PageHeading } from '../components/PageHeading';
import { useTheme } from '../theme';
import { chartTheme as themeName, palette } from '../palette';

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function band(value: number, good: number, watch: number): 'good' | 'watch' | 'bad' {
  if (value >= good) return 'good';
  if (value >= watch) return 'watch';
  return 'bad';
}

function targetGap(actual: number, target: number): { delta: number; text: string } {
  const points = (actual - target) * 100;
  const size = Math.abs(points).toFixed(1);
  const goal = `${Math.round(target * 100)}% target`;
  if (points < -0.05) return { delta: points, text: `${size} pts below ${goal}` };
  if (points > 0.05) return { delta: points, text: `${size} pts above ${goal}` };
  return { delta: 0, text: `On the ${goal}` };
}

function Delta({ delta, higherIsBetter, text }: { delta: number; higherIsBetter: boolean; text: string }) {
  const flat = Math.abs(delta) < 0.05;
  const good = flat || (higherIsBetter ? delta > 0 : delta < 0);
  const Icon = flat ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="kpi__delta" data-tone={flat ? 'flat' : good ? 'good' : 'bad'}>
      <Icon size={14} aria-hidden="true" />
      <span>{text}</span>
    </span>
  );
}

export default function CommandPage() {
  const { plant } = useSession();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const charts = themeName(theme);
  const colors = palette(theme);
  const oee = useMemo(() => plantOee(plant), [plant]);
  const lines = useMemo(() => lineStatus(plant), [plant]);
  const attention = useMemo(() => attentionItems(plant), [plant]);
  const holds = plant.lines.filter(line => line.state === 'held').length;
  const day = scenarioDay(plant);
  const weekScrap = scrapCost(plant);
  const scrapGap = scrapCost(plant, day) - scrapCost(plant, previousDay(day));

  const throughput = lines.map(row => ({ line: row.line.name, good: row.line.goodThisHour, target: row.line.targetThisHour }));
  const availability = oee.availability * 100;
  const afterSpeed = oee.availability * oee.performance * 100;
  const oeePoints = Math.round(oee.oee * 1000) / 10;
  const loss = [
    { stage: 'Planned', value: 100 },
    { stage: 'Availability', value: Math.round((availability - 100) * 10) / 10 },
    { stage: 'Performance', value: Math.round((afterSpeed - availability) * 10) / 10 },
    { stage: 'Quality', value: Math.round((oeePoints - afterSpeed) * 10) / 10 },
    { stage: 'OEE', value: oeePoints }
  ];

  const oeeTone = band(oee.oee, 0.85, 0.75);
  const adherenceTone = band(oee.performance, 0.95, 0.9);
  const oeeGap = targetGap(oee.oee, 0.85);
  const adherenceGap = targetGap(oee.performance, 0.95);
  const scrapText = scrapGap > 0
    ? `${money(scrapGap)} above prior day`
    : scrapGap < 0
      ? `${money(Math.abs(scrapGap))} below prior day`
      : 'Same as prior day';

  return (
    <section className="page command">
      <div className="page-head">
        <PageHeading title="Command" subtitle="Line status for the week" />
      </div>
      <div className="filter-bar e-card">
        <DateRangePickerComponent startDate={new Date('2026-10-19')} endDate={new Date('2026-10-25')} format="MM/dd/yyyy" placeholder="Period" width="230px" htmlAttributes={{ 'aria-label': 'Reporting period' }} />
        <DropDownListComponent id="command-line" dataSource={[{ text: 'All lines', id: 'all' }, ...plant.lines.map(line => ({ text: line.name, id: line.id }))]} fields={{ text: 'text', value: 'id' }} value="all" width="160px" placeholder="Line" htmlAttributes={{ 'aria-label': 'Line' }} created={() => document.getElementById('command-line')?.querySelector('input')?.setAttribute('aria-label', 'Line')} />
      </div>
      <SkeletonComponent shape="Rectangle" width="100%" height="8px" visible={false} />
      <div className="kpi-row">
        <button type="button" className="kpi e-card" onClick={() => navigate('/?line=off-band')}>
          <span className="kpi__icon" data-tone={oeeTone}><Gauge size={18} aria-hidden="true" /></span>
          <span className="kpi__body">
            <span className="kpi__title">Plant OEE</span>
            <strong className="kpi__value">{percent(oee.oee)}</strong>
            <Delta delta={oeeGap.delta} higherIsBetter text={oeeGap.text} />
          </span>
        </button>
        <button type="button" className="kpi e-card" onClick={() => navigate('/?line=off-band')}>
          <span className="kpi__icon" data-tone={adherenceTone}><CalendarCheck size={18} aria-hidden="true" /></span>
          <span className="kpi__body">
            <span className="kpi__title">Schedule adherence</span>
            <strong className="kpi__value">{percent(oee.performance)}</strong>
            <Delta delta={adherenceGap.delta} higherIsBetter text={adherenceGap.text} />
          </span>
        </button>
        <button type="button" className="kpi e-card" onClick={() => navigate('/floor')}>
          <span className="kpi__icon" data-tone={holds === 0 ? 'good' : 'bad'}><PauseCircle size={18} aria-hidden="true" /></span>
          <span className="kpi__body">
            <span className="kpi__title">Open holds</span>
            <strong className="kpi__value">{holds}</strong>
            <Delta delta={holds} higherIsBetter={false} text={holds === 0 ? 'At the zero target' : `${holds} above zero`} />
          </span>
        </button>
        <button type="button" className="kpi e-card" onClick={() => navigate('/quality')}>
          <span className="kpi__icon" data-tone="watch"><Trash2 size={18} aria-hidden="true" /></span>
          <span className="kpi__body">
            <span className="kpi__title">Scrap cost</span>
            <strong className="kpi__value">{money(weekScrap)}</strong>
            <span className="kpi__note">Week total</span>
            <Delta delta={scrapGap} higherIsBetter={false} text={scrapText} />
          </span>
        </button>
      </div>
      <div className="panel-grid">
        <article className="e-card panel">
          <h2 className="e-card-header-title">Line OEE</h2>
          <p className="panel-subtitle">Actual against the 85% target. Bad under 75, Watch 75–85, Good at 85 and above.</p>
          <div className="e-card-content">
            {lines.map(row => (
              <div className="bullet-host" key={row.line.id}>
              <BulletChartComponent
                id={`line-oee-${row.line.id}`}
                width="100%"
                height="96px"
                title={row.line.name}
                titleStyle={{ color: theme === 'dark' ? '#e5e7eb' : '#101828', size: '13px', fontWeight: '600' }}
                minimum={0}
                maximum={100}
                valueField="value"
                targetField="target"
                categoryField="category"
                labelFormat="{value}%"
                theme={charts}
                tooltip={{ enable: true }}
                dataSource={[{ value: Math.round(row.attainment * 100), target: 85, category: row.line.name }]}
              >
                <BulletRangeCollectionDirective>
                  <BulletRangeDirective end={75} color={colors.danger} />
                  <BulletRangeDirective end={85} color={colors.warning} />
                  <BulletRangeDirective end={100} color={colors.success} />
                </BulletRangeCollectionDirective>
                <Inject services={[BulletTooltip]} />
              </BulletChartComponent>
              </div>
            ))}
          </div>
        </article>
        <article className="e-card panel">
          <h2 className="e-card-header-title">Throughput this hour</h2>
          <p className="panel-subtitle">Good units versus each line's hour target</p>
          <div className="e-card-content">
            <ChartComponent
              key={theme}
              width="100%"
              height="300px"
              theme={charts}
              palettes={[colors.series[0], colors.series[1]]}
              primaryXAxis={{ valueType: 'Category', title: 'Line', majorGridLines: { width: 0 } }}
              primaryYAxis={{ title: 'Units', labelFormat: '{value}' }}
              tooltip={{ enable: true, format: '${series.name}: ${point.y} units' }}
              legendSettings={{ visible: true, position: 'Bottom' }}
            >
              <Inject services={[ColumnSeries, Category, Tooltip, Legend, DataLabel]} />
              <SeriesCollectionDirective>
                <SeriesDirective dataSource={throughput} xName="line" yName="good" type="Column" name="Good" fill={colors.series[0]} marker={{ dataLabel: { visible: true, format: '{value}' } }} />
                <SeriesDirective dataSource={throughput} xName="line" yName="target" type="Column" name="Target" fill={colors.series[1]} marker={{ dataLabel: { visible: true, format: '{value}' } }} />
              </SeriesCollectionDirective>
            </ChartComponent>
          </div>
        </article>
        <article className="e-card panel">
          <h2 className="e-card-header-title">Where the OEE points went</h2>
          <p className="panel-subtitle">Availability, then speed, then quality, taken off a full run</p>
          <div className="e-card-content">
            <ChartComponent
              key={theme}
              width="100%"
              height="300px"
              theme={charts}
              primaryXAxis={{ valueType: 'Category', title: 'Loss step', majorGridLines: { width: 0 } }}
              primaryYAxis={{ title: 'Percentage points', labelFormat: '{value}' }}
              tooltip={{ enable: true, format: '${point.x}: ${point.y} pts' }}
              legendSettings={{ visible: false }}
            >
              <Inject services={[WaterfallSeries, Category, DataLabel, Tooltip]} />
              <SeriesCollectionDirective>
                <SeriesDirective
                  dataSource={loss}
                  xName="stage"
                  yName="value"
                  type="Waterfall"
                  name="Points"
                  sumIndexes={[4]}
                  fill={colors.series[2]}
                  negativeFillColor={colors.series[3]}
                  summaryFillColor={colors.series[0]}
                  connector={{ color: colors.neutral, width: 1 }}
                  marker={{ dataLabel: { visible: true, format: '{value}' } }}
                />
              </SeriesCollectionDirective>
            </ChartComponent>
          </div>
        </article>
        <article className="e-card panel">
          <h2 className="e-card-header-title">Attention</h2>
          <p className="panel-subtitle">Orders and lines that need a decision before the shift ends.</p>
          <div className="e-card-content">
            <ListViewComponent
              cssClass="e-list-template attention-list"
              dataSource={attention as unknown as { [key: string]: Object }[]}
              fields={{ text: 'title', id: 'id' }}
              template={(item: { id?: string; label: string; tone: string; title: string; detail: string }) => (
                <div className="attention-row">
                  <span className={`e-badge ${item.tone === 'bad' ? 'e-badge-danger' : 'e-badge-warning'}`}>{item.label}</span>
                  <div className="attention-row__text">
                    <strong>{item.title}</strong>
                    <p>{item.detail}</p>
                    {item.label === 'Late' ? (
                      <button
                        type="button"
                        className="text-button"
                        onClick={event => {
                          event.stopPropagation();
                          const target = attention.find(row => row.id === item.id);
                          if (target) navigate(target.href);
                        }}
                      >Review late order</button>
                    ) : null}
                  </div>
                </div>
              )}
              select={(item: SelectEventArgs) => {
                const id = String((item.data as { id?: string } | undefined)?.id ?? '');
                const target = attention.find(row => row.id === id);
                if (target) navigate(target.href);
              }}
            />
          </div>
        </article>
      </div>
      <PlantAssistant />
    </section>
  );
}

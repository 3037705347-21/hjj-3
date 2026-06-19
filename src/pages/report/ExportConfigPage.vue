<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import ReportLayout from '@/components/report/ReportLayout.vue';
import ReportMetricCard from '@/components/report/ReportMetricCard.vue';
import type {
  ExportConfig,
  ReportGranularity,
  CoreMetrics,
  DailyReportData,
  WeeklyReportData,
  MonthlyReportData,
  AbnormalReasonDistribution,
  TeamEfficiency,
  BerthPerformance,
  KeyShipRecord,
} from '@/types';
import { REPORT_GRANULARITY_LABELS, ABNORMAL_REASON_CATEGORY_LABELS } from '@/types';
import {
  calculateDailyReport,
  calculateWeeklyReport,
  calculateMonthlyReport,
  CORE_METRIC_LABELS,
  CORE_METRIC_UNITS,
  startOfDay,
  endOfDay,
} from '@/utils/analytics';
import {
  FileSpreadsheet,
  FileText,
  FileJson,
  Download,
  Trash2,
  Eye,
  Clock,
  Calendar,
  Save,
  RefreshCw,
  Settings,
  PlusCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Archive,
  BarChart3,
  Users,
  Anchor,
  Shield,
} from 'lucide-vue-next';
import { format as formatDate } from 'date-fns';
import { zhCN } from 'date-fns/locale';

type ExportFormat = 'excel' | 'pdf' | 'csv' | 'json';

const STORAGE_KEY = 'report_export_history';

const configName = ref('');
const granularity = ref<ReportGranularity>('daily');
const startDate = ref(formatDate(new Date(), 'yyyy-MM-dd'));
const endDate = ref(formatDate(new Date(), 'yyyy-MM-dd'));
const exportFormat = ref<ExportFormat>('excel');
const includeCoreMetrics = ref(true);
const includeAbnormalReasons = ref(true);
const includeTeamEfficiency = ref(true);
const includeBerthPerformance = ref(true);
const includeKeyShips = ref(true);

const allMetricKeys = Object.keys(CORE_METRIC_LABELS) as (keyof CoreMetrics)[];
const selectedMetrics = ref<(keyof CoreMetrics)[]>([...allMetricKeys]);

const exportHistory = ref<ExportConfig[]>([]);
const expandedDetailId = ref<string | null>(null);
const isExporting = ref(false);

watch(includeCoreMetrics, (val) => {
  if (val && selectedMetrics.value.length === 0) {
    selectedMetrics.value = [...allMetricKeys];
  }
});

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      exportHistory.value = parsed.map((item: ExportConfig) => ({
        ...item,
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        createdAt: new Date(item.createdAt),
        snapshotData: reviveSnapshotData(item.snapshotData),
      }));
    }
  } catch (e) {
    console.error('Failed to load export history:', e);
    exportHistory.value = [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exportHistory.value));
  } catch (e) {
    console.error('Failed to save export history:', e);
  }
}

function reviveSnapshotData(data: any): DailyReportData | WeeklyReportData | MonthlyReportData | undefined {
  if (!data) return undefined;
  if ('date' in data) {
    return {
      ...(data as DailyReportData),
      date: new Date(data.date),
      keyShips: (data.keyShips || []).map((s: KeyShipRecord) => reviveKeyShip(s)),
    } as DailyReportData;
  }
  if ('weekStart' in data) {
    return {
      ...(data as WeeklyReportData),
      weekStart: new Date(data.weekStart),
      weekEnd: new Date(data.weekEnd),
      dailyBreakdown: (data.dailyBreakdown || []).map((d: any) => ({ ...d, date: new Date(d.date) })),
      abnormalTrend: (data.abnormalTrend || []).map((t: any) => ({
        ...t,
        dailyCounts: t.dailyCounts.map((c: any) => ({ ...c, date: new Date(c.date) })),
      })),
      keyShipsSummary: (data.keyShipsSummary || []).map((s: KeyShipRecord) => reviveKeyShip(s)),
    } as WeeklyReportData;
  }
  if ('month' in data) {
    return {
      ...(data as MonthlyReportData),
      month: new Date(data.month),
      weeklyBreakdown: (data.weeklyBreakdown || []).map((d: any) => ({ ...d, weekStart: new Date(d.weekStart) })),
      teamMonthlySummary: data.teamMonthlySummary || [],
      berthMonthlySummary: data.berthMonthlySummary || [],
      topIssues: data.topIssues || [],
    } as MonthlyReportData;
  }
  return data;
}

function reviveKeyShip(s: KeyShipRecord): KeyShipRecord {
  return {
    ...s,
    plannedBerthing: new Date(s.plannedBerthing),
    actualBerthing: s.actualBerthing ? new Date(s.actualBerthing) : undefined,
    plannedDeparture: new Date(s.plannedDeparture),
    actualDeparture: s.actualDeparture ? new Date(s.actualDeparture) : undefined,
  };
}

onMounted(() => {
  loadHistory();
});

const coreMetricsFromSnapshot = computed(() => {
  const data = getExpandedSnapshot();
  if (!data) return null;
  if ('metrics' in data) return (data as DailyReportData).metrics;
  if ('weeklyMetrics' in data) return (data as WeeklyReportData).weeklyMetrics;
  if ('monthlyMetrics' in data) return (data as MonthlyReportData).monthlyMetrics;
  return null;
});

function getExpandedSnapshot(): DailyReportData | WeeklyReportData | MonthlyReportData | undefined {
  if (!expandedDetailId.value) return undefined;
  const cfg = exportHistory.value.find((c) => c.id === expandedDetailId.value);
  return cfg?.snapshotData;
}

function getAbnormalFromSnapshot(): AbnormalReasonDistribution[] {
  const data = getExpandedSnapshot();
  if (!data) return [];
  if ('abnormalReasons' in data) return (data as DailyReportData).abnormalReasons;
  if ('abnormalTrend' in data) {
    const trend = (data as WeeklyReportData).abnormalTrend;
    return trend.map((t) => ({
      category: t.category,
      count: t.dailyCounts.reduce((sum, c) => sum + c.count, 0),
      percentage: 0,
    }));
  }
  return [];
}

function getTeamFromSnapshot(): TeamEfficiency[] {
  const data = getExpandedSnapshot();
  if (!data) return [];
  if ('teamEfficiencies' in data) return (data as DailyReportData).teamEfficiencies;
  if ('teamRanking' in data) return (data as WeeklyReportData).teamRanking;
  if ('teamMonthlySummary' in data) return (data as MonthlyReportData).teamMonthlySummary;
  return [];
}

function getBerthFromSnapshot(): BerthPerformance[] {
  const data = getExpandedSnapshot();
  if (!data) return [];
  if ('berthPerformances' in data) return (data as DailyReportData).berthPerformances;
  if ('berthRanking' in data) return (data as WeeklyReportData).berthRanking;
  if ('berthMonthlySummary' in data) return (data as MonthlyReportData).berthMonthlySummary;
  return [];
}

function getKeyShipsFromSnapshot(): KeyShipRecord[] {
  const data = getExpandedSnapshot();
  if (!data) return [];
  if ('keyShips' in data) return (data as DailyReportData).keyShips;
  if ('keyShipsSummary' in data) return (data as WeeklyReportData).keyShipsSummary;
  return [];
}

const granularityOptions: { value: ReportGranularity; label: string; icon: any }[] = [
  { value: 'daily', label: '日报', icon: Clock },
  { value: 'weekly', label: '周报', icon: Calendar },
  { value: 'monthly', label: '月报', icon: BarChart3 },
];

const formatOptions: { value: ExportFormat; label: string; icon: any; desc: string }[] = [
  { value: 'excel', label: 'Excel', icon: FileSpreadsheet, desc: '.xlsx' },
  { value: 'pdf', label: 'PDF', icon: FileText, desc: '文档格式' },
  { value: 'csv', label: 'CSV', icon: FileText, desc: '逗号分隔' },
  { value: 'json', label: 'JSON', icon: FileJson, desc: '结构化数据' },
];

function toggleMetric(key: keyof CoreMetrics) {
  const idx = selectedMetrics.value.indexOf(key);
  if (idx >= 0) {
    selectedMetrics.value.splice(idx, 1);
  } else {
    selectedMetrics.value.push(key);
  }
}

function selectAllMetrics() {
  selectedMetrics.value = [...allMetricKeys];
}

function clearAllMetrics() {
  selectedMetrics.value = [];
}

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function computeSnapshot(): DailyReportData | WeeklyReportData | MonthlyReportData {
  const start = startOfDay(new Date(startDate.value));
  const end = endOfDay(new Date(endDate.value));
  const mid = new Date((start.getTime() + end.getTime()) / 2);
  if (granularity.value === 'daily') {
    return calculateDailyReport(mid);
  } else if (granularity.value === 'weekly') {
    return calculateWeeklyReport(mid);
  } else {
    return calculateMonthlyReport(mid);
  }
}

function buildExportConfig(snapshot: DailyReportData | WeeklyReportData | MonthlyReportData): ExportConfig {
  return {
    id: generateId(),
    name: configName.value || `${REPORT_GRANULARITY_LABELS[granularity.value]}导出_${formatDate(new Date(), 'yyyyMMdd_HHmmss')}`,
    description: '',
    granularity: granularity.value,
    startDate: startOfDay(new Date(startDate.value)),
    endDate: endOfDay(new Date(endDate.value)),
    includeMetrics: includeCoreMetrics.value ? selectedMetrics.value : [],
    includeAbnormalReasons: includeAbnormalReasons.value,
    includeTeamEfficiency: includeTeamEfficiency.value,
    includeBerthPerformance: includeBerthPerformance.value,
    includeKeyShips: includeKeyShips.value,
    format: exportFormat.value,
    createdAt: new Date(),
    createdBy: '当前用户',
    snapshotData: snapshot,
  };
}

function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  let blob: Blob;
  if (typeof content === 'string') {
    blob = new Blob([content], { type: mimeType });
  } else {
    blob = content;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getMetricsFromSnapshot(snapshot: DailyReportData | WeeklyReportData | MonthlyReportData): CoreMetrics | null {
  if ('metrics' in snapshot) return snapshot.metrics;
  if ('weeklyMetrics' in snapshot) return snapshot.weeklyMetrics;
  if ('monthlyMetrics' in snapshot) return snapshot.monthlyMetrics;
  return null;
}

function snapshotToCSV(cfg: ExportConfig): string {
  const lines: string[] = [];
  const snap = cfg.snapshotData;
  if (!snap) return '';

  lines.push(`# 报表导出配置: ${cfg.name}`);
  lines.push(`# 粒度: ${REPORT_GRANULARITY_LABELS[cfg.granularity]}`);
  lines.push(`# 时间范围: ${formatDate(cfg.startDate, 'yyyy-MM-dd')} ~ ${formatDate(cfg.endDate, 'yyyy-MM-dd')}`);
  lines.push(`# 导出时间: ${formatDate(cfg.createdAt, 'yyyy-MM-dd HH:mm:ss')}`);
  lines.push('');

  if (cfg.includeMetrics.length > 0) {
    const metrics = getMetricsFromSnapshot(snap);
    if (metrics) {
      lines.push('[核心指标]');
      lines.push('指标名称,指标值,单位');
      cfg.includeMetrics.forEach((key) => {
        lines.push(`${CORE_METRIC_LABELS[key]},${metrics[key]},${CORE_METRIC_UNITS[key] || ''}`);
      });
      lines.push('');
    }
  }

  if (cfg.includeAbnormalReasons) {
    let abnormal: AbnormalReasonDistribution[] = [];
    if ('abnormalReasons' in snap) abnormal = snap.abnormalReasons;
    else if ('abnormalTrend' in snap) {
      abnormal = (snap as WeeklyReportData | MonthlyReportData).abnormalTrend as AbnormalReasonDistribution[];
    }
    if (abnormal.length > 0) {
      lines.push('[异常原因分布]');
      lines.push('类别,数量,占比(%)');
      abnormal.forEach((a) => {
        lines.push(`${ABNORMAL_REASON_CATEGORY_LABELS[a.category]},${a.count},${a.percentage}`);
      });
      lines.push('');
    }
  }

  if (cfg.includeTeamEfficiency) {
    let teams: TeamEfficiency[] = [];
    if ('teamEfficiencies' in snap) teams = snap.teamEfficiencies;
    else if ('teamRanking' in snap) teams = (snap as WeeklyReportData).teamRanking;
    else if ('teamMonthlySummary' in snap) teams = (snap as MonthlyReportData).teamMonthlySummary;
    if (teams.length > 0) {
      lines.push('[班组效率]');
      lines.push('班组名称,完成作业,货物总量,平均时长(h),延误率(%),效率评分');
      teams.forEach((t) => {
        lines.push(`${t.teamName},${t.completedOperations},${t.totalCargoHandled},${t.avgOperationHours},${t.delayRate},${t.efficiencyScore}`);
      });
      lines.push('');
    }
  }

  if (cfg.includeBerthPerformance) {
    let berths: BerthPerformance[] = [];
    if ('berthPerformances' in snap) berths = snap.berthPerformances;
    else if ('berthRanking' in snap) berths = (snap as WeeklyReportData).berthRanking;
    else if ('berthMonthlySummary' in snap) berths = (snap as MonthlyReportData).berthMonthlySummary;
    if (berths.length > 0) {
      lines.push('[泊位绩效]');
      lines.push('泊位ID,泊位名称,利用率(%),作业次数,平均周转(h),冲突次数');
      berths.forEach((b) => {
        lines.push(`${b.berthId},${b.berthName},${b.utilization},${b.operationsCount},${b.avgTurnaroundHours},${b.conflictCount}`);
      });
      lines.push('');
    }
  }

  if (cfg.includeKeyShips) {
    let ships: KeyShipRecord[] = [];
    if ('keyShips' in snap) ships = snap.keyShips;
    else if ('keyShipsSummary' in snap) ships = (snap as WeeklyReportData).keyShipsSummary;
    if (ships.length > 0) {
      lines.push('[重点船舶保障]');
      lines.push('船名,优先级,泊位,计划靠泊,实际靠泊,计划离泊,实际离泊,是否准点,保障状态,备注');
      ships.forEach((s) => {
        lines.push([
          s.shipName,
          s.priority,
          s.berthName,
          formatDate(s.plannedBerthing, 'yyyy-MM-dd HH:mm'),
          s.actualBerthing ? formatDate(s.actualBerthing, 'yyyy-MM-dd HH:mm') : '',
          formatDate(s.plannedDeparture, 'yyyy-MM-dd HH:mm'),
          s.actualDeparture ? formatDate(s.actualDeparture, 'yyyy-MM-dd HH:mm') : '',
          s.onTime ? '是' : '否',
          s.guaranteeStatus,
          (s.remarks || '').replace(/,/g, ' '),
        ].join(','));
      });
      lines.push('');
    }
  }

  return lines.join('\n');
}

function snapshotToExcel(cfg: ExportConfig): string {
  return '\uFEFF' + snapshotToCSV(cfg);
}

function snapshotToJSON(cfg: ExportConfig): string {
  const output = {
    exportMeta: {
      id: cfg.id,
      name: cfg.name,
      granularity: cfg.granularity,
      format: cfg.format,
      startDate: cfg.startDate,
      endDate: cfg.endDate,
      createdAt: cfg.createdAt,
      createdBy: cfg.createdBy,
      includeMetrics: cfg.includeMetrics,
      includeAbnormalReasons: cfg.includeAbnormalReasons,
      includeTeamEfficiency: cfg.includeTeamEfficiency,
      includeBerthPerformance: cfg.includeBerthPerformance,
      includeKeyShips: cfg.includeKeyShips,
    },
    snapshotData: cfg.snapshotData,
  };
  return JSON.stringify(output, null, 2);
}

function generateFilename(cfg: ExportConfig): string {
  const base = `${REPORT_GRANULARITY_LABELS[cfg.granularity]}_${formatDate(cfg.createdAt, 'yyyyMMdd_HHmmss')}`;
  switch (cfg.format) {
    case 'excel': return `${base}.xlsx`;
    case 'csv': return `${base}.csv`;
    case 'json': return `${base}.json`;
    case 'pdf': return `${base}.json`;
  }
}

function performExport(cfg: ExportConfig) {
  const filename = generateFilename(cfg);
  switch (cfg.format) {
    case 'json': {
      const content = snapshotToJSON(cfg);
      downloadFile(content, filename, 'application/json;charset=utf-8');
      break;
    }
    case 'csv': {
      const content = snapshotToCSV(cfg);
      downloadFile(content, filename, 'text/csv;charset=utf-8');
      break;
    }
    case 'excel': {
      const content = snapshotToExcel(cfg);
      downloadFile(content, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8');
      break;
    }
    case 'pdf': {
      const pdfCfg = { ...cfg, format: 'json' as ExportFormat };
      const content = snapshotToJSON(pdfCfg);
      const blob = new Blob([`%PDF-EXPORT-MARKER\n${content}`], { type: 'application/pdf;charset=utf-8' });
      downloadFile(blob, filename.replace('.json', '.json'), 'application/pdf;charset=utf-8');
      break;
    }
  }
}

async function handleExport() {
  if (!startDate.value || !endDate.value) {
    alert('请选择时间范围');
    return;
  }
  if (includeCoreMetrics.value && selectedMetrics.value.length === 0) {
    alert('请至少选择一个核心指标');
    return;
  }
  isExporting.value = true;
  try {
    await new Promise((r) => setTimeout(r, 300));
    const snapshot = computeSnapshot();
    const cfg = buildExportConfig(snapshot);
    performExport(cfg);
    exportHistory.value.unshift(cfg);
    saveHistory();
    configName.value = '';
  } finally {
    isExporting.value = false;
  }
}

function redownload(cfg: ExportConfig) {
  performExport(cfg);
}

function toggleDetail(id: string) {
  expandedDetailId.value = expandedDetailId.value === id ? null : id;
}

function removeHistory(id: string) {
  if (!confirm('确定要删除此导出记录吗？')) return;
  const idx = exportHistory.value.findIndex((c) => c.id === id);
  if (idx >= 0) {
    exportHistory.value.splice(idx, 1);
    saveHistory();
    if (expandedDetailId.value === id) {
      expandedDetailId.value = null;
    }
  }
}

function formatGranularity(g: ReportGranularity): string {
  return REPORT_GRANULARITY_LABELS[g];
}

function formatDateRange(start: Date, end: Date): string {
  return `${formatDate(start, 'yyyy-MM-dd')} ~ ${formatDate(end, 'yyyy-MM-dd')}`;
}

function formatFormatLabel(f: ExportFormat): string {
  const opt = formatOptions.find((o) => o.value === f);
  return opt ? `${opt.label}(${opt.desc})` : f;
}

function formatCreatedAt(d: Date): string {
  return formatDate(d, 'yyyy-MM-dd HH:mm');
}

const formatIconMap: Record<ExportFormat, any> = {
  excel: FileSpreadsheet,
  pdf: FileText,
  csv: FileText,
  json: FileJson,
};

const formatColorMap: Record<ExportFormat, string> = {
  excel: 'text-harbor-green',
  pdf: 'text-harbor-red',
  csv: 'text-harbor-blue',
  json: 'text-harbor-purple',
};

const detailMetricConfigs = computed(() => {
  const m = coreMetricsFromSnapshot.value;
  if (!m) return [];
  const keys = allMetricKeys.filter((k) => selectedMetrics.value.length === 0 || selectedMetrics.value.includes(k));
  return keys.map((key) => ({
    key,
    label: CORE_METRIC_LABELS[key],
    value: m[key],
    color: 'text-harbor-cyan',
    suffix: CORE_METRIC_UNITS[key],
    progressDenominator: key.includes('Rate') || key.includes('Utilization') || key.includes('turnover') ? 100 : 50,
  }));
});
</script>

<template>
  <ReportLayout title="报表导出配置" subtitle="报表快照导出与历史存档管理">
    <div class="grid grid-cols-12 gap-4">
      <div class="col-span-12 lg:col-span-6 space-y-4">
        <div class="panel-border rounded-lg overflow-hidden">
          <div class="p-4 border-b border-console-500/20 bg-console-800/60 flex items-center gap-2">
            <PlusCircle class="w-4 h-4 text-harbor-cyan" />
            <h3 class="font-mono text-sm font-semibold text-console-100">新建导出配置</h3>
          </div>
          <div class="p-4 space-y-5">
            <div class="space-y-2">
              <label class="flex items-center gap-1.5 text-xs font-mono text-console-300">
                <Settings class="w-3.5 h-3.5 text-harbor-cyan" />
                配置名称
              </label>
              <input
                v-model="configName"
                type="text"
                placeholder="例如：2026年6月第三周经营报表"
                class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/40 text-sm font-mono text-console-100 placeholder-console-500 outline-none focus:border-harbor-cyan/60 focus:shadow-glow-blue transition-all"
              />
            </div>

            <div class="space-y-2">
              <label class="flex items-center gap-1.5 text-xs font-mono text-console-300">
                <BarChart3 class="w-3.5 h-3.5 text-harbor-cyan" />
                报表粒度
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="opt in granularityOptions"
                  :key="opt.value"
                  @click="granularity = opt.value"
                  :class="[
                    'flex items-center justify-center gap-1.5 px-3 py-2 rounded border font-mono text-xs transition-all',
                    granularity === opt.value
                      ? 'bg-harbor-cyan/15 border-harbor-cyan/50 text-harbor-cyan shadow-glow-blue'
                      : 'bg-console-800/40 border-console-500/40 text-console-300 hover:border-console-400/50 hover:text-console-100',
                  ]"
                >
                  <component :is="opt.icon" class="w-3.5 h-3.5" />
                  {{ opt.label }}
                </button>
              </div>
            </div>

            <div class="space-y-2">
              <label class="flex items-center gap-1.5 text-xs font-mono text-console-300">
                <Calendar class="w-3.5 h-3.5 text-harbor-cyan" />
                时间范围
              </label>
              <div class="grid grid-cols-2 gap-2">
                <div class="flex items-center gap-2 px-3 py-2 rounded bg-console-800/60 border border-console-500/40 focus-within:border-harbor-cyan/60 transition-all">
                  <Clock class="w-3.5 h-3.5 text-console-400 flex-shrink-0" />
                  <input
                    v-model="startDate"
                    type="date"
                    class="bg-transparent text-sm font-mono text-console-100 outline-none w-full cursor-pointer"
                  />
                </div>
                <div class="flex items-center gap-2 px-3 py-2 rounded bg-console-800/60 border border-console-500/40 focus-within:border-harbor-cyan/60 transition-all">
                  <Clock class="w-3.5 h-3.5 text-console-400 flex-shrink-0" />
                  <input
                    v-model="endDate"
                    type="date"
                    class="bg-transparent text-sm font-mono text-console-100 outline-none w-full cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <label class="flex items-center gap-1.5 text-xs font-mono text-console-300">
                <Download class="w-3.5 h-3.5 text-harbor-cyan" />
                导出格式
              </label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="opt in formatOptions"
                  :key="opt.value"
                  @click="exportFormat = opt.value"
                  :class="[
                    'flex flex-col items-center gap-1 px-2 py-2.5 rounded border font-mono text-xs transition-all',
                    exportFormat === opt.value
                      ? 'bg-harbor-cyan/15 border-harbor-cyan/50 text-harbor-cyan shadow-glow-blue'
                      : 'bg-console-800/40 border-console-500/40 text-console-300 hover:border-console-400/50 hover:text-console-100',
                  ]"
                >
                  <component :is="opt.icon" class="w-4 h-4" />
                  <span class="font-semibold">{{ opt.label }}</span>
                  <span class="text-[9px] opacity-70">{{ opt.desc }}</span>
                </button>
              </div>
            </div>

            <div class="space-y-3">
              <label class="flex items-center gap-1.5 text-xs font-mono text-console-300">
                <Archive class="w-3.5 h-3.5 text-harbor-cyan" />
                包含内容
              </label>
              <div class="space-y-2">
                <label
                  :class="[
                    'flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-all',
                    includeCoreMetrics
                      ? 'bg-harbor-cyan/10 border-harbor-cyan/40'
                      : 'bg-console-800/30 border-console-500/30 hover:border-console-400/40',
                  ]"
                >
                  <div
                    :class="[
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                      includeCoreMetrics
                        ? 'bg-harbor-cyan border-harbor-cyan'
                        : 'border-console-500/60',
                    ]"
                  >
                    <CheckCircle2 v-if="includeCoreMetrics" class="w-3 h-3 text-console-900" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-1.5">
                      <BarChart3 :class="['w-3.5 h-3.5', includeCoreMetrics ? 'text-harbor-cyan' : 'text-console-400']" />
                      <span :class="['text-xs font-mono font-medium', includeCoreMetrics ? 'text-console-100' : 'text-console-300']">核心指标</span>
                    </div>
                    <p class="text-[10px] font-mono text-console-500 mt-0.5">shipsInPort, berthUtilization, planFulfillmentRate 等</p>
                  </div>
                  <input type="checkbox" v-model="includeCoreMetrics" class="sr-only" />
                </label>

                <div
                  v-if="includeCoreMetrics"
                  class="ml-6 p-3 rounded bg-console-800/40 border border-console-500/20 space-y-3"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-mono text-console-400 uppercase tracking-wider">具体指标选择</span>
                    <div class="flex items-center gap-2">
                      <button @click="selectAllMetrics" class="text-[10px] font-mono text-harbor-cyan hover:text-harbor-cyan/80 transition-colors">全选</button>
                      <span class="text-console-600">|</span>
                      <button @click="clearAllMetrics" class="text-[10px] font-mono text-console-400 hover:text-console-300 transition-colors">清空</button>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-2">
                    <label
                      v-for="key in allMetricKeys"
                      :key="key"
                      :class="[
                        'flex items-center gap-2 p-1.5 rounded cursor-pointer transition-all',
                        selectedMetrics.includes(key)
                          ? 'bg-harbor-cyan/10 text-console-100'
                          : 'hover:bg-console-700/40 text-console-400',
                      ]"
                    >
                      <div
                        :class="[
                          'w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0',
                          selectedMetrics.includes(key)
                            ? 'bg-harbor-cyan border-harbor-cyan'
                            : 'border-console-500/60',
                        ]"
                      >
                        <CheckCircle2 v-if="selectedMetrics.includes(key)" class="w-2.5 h-2.5 text-console-900" />
                      </div>
                      <span class="text-[11px] font-mono">{{ CORE_METRIC_LABELS[key] }}</span>
                    </label>
                  </div>
                </div>

                <label
                  :class="[
                    'flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-all',
                    includeAbnormalReasons
                      ? 'bg-harbor-orange/10 border-harbor-orange/40'
                      : 'bg-console-800/30 border-console-500/30 hover:border-console-400/40',
                  ]"
                >
                  <div
                    :class="[
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                      includeAbnormalReasons
                        ? 'bg-harbor-orange border-harbor-orange'
                        : 'border-console-500/60',
                    ]"
                  >
                    <CheckCircle2 v-if="includeAbnormalReasons" class="w-3 h-3 text-console-900" />
                  </div>
                  <div class="flex items-center gap-1.5">
                    <AlertCircle :class="['w-3.5 h-3.5', includeAbnormalReasons ? 'text-harbor-orange' : 'text-console-400']" />
                    <span :class="['text-xs font-mono font-medium', includeAbnormalReasons ? 'text-console-100' : 'text-console-300']">异常原因分布</span>
                  </div>
                  <input type="checkbox" v-model="includeAbnormalReasons" class="sr-only" />
                </label>

                <label
                  :class="[
                    'flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-all',
                    includeTeamEfficiency
                      ? 'bg-harbor-purple/10 border-harbor-purple/40'
                      : 'bg-console-800/30 border-console-500/30 hover:border-console-400/40',
                  ]"
                >
                  <div
                    :class="[
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                      includeTeamEfficiency
                        ? 'bg-harbor-purple border-harbor-purple'
                        : 'border-console-500/60',
                    ]"
                  >
                    <CheckCircle2 v-if="includeTeamEfficiency" class="w-3 h-3 text-console-900" />
                  </div>
                  <div class="flex items-center gap-1.5">
                    <Users :class="['w-3.5 h-3.5', includeTeamEfficiency ? 'text-harbor-purple' : 'text-console-400']" />
                    <span :class="['text-xs font-mono font-medium', includeTeamEfficiency ? 'text-console-100' : 'text-console-300']">班组效率</span>
                  </div>
                  <input type="checkbox" v-model="includeTeamEfficiency" class="sr-only" />
                </label>

                <label
                  :class="[
                    'flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-all',
                    includeBerthPerformance
                      ? 'bg-harbor-blue/10 border-harbor-blue/40'
                      : 'bg-console-800/30 border-console-500/30 hover:border-console-400/40',
                  ]"
                >
                  <div
                    :class="[
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                      includeBerthPerformance
                        ? 'bg-harbor-blue border-harbor-blue'
                        : 'border-console-500/60',
                    ]"
                  >
                    <CheckCircle2 v-if="includeBerthPerformance" class="w-3 h-3 text-console-900" />
                  </div>
                  <div class="flex items-center gap-1.5">
                    <Anchor :class="['w-3.5 h-3.5', includeBerthPerformance ? 'text-harbor-blue' : 'text-console-400']" />
                    <span :class="['text-xs font-mono font-medium', includeBerthPerformance ? 'text-console-100' : 'text-console-300']">泊位绩效</span>
                  </div>
                  <input type="checkbox" v-model="includeBerthPerformance" class="sr-only" />
                </label>

                <label
                  :class="[
                    'flex items-center gap-3 p-2.5 rounded border cursor-pointer transition-all',
                    includeKeyShips
                      ? 'bg-harbor-red/10 border-harbor-red/40'
                      : 'bg-console-800/30 border-console-500/30 hover:border-console-400/40',
                  ]"
                >
                  <div
                    :class="[
                      'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
                      includeKeyShips
                        ? 'bg-harbor-red border-harbor-red'
                        : 'border-console-500/60',
                    ]"
                  >
                    <CheckCircle2 v-if="includeKeyShips" class="w-3 h-3 text-white" />
                  </div>
                  <div class="flex items-center gap-1.5">
                    <Shield :class="['w-3.5 h-3.5', includeKeyShips ? 'text-harbor-red' : 'text-console-400']" />
                    <span :class="['text-xs font-mono font-medium', includeKeyShips ? 'text-console-100' : 'text-console-300']">重点船舶保障</span>
                  </div>
                  <input type="checkbox" v-model="includeKeyShips" class="sr-only" />
                </label>
              </div>
            </div>

            <button
              @click="handleExport"
              :disabled="isExporting"
              :class="[
                'w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-mono text-sm font-semibold transition-all',
                isExporting
                  ? 'bg-console-700 text-console-500 cursor-not-allowed'
                  : 'bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/50 hover:bg-harbor-cyan/30 shadow-glow-blue',
              ]"
            >
              <RefreshCw v-if="isExporting" class="w-4 h-4 animate-spin" />
              <Save v-else class="w-4 h-4" />
              {{ isExporting ? '生成快照中...' : '生成快照并导出' }}
            </button>
          </div>
        </div>
      </div>

      <div class="col-span-12 lg:col-span-6 space-y-4">
        <div class="panel-border rounded-lg overflow-hidden">
          <div class="p-4 border-b border-console-500/20 bg-console-800/60 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Clock class="w-4 h-4 text-harbor-cyan" />
              <h3 class="font-mono text-sm font-semibold text-console-100">历史导出记录</h3>
            </div>
            <span class="text-[10px] font-mono text-console-400 px-2 py-0.5 rounded bg-console-700/50 border border-console-500/30">
              共 {{ exportHistory.length }} 条
            </span>
          </div>

          <div v-if="exportHistory.length === 0" class="p-10">
            <div class="flex flex-col items-center gap-3 text-center">
              <div class="w-16 h-16 rounded-full bg-console-800/60 border border-console-500/30 flex items-center justify-center">
                <Archive class="w-7 h-7 text-console-500" />
              </div>
              <div>
                <p class="text-sm font-mono text-console-300">暂无导出记录</p>
                <p class="text-[11px] font-mono text-console-500 mt-1">在左侧创建配置并生成快照以开始使用</p>
              </div>
            </div>
          </div>

          <div v-else class="divide-y divide-console-500/20 max-h-[calc(100vh-300px)] overflow-y-auto">
            <div v-for="cfg in exportHistory" :key="cfg.id" class="transition-colors">
              <div
                :class="[
                  'p-4 cursor-pointer transition-colors',
                  expandedDetailId === cfg.id ? 'bg-harbor-cyan/5' : 'hover:bg-console-700/30',
                ]"
                @click="toggleDetail(cfg.id)"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0 space-y-1.5">
                    <div class="flex items-center gap-2 flex-wrap">
                      <component
                        :is="formatIconMap[cfg.format]"
                        :class="['w-4 h-4 flex-shrink-0', formatColorMap[cfg.format]]"
                      />
                      <span class="text-sm font-mono font-medium text-console-100 truncate">{{ cfg.name }}</span>
                      <span
                        :class="[
                          'text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0',
                          cfg.granularity === 'daily'
                            ? 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/30'
                            : cfg.granularity === 'weekly'
                            ? 'bg-harbor-purple/15 text-harbor-purple border-harbor-purple/30'
                            : 'bg-harbor-orange/15 text-harbor-orange border-harbor-orange/30',
                        ]"
                      >
                        {{ formatGranularity(cfg.granularity) }}
                      </span>
                    </div>
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-console-400">
                      <span class="flex items-center gap-1">
                        <Calendar class="w-3 h-3" />
                        {{ formatDateRange(cfg.startDate, cfg.endDate) }}
                      </span>
                      <span :class="['flex items-center gap-1', formatColorMap[cfg.format]]">
                        <component :is="formatIconMap[cfg.format]" class="w-3 h-3" />
                        {{ formatFormatLabel(cfg.format) }}
                      </span>
                      <span class="flex items-center gap-1">
                        <Clock class="w-3 h-3" />
                        {{ formatCreatedAt(cfg.createdAt) }}
                      </span>
                    </div>
                  </div>
                  <div class="flex items-center gap-1 flex-shrink-0" @click.stop>
                    <button
                      @click="redownload(cfg)"
                      class="w-8 h-8 rounded bg-console-700/50 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50 hover:bg-harbor-cyan/10 transition-all"
                      title="重新下载"
                    >
                      <Download class="w-3.5 h-3.5" />
                    </button>
                    <button
                      @click="toggleDetail(cfg.id)"
                      :class="[
                        'w-8 h-8 rounded border flex items-center justify-center transition-all',
                        expandedDetailId === cfg.id
                          ? 'bg-harbor-cyan/20 border-harbor-cyan/50 text-harbor-cyan'
                          : 'bg-console-700/50 border-console-500/40 text-console-300 hover:text-harbor-cyan hover:border-harbor-cyan/50',
                      ]"
                      title="查看详情"
                    >
                      <Eye class="w-3.5 h-3.5" />
                    </button>
                    <button
                      @click="removeHistory(cfg.id)"
                      class="w-8 h-8 rounded bg-console-700/50 border border-console-500/40 flex items-center justify-center text-console-400 hover:text-harbor-red hover:border-harbor-red/50 hover:bg-harbor-red/10 transition-all"
                      title="删除"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                    <component
                      :is="expandedDetailId === cfg.id ? ChevronUp : ChevronDown"
                      class="w-3.5 h-3.5 text-console-500 ml-1"
                    />
                  </div>
                </div>
              </div>

              <div
                v-if="expandedDetailId === cfg.id"
                class="px-4 pb-4 border-t border-console-500/20"
              >
                <div class="pt-4 space-y-4">
                  <div class="flex items-center gap-2">
                    <span class="w-1 h-4 bg-harbor-cyan rounded-full" />
                    <span class="text-xs font-mono font-semibold text-console-100">快照核心内容预览</span>
                  </div>

                  <div v-if="(cfg.includeMetrics.length > 0 || includeCoreMetrics) && coreMetricsFromSnapshot" class="space-y-2">
                    <p class="text-[11px] font-mono text-console-400 uppercase tracking-wider">核心指标</p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <ReportMetricCard
                        v-for="m in detailMetricConfigs.slice(0, 6)"
                        :key="m.key"
                        :label="m.label"
                        :value="m.value"
                        :color="m.color"
                        :suffix="m.suffix"
                        :progress-denominator="m.progressDenominator"
                      />
                    </div>
                  </div>

                  <div v-if="cfg.includeAbnormalReasons && getAbnormalFromSnapshot().length > 0" class="space-y-2">
                    <p class="text-[11px] font-mono text-console-400 uppercase tracking-wider">异常原因 Top 3</p>
                    <div class="space-y-1.5">
                      <div
                        v-for="(a, idx) in getAbnormalFromSnapshot().slice(0, 3)"
                        :key="a.category"
                        class="flex items-center gap-3 p-2 rounded bg-console-800/40 border border-console-500/20"
                      >
                        <span
                          :class="[
                            'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0',
                            idx === 0
                              ? 'bg-harbor-red/20 text-harbor-red border border-harbor-red/40'
                              : idx === 1
                              ? 'bg-harbor-orange/20 text-harbor-orange border border-harbor-orange/40'
                              : 'bg-harbor-yellow/20 text-harbor-yellow border border-harbor-yellow/40',
                          ]"
                        >
                          {{ idx + 1 }}
                        </span>
                        <span class="flex-1 text-xs font-mono text-console-100">{{ ABNORMAL_REASON_CATEGORY_LABELS[a.category] }}</span>
                        <span class="text-xs font-mono text-harbor-orange tabular-nums">{{ a.count }} 次</span>
                        <span class="text-xs font-mono text-console-400 tabular-nums">{{ a.percentage }}%</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="cfg.includeTeamEfficiency && getTeamFromSnapshot().length > 0" class="space-y-2">
                    <p class="text-[11px] font-mono text-console-400 uppercase tracking-wider">班组效率 Top 2</p>
                    <div class="space-y-1.5">
                      <div
                        v-for="(t, idx) in getTeamFromSnapshot().slice(0, 2)"
                        :key="t.teamName"
                        class="p-2 rounded bg-console-800/40 border border-console-500/20"
                      >
                        <div class="flex items-center justify-between mb-1">
                          <span class="text-xs font-mono font-medium text-console-100">{{ t.teamName }}</span>
                          <span class="text-xs font-mono text-harbor-purple font-bold tabular-nums">{{ t.efficiencyScore }} 分</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-[10px] font-mono text-console-400">
                          <span>完成作业 <span class="text-console-100">{{ t.completedOperations }}</span></span>
                          <span>平均时长 <span class="text-console-100">{{ t.avgOperationHours }}h</span></span>
                          <span>延误率 <span :class="t.delayRate > 10 ? 'text-harbor-red' : 'text-harbor-green'">{{ t.delayRate }}%</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="cfg.includeBerthPerformance && getBerthFromSnapshot().length > 0" class="space-y-2">
                    <p class="text-[11px] font-mono text-console-400 uppercase tracking-wider">泊位绩效 Top 2</p>
                    <div class="space-y-1.5">
                      <div
                        v-for="(b, idx) in getBerthFromSnapshot().slice(0, 2)"
                        :key="b.berthId"
                        class="p-2 rounded bg-console-800/40 border border-console-500/20"
                      >
                        <div class="flex items-center justify-between mb-1.5">
                          <span class="text-xs font-mono font-medium text-console-100">{{ b.berthName }}</span>
                          <div class="flex items-center gap-2">
                            <div class="w-16 h-1.5 bg-console-700 rounded-full overflow-hidden">
                              <div
                                class="h-full bg-harbor-blue rounded-full"
                                :style="{ width: `${b.utilization}%` }"
                              />
                            </div>
                            <span class="text-xs font-mono text-harbor-blue font-semibold tabular-nums">{{ b.utilization }}%</span>
                          </div>
                        </div>
                        <div class="grid grid-cols-3 gap-2 text-[10px] font-mono text-console-400">
                          <span>作业次数 <span class="text-console-100">{{ b.operationsCount }}</span></span>
                          <span>周转时长 <span class="text-console-100">{{ b.avgTurnaroundHours }}h</span></span>
                          <span>冲突 <span :class="b.conflictCount > 0 ? 'text-harbor-red' : 'text-harbor-green'">{{ b.conflictCount }}</span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="cfg.includeKeyShips && getKeyShipsFromSnapshot().length > 0" class="space-y-2">
                    <p class="text-[11px] font-mono text-console-400 uppercase tracking-wider">重点船舶 {{ getKeyShipsFromSnapshot().length }} 艘</p>
                    <div class="overflow-x-auto rounded border border-console-500/20">
                      <table class="w-full text-[10px] font-mono">
                        <thead class="bg-console-800 text-harbor-cyan">
                          <tr>
                            <th class="px-2 py-1.5 text-left">船名</th>
                            <th class="px-2 py-1.5 text-left">泊位</th>
                            <th class="px-2 py-1.5 text-left">状态</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="s in getKeyShipsFromSnapshot().slice(0, 3)"
                            :key="s.scheduleId"
                            class="border-t border-console-500/20"
                          >
                            <td class="px-2 py-1.5 text-console-100">{{ s.shipName }}</td>
                            <td class="px-2 py-1.5 text-console-300">{{ s.berthName }}</td>
                            <td class="px-2 py-1.5">
                              <span
                                :class="[
                                  'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border text-[9px] font-mono',
                                  s.onTime
                                    ? 'bg-harbor-green/15 text-harbor-green border-harbor-green/30'
                                    : 'bg-harbor-red/15 text-harbor-red border-harbor-red/30',
                                ]"
                              >
                                <CheckCircle2 v-if="s.onTime" :size="8" />
                                <XCircle v-else :size="8" />
                                {{ s.onTime ? '准点' : '延误' }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ReportLayout>
</template>

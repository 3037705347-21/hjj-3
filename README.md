# PORTOS - 港口泊位调度系统

基于 Vue 3 + TypeScript + Vite 构建的港口泊位运营调度控制系统，采用深色终端风格 UI。

## 功能特性

- **泊位调度时间轴** — 可视化展示各泊位船舶占用情况，支持拖拽调整调度
- **船舶调度计划** — 搜索、筛选、排序调度记录，实时查看船舶状态
- **潮汐窗口监控** — SVG 图表展示潮汐变化，辅助深水船舶靠离泊决策
- **冲突检测** — 自动检测时间重叠、吃水超限、船长超限、货物不匹配、潮汐窗口等冲突
- **调度日志** — 完整记录创建、更新、状态变更、冲突告警等操作
- **船舶详情面板** — 侧边栏展示船舶信息、作业进度、状态控制

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3 + TypeScript |
| 构建 | Vite 5 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 样式 | Tailwind CSS 3 |
| 图标 | Lucide Vue Next |
| 日期 | date-fns |

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run check

# ESLint 检查
npm run lint

# ESLint 自动修复
npm run lint:fix

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

## 项目结构

```
src/
├── assets/            # 静态资源
├── components/
│   ├── common/        # 通用组件 (CargoTypeIcon, PriorityBadge, StatusBadge)
│   ├── console/       # 控制台组件 (BerthTimeline, ShipListTable, StatsCards, TideIndicator)
│   ├── logs/          # 日志组件 (LogPanel, ConflictAlert)
│   └── sidebar/       # 侧边栏组件 (ShipDetailSidebar, ShipInfoCard, OperationProgress, StatusActions)
├── composables/       # 组合式函数 (useConflictDetection, useDragSchedule, useScheduleLogger)
├── data/              # Mock 数据
├── pages/             # 页面 (ConsolePage, LogsPage)
├── router/            # 路由配置
├── stores/            # Pinia 状态仓库
└── types/             # TypeScript 类型定义
```

## CI

项目使用 GitHub Actions 进行持续集成，在 push 和 PR 时自动执行：

- `npm ci` — 安装依赖
- `npm run check` — TypeScript 类型检查
- `npm run lint` — ESLint 代码检查
- `npm run build` — 生产构建

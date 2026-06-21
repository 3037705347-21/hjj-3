import type { TideRecord, Ship, Berth, BerthSchedule } from '../types';

export interface TideRiskPeriod {
  startTime: Date;
  endTime: Date;
  minDepth: number;
  requiredDepth: number;
  deficit: number;
}

export interface RecommendedWindow {
  startTime: Date;
  endTime: Date;
  maxDepth: number;
  type: 'berthing' | 'departure' | 'operation';
}

export interface ShipTideAnalysis {
  requiredDepth: number;
  minAvailableDepth: number;
  maxAvailableDepth: number;
  avgAvailableDepth: number;
  hasRisk: boolean;
  riskPeriods: TideRiskPeriod[];
  recommendedWindows: RecommendedWindow[];
  berthingRecommendation: {
    canBerth: boolean;
    suggestedTime?: Date;
    reason: string;
  };
  departureRecommendation: {
    canDepart: boolean;
    suggestedTime?: Date;
    reason: string;
  };
}

const SAFETY_MARGIN = 0.5;
const BASE_TIDE_HEIGHT = 4;

function calculateAvailableDepth(tideHeight: number, berthMaxDraft: number): number {
  return tideHeight + (berthMaxDraft - BASE_TIDE_HEIGHT);
}

export function useShipTideAdaptation() {
  function analyzeShipTide(
    schedule: BerthSchedule,
    ship: Ship,
    berth: Berth,
    tides: TideRecord[],
  ): ShipTideAnalysis {
    const requiredDepth = ship.draft + SAFETY_MARGIN;
    const eta = new Date(schedule.eta);
    const etd = new Date(schedule.etd);

    const relevantTides = tides.filter((t) => t.time >= eta && t.time <= etd);

    if (relevantTides.length === 0) {
      return {
        requiredDepth,
        minAvailableDepth: 0,
        maxAvailableDepth: 0,
        avgAvailableDepth: 0,
        hasRisk: false,
        riskPeriods: [],
        recommendedWindows: [],
        berthingRecommendation: {
          canBerth: true,
          reason: '作业窗口内无潮汐数据',
        },
        departureRecommendation: {
          canDepart: true,
          reason: '作业窗口内无潮汐数据',
        },
      };
    }

    const depths = relevantTides.map((t) => ({
      time: t.time,
      depth: calculateAvailableDepth(t.height, berth.maxDraft),
      tideType: t.type,
    }));

    const minAvailableDepth = Math.min(...depths.map((d) => d.depth));
    const maxAvailableDepth = Math.max(...depths.map((d) => d.depth));
    const avgAvailableDepth =
      depths.reduce((sum, d) => sum + d.depth, 0) / depths.length;

    const riskPeriods = identifyRiskPeriods(depths, requiredDepth);
    const hasRisk = riskPeriods.length > 0;

    const recommendedWindows = identifyRecommendedWindows(
      depths,
      requiredDepth,
      eta,
      etd,
      ship.draft,
    );

    const berthingRecommendation = generateBerthingRecommendation(
      depths,
      requiredDepth,
      eta,
      ship.draft,
    );

    const departureRecommendation = generateDepartureRecommendation(
      depths,
      requiredDepth,
      etd,
      ship.draft,
    );

    return {
      requiredDepth,
      minAvailableDepth,
      maxAvailableDepth,
      avgAvailableDepth,
      hasRisk,
      riskPeriods,
      recommendedWindows,
      berthingRecommendation,
      departureRecommendation,
    };
  }

  function identifyRiskPeriods(
    depths: { time: Date; depth: number; tideType: string }[],
    requiredDepth: number,
  ): TideRiskPeriod[] {
    const riskPeriods: TideRiskPeriod[] = [];
    let currentRisk: {
      startTime: Date;
      minDepth: number;
    } | null = null;

    for (let i = 0; i < depths.length; i++) {
      const { time, depth } = depths[i];

      if (depth < requiredDepth) {
        if (!currentRisk) {
          currentRisk = {
            startTime: time,
            minDepth: depth,
          };
        } else {
          currentRisk.minDepth = Math.min(currentRisk.minDepth, depth);
        }

        if (i === depths.length - 1 && currentRisk) {
          const prevTime = i > 0 ? depths[i - 1].time : time;
          const interval = time.getTime() - prevTime.getTime();
          riskPeriods.push({
            startTime: currentRisk.startTime,
            endTime: new Date(time.getTime() + interval),
            minDepth: currentRisk.minDepth,
            requiredDepth,
            deficit: requiredDepth - currentRisk.minDepth,
          });
        }
      } else if (currentRisk) {
        const prevTime = i > 0 ? depths[i - 1].time : time;
        riskPeriods.push({
          startTime: currentRisk.startTime,
          endTime: prevTime,
          minDepth: currentRisk.minDepth,
          requiredDepth,
          deficit: requiredDepth - currentRisk.minDepth,
        });
        currentRisk = null;
      }
    }

    return riskPeriods;
  }

  function identifyRecommendedWindows(
    depths: { time: Date; depth: number; tideType: string }[],
    requiredDepth: number,
    eta: Date,
    etd: Date,
    _shipDraft: number,
  ): RecommendedWindow[] {
    const windows: RecommendedWindow[] = [];
    const safeDepths = depths.filter((d) => d.depth >= requiredDepth);

    if (safeDepths.length === 0) return windows;

    let currentWindow: {
      startTime: Date;
      endTime: Date;
      maxDepth: number;
    } | null = null;

    for (let i = 0; i < safeDepths.length; i++) {
      const { time, depth } = safeDepths[i];

      if (!currentWindow) {
        currentWindow = {
          startTime: time,
          endTime: time,
          maxDepth: depth,
        };
      } else {
        const prevSafe = safeDepths[i - 1];
        const gap = time.getTime() - prevSafe.time.getTime();
        if (gap <= 3600000) {
          currentWindow.endTime = time;
          currentWindow.maxDepth = Math.max(currentWindow.maxDepth, depth);
        } else {
          windows.push({
            ...currentWindow,
            type: classifyWindowType(currentWindow.startTime, eta, etd),
          });
          currentWindow = {
            startTime: time,
            endTime: time,
            maxDepth: depth,
          };
        }
      }

      if (i === safeDepths.length - 1 && currentWindow) {
        windows.push({
          ...currentWindow,
          type: classifyWindowType(currentWindow.startTime, eta, etd),
        });
      }
    }

    return windows;
  }

  function classifyWindowType(
    time: Date,
    eta: Date,
    etd: Date,
  ): 'berthing' | 'departure' | 'operation' {
    const timeMs = time.getTime();
    const etaMs = eta.getTime();
    const etdMs = etd.getTime();
    const berthingWindow = etaMs + 4 * 3600000;
    const departureWindow = etdMs - 4 * 3600000;

    if (timeMs >= etaMs && timeMs <= berthingWindow) {
      return 'berthing';
    } else if (timeMs >= departureWindow && timeMs <= etdMs) {
      return 'departure';
    }
    return 'operation';
  }

  function generateBerthingRecommendation(
    depths: { time: Date; depth: number; tideType: string }[],
    requiredDepth: number,
    eta: Date,
    shipDraft: number,
  ): {
    canBerth: boolean;
    suggestedTime?: Date;
    reason: string;
  } {
    const etaDepth = depths.find((d) => d.time >= eta)?.depth;

    if (etaDepth && etaDepth >= requiredDepth) {
      return {
        canBerth: true,
        suggestedTime: eta,
        reason: `靠泊时水深充足(${etaDepth.toFixed(1)}m)，满足吃水要求(${shipDraft}m)`,
      };
    }

    const firstSafe = depths.find((d) => d.depth >= requiredDepth);
    if (firstSafe) {
      return {
        canBerth: true,
        suggestedTime: firstSafe.time,
        reason: `建议延后至${firstSafe.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}靠泊，届时水深${firstSafe.depth.toFixed(1)}m可满足要求`,
      };
    }

    const maxDepth = Math.max(...depths.map((d) => d.depth));
    return {
      canBerth: false,
      reason: `作业窗口内最大水深(${maxDepth.toFixed(1)}m)不足，无法满足吃水要求(${shipDraft}m + 0.5m余量)`,
    };
  }

  function generateDepartureRecommendation(
    depths: { time: Date; depth: number; tideType: string }[],
    requiredDepth: number,
    etd: Date,
    shipDraft: number,
  ): {
    canDepart: boolean;
    suggestedTime?: Date;
    reason: string;
  } {
    const reversedDepths = [...depths].reverse();
    const etdDepth = reversedDepths.find((d) => d.time <= etd)?.depth;

    if (etdDepth && etdDepth >= requiredDepth) {
      return {
        canDepart: true,
        suggestedTime: etd,
        reason: `离泊时水深充足(${etdDepth.toFixed(1)}m)，满足吃水要求(${shipDraft}m)`,
      };
    }

    const lastSafe = reversedDepths.find((d) => d.depth >= requiredDepth);
    if (lastSafe) {
      return {
        canDepart: true,
        suggestedTime: lastSafe.time,
        reason: `建议提前至${lastSafe.time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}离泊，届时水深${lastSafe.depth.toFixed(1)}m可满足要求`,
      };
    }

    const maxDepth = Math.max(...depths.map((d) => d.depth));
    return {
      canDepart: false,
      reason: `作业窗口内最大水深(${maxDepth.toFixed(1)}m)不足，无法满足吃水要求(${shipDraft}m + 0.5m余量)`,
    };
  }

  function getDepthStatus(depth: number, requiredDepth: number) {
    const margin = depth - requiredDepth;
    if (margin >= 1) return 'safe';
    if (margin >= 0) return 'warning';
    return 'danger';
  }

  return {
    analyzeShipTide,
    calculateAvailableDepth,
    getDepthStatus,
  };
}

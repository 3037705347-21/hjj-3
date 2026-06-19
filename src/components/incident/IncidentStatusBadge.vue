<script setup lang="ts">
import { computed } from 'vue';
import type { IncidentStatus, IncidentSeverity, IncidentType } from '../../types';
import { INCIDENT_STATUS_LABELS, INCIDENT_SEVERITY_LABELS, INCIDENT_TYPE_LABELS } from '../../types';

const props = defineProps<{
  type?: 'status' | 'severity' | 'type';
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  incidentType?: IncidentType;
  size?: 'sm' | 'md';
}>();

const label = computed(() => {
  if (props.type === 'status' && props.status) {
    return INCIDENT_STATUS_LABELS[props.status];
  }
  if (props.type === 'severity' && props.severity) {
    return INCIDENT_SEVERITY_LABELS[props.severity];
  }
  if (props.type === 'type' && props.incidentType) {
    return INCIDENT_TYPE_LABELS[props.incidentType];
  }
  return '';
});

const badgeClass = computed(() => {
  const sizeClass = props.size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  
  if (props.type === 'status' && props.status) {
    const colors: Record<IncidentStatus, string> = {
      reported: 'bg-harbor-yellow/20 text-harbor-yellow border-harbor-yellow/40',
      investigating: 'bg-harbor-blue/20 text-harbor-blue border-harbor-blue/40',
      handling: 'bg-harbor-orange/20 text-harbor-orange border-harbor-orange/40',
      resolved: 'bg-harbor-green/20 text-harbor-green border-harbor-green/40',
      closed: 'bg-console-600/50 text-console-300 border-console-500/40',
    };
    return `${sizeClass} ${colors[props.status]} border rounded-full font-mono`;
  }
  
  if (props.type === 'severity' && props.severity) {
    const colors: Record<IncidentSeverity, string> = {
      critical: 'bg-harbor-red/20 text-harbor-red border-harbor-red/40 animate-pulse',
      major: 'bg-harbor-orange/20 text-harbor-orange border-harbor-orange/40',
      minor: 'bg-harbor-yellow/20 text-harbor-yellow border-harbor-yellow/40',
      warning: 'bg-harbor-blue/20 text-harbor-blue border-harbor-blue/40',
    };
    return `${sizeClass} ${colors[props.severity]} border rounded-full font-mono`;
  }
  
  if (props.type === 'type' && props.incidentType) {
    const colors: Record<IncidentType, string> = {
      weather: 'bg-harbor-blue/20 text-harbor-blue border-harbor-blue/40',
      equipment_failure: 'bg-harbor-orange/20 text-harbor-orange border-harbor-orange/40',
      schedule_delay: 'bg-harbor-yellow/20 text-harbor-yellow border-harbor-yellow/40',
      temporary_stop: 'bg-harbor-purple/20 text-harbor-purple border-harbor-purple/40',
      safety_event: 'bg-harbor-red/20 text-harbor-red border-harbor-red/40',
    };
    return `${sizeClass} ${colors[props.incidentType]} border rounded-full font-mono`;
  }
  
  return sizeClass;
});
</script>

<template>
  <span :class="badgeClass">
    {{ label }}
  </span>
</template>

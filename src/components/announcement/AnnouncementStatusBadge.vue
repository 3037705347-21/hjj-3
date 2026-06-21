<script setup lang="ts">
import { computed } from 'vue';
import type { AnnouncementType, AnnouncementStatus, AnnouncementScope } from '../../types';
import {
  ANNOUNCEMENT_TYPE_LABELS,
  ANNOUNCEMENT_STATUS_LABELS,
  ANNOUNCEMENT_STATUS_COLORS,
  ANNOUNCEMENT_SCOPE_LABELS,
} from '../../types';

const props = withDefaults(
  defineProps<{
    type: 'type' | 'status' | 'scope';
    announcementType?: AnnouncementType;
    status?: AnnouncementStatus;
    scope?: AnnouncementScope;
    size?: 'sm' | 'md';
  }>(),
  { size: 'sm' },
);

const label = computed(() => {
  if (props.type === 'type' && props.announcementType) {
    return ANNOUNCEMENT_TYPE_LABELS[props.announcementType];
  }
  if (props.type === 'status' && props.status) {
    return ANNOUNCEMENT_STATUS_LABELS[props.status];
  }
  if (props.type === 'scope' && props.scope) {
    return ANNOUNCEMENT_SCOPE_LABELS[props.scope];
  }
  return '';
});

const badgeClass = computed(() => {
  const sizeClass = props.size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  if (props.type === 'type' && props.announcementType) {
    const colors: Record<AnnouncementType, string> = {
      port_notice: 'bg-harbor-blue/15 text-harbor-blue border-harbor-blue/30',
      duty_reminder: 'bg-harbor-orange/15 text-harbor-orange border-harbor-orange/30',
      berth_adjust: 'bg-harbor-purple/15 text-harbor-purple border-harbor-purple/30',
      safety_warning: 'bg-harbor-red/15 text-harbor-red border-harbor-red/30',
      operation_guide: 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/30',
    };
    return `${sizeClass} ${colors[props.announcementType]} border rounded-full font-mono`;
  }

  if (props.type === 'status' && props.status) {
    const c = ANNOUNCEMENT_STATUS_COLORS[props.status];
    return `${sizeClass} ${c.bg} ${c.text} ${c.border} border rounded-full font-mono`;
  }

  if (props.type === 'scope' && props.scope) {
    const colors: Record<AnnouncementScope, string> = {
      all: 'bg-harbor-green/15 text-harbor-green border-harbor-green/30',
      berth_group: 'bg-harbor-yellow/15 text-harbor-yellow border-harbor-yellow/30',
      specific_berths: 'bg-harbor-cyan/15 text-harbor-cyan border-harbor-cyan/30',
    };
    return `${sizeClass} ${colors[props.scope]} border rounded-full font-mono`;
  }

  return sizeClass;
});
</script>

<template>
  <span :class="badgeClass">
    {{ label }}
  </span>
</template>

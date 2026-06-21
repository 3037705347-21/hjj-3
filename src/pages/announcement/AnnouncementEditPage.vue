<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useAnnouncementStore } from '../../stores/announcement';
import { USER_ROLE_LABELS } from '../../types';
import {
  type AnnouncementType,
  type AnnouncementScope,
  ANNOUNCEMENT_TYPE_LABELS,
  ANNOUNCEMENT_SCOPE_LABELS,
} from '../../types';
import {
  Anchor,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  ArrowLeft,
  Megaphone,
  MapPin,
  Pin,
  Calendar,
  Save,
  Send,
  X,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const announcementStore = useAnnouncementStore();
const router = useRouter();
const route = useRoute();

const currentTime = ref(new Date());
const selectedType = ref<AnnouncementType>('port_notice');
const selectedScope = ref<AnnouncementScope>('all');
const title = ref('');
const content = ref('');
const effectiveTime = ref('');
const expiryTime = ref('');
const selectedBerthIds = ref<string[]>([]);
const isPinned = ref(false);

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const announcementId = computed(() => route.params.id as string);
const announcement = computed(() =>
  announcementId.value
    ? announcementStore.getAnnouncementById(announcementId.value)
    : undefined,
);
const isEdit = computed(() => !!announcementId.value);

const typeOptions = computed(() =>
  Object.entries(ANNOUNCEMENT_TYPE_LABELS).map(([key, label]) => ({
    key: key as AnnouncementType,
    label,
  })),
);

const scopeOptions = computed(() =>
  Object.entries(ANNOUNCEMENT_SCOPE_LABELS).map(([key, label]) => ({
    key: key as AnnouncementScope,
    label,
  })),
);

const canSubmit = computed(() =>
  title.value.trim().length > 0 &&
  content.value.trim().length > 0 &&
  effectiveTime.value !== '' &&
  expiryTime.value !== '' &&
  new Date(expiryTime.value) > new Date(effectiveTime.value) &&
  (selectedScope.value !== 'specific_berths' || selectedBerthIds.value.length > 0),
);

const pageTitle = computed(() => (isEdit.value ? '编辑公告' : '新建公告'));

const validityValid = computed(() => {
  if (!effectiveTime.value || !expiryTime.value) return false;
  return new Date(expiryTime.value) > new Date(effectiveTime.value);
});

watch(
  announcement,
  (ann) => {
    if (!ann) return;
    selectedType.value = ann.type;
    selectedScope.value = ann.scope;
    title.value = ann.title;
    content.value = ann.content;
    effectiveTime.value = new Date(ann.effectiveTime).toISOString().slice(0, 16);
    expiryTime.value = new Date(ann.expiryTime).toISOString().slice(0, 16);
    selectedBerthIds.value = [...ann.relatedBerthIds];
    isPinned.value = ann.isPinned;
  },
  { immediate: true },
);

onMounted(() => {
  if (isEdit.value && announcement.value) {
    const ann = announcement.value;
    selectedType.value = ann.type;
    selectedScope.value = ann.scope;
    title.value = ann.title;
    content.value = ann.content;
    effectiveTime.value = new Date(ann.effectiveTime).toISOString().slice(0, 16);
    expiryTime.value = new Date(ann.expiryTime).toISOString().slice(0, 16);
    selectedBerthIds.value = [...ann.relatedBerthIds];
    isPinned.value = ann.isPinned;
  } else if (!isEdit.value) {
    effectiveTime.value = new Date().toISOString().slice(0, 16);
  }
});

function toggleBerth(berthId: string) {
  const idx = selectedBerthIds.value.indexOf(berthId);
  if (idx >= 0) {
    selectedBerthIds.value.splice(idx, 1);
  } else {
    selectedBerthIds.value.push(berthId);
  }
}

function handleSave() {
  const data = {
    title: title.value.trim(),
    type: selectedType.value,
    scope: selectedScope.value,
    effectiveTime: new Date(effectiveTime.value),
    expiryTime: new Date(expiryTime.value),
    content: content.value.trim(),
    relatedBerthIds: selectedBerthIds.value,
    isPinned: isPinned.value,
  };

  if (isEdit.value) {
    announcementStore.updateAnnouncement(announcementId.value, data);
    router.push(`/announcements/${announcementId.value}`);
  } else {
    const result = announcementStore.createAnnouncement(data);
    router.push(`/announcements/${result.id}`);
  }
}

function handlePublish() {
  const data = {
    title: title.value.trim(),
    type: selectedType.value,
    scope: selectedScope.value,
    effectiveTime: new Date(effectiveTime.value),
    expiryTime: new Date(expiryTime.value),
    content: content.value.trim(),
    relatedBerthIds: selectedBerthIds.value,
    isPinned: isPinned.value,
  };

  let id: string;
  if (isEdit.value) {
    announcementStore.updateAnnouncement(announcementId.value, data);
    id = announcementId.value;
  } else {
    const result = announcementStore.createAnnouncement(data);
    id = result.id;
  }

  announcementStore.publishAnnouncement(id);
  router.push(`/announcements/${id}`);
}

function goBack() {
  router.push('/announcements');
}
</script>

<template>
  <div class="min-h-screen bg-console-900 console-grid-bg">
    <header class="sticky top-0 z-40 bg-console-900/90 backdrop-blur-xl border-b border-console-500/30">
      <div class="flex items-center justify-between px-6 py-3">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-harbor-cyan to-harbor-orange flex items-center justify-center shadow-glow-cyan">
              <Anchor class="w-5 h-5 text-console-900" />
            </div>
            <div>
              <h1 class="font-mono text-lg font-bold text-console-100 tracking-wider glow-text-cyan">
                PORTOS
              </h1>
              <p class="text-[9px] font-mono text-console-400 uppercase tracking-widest">
                Berth Operations Control System
              </p>
            </div>
          </div>
          <div class="h-8 w-px bg-console-500/30 mx-2" />
          <nav class="flex items-center gap-1">
            <button
              @click="router.push('/')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              运营控制台
            </button>
            <button
              @click="router.push('/logs')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
            >
              <History class="w-3.5 h-3.5" />
              调度日志
            </button>
            <button
              @click="router.push('/announcements')"
              class="px-3 py-1.5 rounded text-xs font-mono font-medium bg-harbor-orange/15 text-harbor-orange border border-harbor-orange/30 shadow-glow-orange flex items-center gap-1.5"
            >
              <Megaphone class="w-3.5 h-3.5" />
              港区公告
            </button>
          </nav>
        </div>

        <div class="flex items-center gap-4">
          <div class="text-right">
            <p class="font-mono text-sm text-console-100 tabular-nums">
              {{ format(currentTime, 'yyyy-MM-dd HH:mm:ss', { locale: zhCN }) }}
            </p>
            <p class="text-[10px] font-mono text-console-400 uppercase tracking-wider">
              系统运行中
            </p>
          </div>

          <div class="h-8 w-px bg-console-500/30" />

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
            <Bell class="w-4 h-4" />
          </button>

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
            <RefreshCw class="w-4 h-4" />
          </button>

          <button class="w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-console-100 hover:border-console-400/50 transition-all">
            <Settings class="w-4 h-4" />
          </button>

          <div class="flex items-center gap-2 pl-2 border-l border-console-500/30">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-harbor-orange to-harbor-red flex items-center justify-center">
              <User class="w-4 h-4 text-white" />
            </div>
            <div>
              <p class="text-xs font-mono font-medium text-console-100">
                {{ authStore.currentUser?.displayName || store.currentOperator }}
              </p>
              <p class="text-[9px] font-mono text-console-400">
                {{ authStore.currentUser ? USER_ROLE_LABELS[authStore.currentUser.role] : '调度员' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="p-4 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            @click="goBack"
            class="w-8 h-8 rounded flex items-center justify-center text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all"
          >
            <ArrowLeft class="w-4 h-4" />
          </button>
          <div>
            <div class="flex items-center gap-2">
              <Megaphone class="w-5 h-5 text-harbor-orange" />
              <h2 class="font-mono text-lg font-bold text-console-100">{{ pageTitle }}</h2>
              <span v-if="isEdit && announcement" class="text-xs font-mono text-console-500">
                {{ announcement.announcementNo }}
              </span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            :disabled="!canSubmit"
            @click="handleSave"
            class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-cyan/20 text-harbor-cyan border border-harbor-cyan/30 hover:bg-harbor-cyan/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Save class="w-3.5 h-3.5" />
            保存草稿
          </button>
          <button
            :disabled="!canSubmit"
            @click="handlePublish"
            class="px-4 py-1.5 rounded text-xs font-mono font-medium bg-harbor-orange/20 text-harbor-orange border border-harbor-orange/30 hover:bg-harbor-orange/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <Send class="w-3.5 h-3.5" />
            发布
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <label class="block text-xs font-mono text-console-300 mb-1.5">公告标题</label>
            <input
              v-model="title"
              type="text"
              placeholder="请输入公告标题"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <label class="block text-xs font-mono text-console-300 mb-1.5">公告内容</label>
            <textarea
              v-model="content"
              rows="10"
              placeholder="请输入公告内容..."
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
            />
          </div>
        </div>

        <div class="space-y-4">
          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <label class="block text-xs font-mono text-console-300 mb-1.5">公告类型</label>
            <select
              v-model="selectedType"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            >
              <option
                v-for="opt in typeOptions"
                :key="opt.key"
                :value="opt.key"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <label class="block text-xs font-mono text-console-300 mb-1.5">发布范围</label>
            <select
              v-model="selectedScope"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            >
              <option
                v-for="opt in scopeOptions"
                :key="opt.key"
                :value="opt.key"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <label class="block text-xs font-mono text-console-300 mb-1.5 flex items-center gap-1.5">
              <Calendar class="w-3.5 h-3.5" />
              生效时间
            </label>
            <input
              v-model="effectiveTime"
              type="datetime-local"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <label class="block text-xs font-mono text-console-300 mb-1.5 flex items-center gap-1.5">
              <Calendar class="w-3.5 h-3.5" />
              失效时间
            </label>
            <input
              v-model="expiryTime"
              type="datetime-local"
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 focus:outline-none focus:border-harbor-cyan/50"
            />
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <label class="flex items-center gap-2 cursor-pointer select-none">
              <div
                class="relative w-8 h-4 rounded-full transition-all"
                :class="isPinned ? 'bg-harbor-orange/60' : 'bg-console-600'"
                @click="isPinned = !isPinned"
              >
                <div
                  class="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                  :class="isPinned ? 'left-4.5 bg-harbor-orange' : 'left-0.5 bg-console-400'"
                />
              </div>
              <span class="text-xs font-mono text-console-300 flex items-center gap-1.5">
                <Pin class="w-3.5 h-3.5" />
                置顶公告
              </span>
            </label>
          </div>

          <div v-if="selectedScope === 'specific_berths'" class="panel-border rounded-lg p-4 bg-console-800/20">
            <label class="block text-xs font-mono text-console-300 mb-2 flex items-center gap-1.5">
              <MapPin class="w-3.5 h-3.5" />
              关联泊位
            </label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="berth in store.sortedBerths"
                :key="berth.id"
                @click="toggleBerth(berth.id)"
                :class="[
                  'px-3 py-1.5 rounded text-xs font-mono border transition-all',
                  selectedBerthIds.includes(berth.id)
                    ? 'bg-harbor-cyan/20 text-harbor-cyan border-harbor-cyan/40'
                    : 'bg-console-800/60 text-console-300 border-console-500/30 hover:border-console-400/50',
                ]"
              >
                {{ berth.name }}
              </button>
            </div>
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <Calendar class="w-4 h-4 text-harbor-cyan" />
              有效期预览
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-console-500">生效时间</span>
                <span class="text-console-200 font-mono">
                  {{ effectiveTime ? format(new Date(effectiveTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '-' }}
                </span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">失效时间</span>
                <span class="text-console-200 font-mono">
                  {{ expiryTime ? format(new Date(expiryTime), 'yyyy-MM-dd HH:mm', { locale: zhCN }) : '-' }}
                </span>
              </div>
              <div class="flex justify-between text-xs pt-1 border-t border-console-500/20">
                <span class="text-console-500">有效期</span>
                <span
                  v-if="effectiveTime && expiryTime"
                  :class="['font-mono', validityValid ? 'text-harbor-green' : 'text-harbor-red']"
                >
                  {{ validityValid ? '有效' : '失效时间必须晚于生效时间' }}
                </span>
                <span v-else class="text-console-500">未设置</span>
              </div>
            </div>
          </div>

          <div
            v-if="isEdit && announcement && announcement.status === 'published'"
            class="p-3 rounded bg-harbor-yellow/10 border border-harbor-yellow/30"
          >
            <p class="text-xs font-mono text-harbor-yellow flex items-start gap-2">
              <X class="w-4 h-4 mt-0.5 shrink-0" />
              <span>此公告已发布，无法编辑。仅草稿状态的公告可进行修改。</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useScheduleStore } from '../../stores/schedule';
import { useAuthStore } from '../../stores/auth';
import { useAnnouncementStore } from '../../stores/announcement';
import { USER_ROLE_LABELS } from '../../types';
import type { AnnouncementStatus } from '../../types';
import AnnouncementStatusBadge from '../../components/announcement/AnnouncementStatusBadge.vue';
import {
  Anchor,
  History,
  User,
  RefreshCw,
  Settings,
  Bell,
  ArrowLeft,
  Megaphone,
  Clock,
  User as UserIcon,
  MapPin,
  FileText,
  CheckCircle2,
  XCircle,
  Edit3,
  Pin,
  Calendar,
  AlertCircle,
} from 'lucide-vue-next';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const store = useScheduleStore();
const authStore = useAuthStore();
const announcementStore = useAnnouncementStore();
const router = useRouter();
const route = useRoute();

const currentTime = ref(new Date());
const showRevokeModal = ref(false);
const revokeReason = ref('');

onMounted(() => {
  setInterval(() => {
    currentTime.value = new Date();
  }, 1000);
});

const announcementId = computed(() => route.params.id as string);
const announcement = computed(() => announcementStore.getAnnouncementById(announcementId.value));

const canEdit = computed(() => {
  if (!announcement.value) return false;
  return announcement.value.status === 'draft';
});

const canPublish = computed(() => {
  if (!announcement.value) return false;
  return announcement.value.status === 'draft';
});

const canRevoke = computed(() => {
  if (!announcement.value) return false;
  return announcement.value.status === 'published';
});

const canEditPage = computed(() => {
  if (!announcement.value) return false;
  return announcement.value.status === 'draft';
});

const isCurrentlyEffective = computed(() => {
  if (!announcement.value) return false;
  const now = new Date();
  const effective = new Date(announcement.value.effectiveTime);
  const expiry = new Date(announcement.value.expiryTime);
  return now >= effective && now <= expiry;
});

function formatDateTime(date?: Date | string): string {
  if (!date) return '-';
  return format(new Date(date), 'yyyy-MM-dd HH:mm', { locale: zhCN });
}

function publishAnnouncement() {
  announcementStore.publishAnnouncement(announcementId.value);
}

function revokeAnnouncement() {
  if (!revokeReason.value.trim()) return;
  announcementStore.revokeAnnouncement(announcementId.value, revokeReason.value.trim());
  revokeReason.value = '';
  showRevokeModal.value = false;
}

function togglePin() {
  announcementStore.togglePin(announcementId.value);
}

function goBack() {
  router.push('/announcements');
}

function editAnnouncement() {
  router.push(`/announcements/${announcementId.value}/edit`);
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

          <button
            @click="router.push('/announcements')"
            class="relative w-9 h-9 rounded-lg bg-console-800/60 border border-console-500/40 flex items-center justify-center text-console-300 hover:text-harbor-orange hover:border-harbor-orange/40 transition-all"
          >
            <Bell class="w-4 h-4" />
            <span
              v-if="announcementStore.activeAnnouncements.length > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-harbor-orange text-white text-[9px] font-mono font-bold flex items-center justify-center animate-pulse"
            >
              {{ announcementStore.activeAnnouncements.length }}
            </span>
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

    <main class="p-4 space-y-4" v-if="announcement">
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
              <Pin
                v-if="announcement.isPinned"
                class="w-5 h-5 text-harbor-orange"
              />
              <h2 class="font-mono text-lg font-bold text-console-100">
                {{ announcement.title }}
              </h2>
            </div>
            <div class="flex items-center gap-3 mt-1">
              <span class="text-xs font-mono text-harbor-cyan">{{ announcement.announcementNo }}</span>
              <AnnouncementStatusBadge type="type" :announcement-type="announcement.type" size="sm" />
              <AnnouncementStatusBadge type="scope" :scope="announcement.scope" size="sm" />
              <AnnouncementStatusBadge type="status" :status="announcement.status" size="sm" />
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            v-if="canEditPage"
            @click="editAnnouncement"
            class="px-3 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 hover:text-console-100 transition-all flex items-center gap-1.5"
          >
            <Edit3 class="w-3 h-3" />
            编辑
          </button>

          <button
            v-if="canPublish"
            @click="publishAnnouncement"
            class="px-3 py-1.5 rounded text-xs font-mono bg-harbor-green/20 text-harbor-green border border-harbor-green/30 hover:bg-harbor-green/30 transition-all flex items-center gap-1.5"
          >
            <CheckCircle2 class="w-3 h-3" />
            发布
          </button>

          <button
            v-if="canRevoke"
            @click="showRevokeModal = true"
            class="px-3 py-1.5 rounded text-xs font-mono bg-harbor-red/15 text-harbor-red border border-harbor-red/30 hover:bg-harbor-red/25 transition-all flex items-center gap-1.5"
          >
            <XCircle class="w-3 h-3" />
            撤回
          </button>

          <button
            v-if="canRevoke"
            @click="togglePin"
            class="px-3 py-1.5 rounded text-xs font-mono text-harbor-orange border border-harbor-orange/30 hover:bg-harbor-orange/10 transition-all flex items-center gap-1.5"
          >
            <Pin class="w-3 h-3" />
            {{ announcement.isPinned ? '取消置顶' : '置顶' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2 space-y-4">
          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <FileText class="w-4 h-4 text-harbor-orange" />
              公告内容
            </h3>
            <p class="text-sm text-console-300 leading-relaxed whitespace-pre-wrap">
              {{ announcement.content }}
            </p>
          </div>

          <div
            v-if="announcement.relatedBerthIds.length > 0"
            class="panel-border rounded-lg p-4 bg-console-800/20"
          >
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <MapPin class="w-4 h-4 text-harbor-orange" />
              关联泊位
            </h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="berthId in announcement.relatedBerthIds"
                :key="berthId"
                class="px-2 py-1 rounded text-xs font-mono bg-harbor-cyan/10 text-harbor-cyan border border-harbor-cyan/30"
              >
                {{ store.getBerthById(berthId)?.name || berthId }}
              </span>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <Clock class="w-4 h-4 text-harbor-cyan" />
              时间信息
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-console-500">生效时间</span>
                <span class="text-console-200 font-mono">{{ formatDateTime(announcement.effectiveTime) }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">失效时间</span>
                <span class="text-console-200 font-mono">{{ formatDateTime(announcement.expiryTime) }}</span>
              </div>
              <div v-if="announcement.publishedAt" class="flex justify-between text-xs">
                <span class="text-console-500">发布时间</span>
                <span class="text-harbor-green font-mono">{{ formatDateTime(announcement.publishedAt) }}</span>
              </div>
              <div v-if="announcement.revokedAt" class="flex justify-between text-xs">
                <span class="text-console-500">撤回时间</span>
                <span class="text-harbor-red font-mono">{{ formatDateTime(announcement.revokedAt) }}</span>
              </div>
            </div>
          </div>

          <div v-if="announcement.publisher" class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <UserIcon class="w-4 h-4 text-harbor-cyan" />
              发布人
            </h3>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full bg-gradient-to-br from-harbor-orange to-harbor-red flex items-center justify-center">
                <UserIcon class="w-3 h-3 text-white" />
              </div>
              <span class="text-xs text-console-200 font-mono">{{ announcement.publisher }}</span>
            </div>
          </div>

          <div class="panel-border rounded-lg p-4 bg-console-800/20">
            <h3 class="text-xs font-mono font-medium text-console-200 mb-3 flex items-center gap-2">
              <Calendar class="w-4 h-4 text-harbor-cyan" />
              有效性状态
            </h3>
            <div class="flex items-center gap-2">
              <CheckCircle2 v-if="isCurrentlyEffective && announcement.status === 'published'" class="w-4 h-4 text-harbor-green" />
              <AlertCircle v-else class="w-4 h-4 text-harbor-yellow" />
              <span
                :class="[
                  'text-xs font-mono',
                  isCurrentlyEffective && announcement.status === 'published'
                    ? 'text-harbor-green'
                    : 'text-harbor-yellow',
                ]"
              >
                {{ isCurrentlyEffective && announcement.status === 'published' ? '当前生效中' : '当前未生效' }}
              </span>
            </div>
          </div>

          <div
            v-if="announcement.status === 'revoked'"
            class="panel-border rounded-lg p-4 bg-harbor-red/5 border-harbor-red/30"
          >
            <h3 class="text-xs font-mono font-medium text-harbor-red mb-3 flex items-center gap-2">
              <XCircle class="w-4 h-4" />
              撤回信息
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-xs">
                <span class="text-console-500">撤回人</span>
                <span class="text-console-200 font-mono">{{ announcement.revokedBy || '-' }}</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-console-500">撤回时间</span>
                <span class="text-harbor-red font-mono">{{ formatDateTime(announcement.revokedAt) }}</span>
              </div>
              <div class="text-xs">
                <span class="text-console-500">撤回原因</span>
                <p class="text-console-300 mt-1 leading-relaxed">{{ announcement.revokeReason || '-' }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showRevokeModal" class="fixed inset-0 z-50 flex items-center justify-center">
      <div class="absolute inset-0 bg-console-900/80 backdrop-blur-sm" @click="showRevokeModal = false" />
      <div class="relative w-full max-w-lg panel-border rounded-xl shadow-2xl z-10">
        <div class="flex items-center justify-between px-5 py-4 border-b border-console-500/20">
          <h3 class="font-mono text-sm font-semibold text-console-100 flex items-center gap-2">
            <XCircle class="w-4 h-4 text-harbor-red" />
            撤回公告
          </h3>
          <button
            @click="showRevokeModal = false"
            class="w-7 h-7 rounded flex items-center justify-center text-console-400 hover:text-console-100 hover:bg-console-700/50 transition-all"
          >
            <XCircle class="w-4 h-4" />
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-xs font-mono text-console-300 mb-1.5">撤回原因</label>
            <textarea
              v-model="revokeReason"
              rows="4"
              placeholder="请输入撤回原因..."
              class="w-full px-3 py-2 rounded bg-console-800/60 border border-console-500/30 text-xs font-mono text-console-100 placeholder:text-console-500 focus:outline-none focus:border-harbor-cyan/50 resize-none"
            />
          </div>
          <div class="flex items-center justify-end gap-2">
            <button
              @click="showRevokeModal = false"
              class="px-4 py-1.5 rounded text-xs font-mono text-console-300 border border-console-500/30 hover:bg-console-700/50 transition-all"
            >
              取消
            </button>
            <button
              :disabled="!revokeReason.trim()"
              @click="revokeAnnouncement"
              class="px-4 py-1.5 rounded text-xs font-mono bg-harbor-red/20 text-harbor-red border border-harbor-red/30 hover:bg-harbor-red/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              确认撤回
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

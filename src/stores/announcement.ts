import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Announcement,
  AnnouncementType,
  AnnouncementScope,
  AnnouncementStatus,
} from '../types';
import { mockAnnouncements } from '../data/mock';
import { useAuthStore } from './auth';
import { useScheduleStore } from './schedule';

export const useAnnouncementStore = defineStore('announcement', () => {
  const announcements = ref<Announcement[]>([...mockAnnouncements]);

  const publishedAnnouncements = computed(() =>
    announcements.value
      .filter((a) => a.status === 'published')
      .sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime();
      }),
  );

  const pinnedAnnouncements = computed(() =>
    announcements.value.filter((a) => a.isPinned && a.status === 'published'),
  );

  const activeAnnouncements = computed(() =>
    announcements.value.filter((a) => a.status === 'published' || a.status === 'draft'),
  );

  const expiredAnnouncements = computed(() =>
    announcements.value.filter((a) => a.status === 'expired'),
  );

  function generateAnnouncementNo(): string {
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const existingToday = announcements.value.filter((a) =>
      a.announcementNo.includes(dateStr),
    ).length;
    const seq = String(existingToday + 1).padStart(3, '0');
    return `ANN-${dateStr}-${seq}`;
  }

  function getAnnouncementById(id: string): Announcement | undefined {
    return announcements.value.find((a) => a.id === id);
  }

  function createAnnouncement(data: {
    title: string;
    type: AnnouncementType;
    scope: AnnouncementScope;
    effectiveTime: Date;
    expiryTime: Date;
    content: string;
    relatedBerthIds: string[];
    isPinned: boolean;
  }): Announcement {
    const authStore = useAuthStore();
    const scheduleStore = useScheduleStore();

    const announcement: Announcement = {
      id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      announcementNo: generateAnnouncementNo(),
      title: data.title.trim(),
      type: data.type,
      scope: data.scope,
      effectiveTime: new Date(data.effectiveTime),
      expiryTime: new Date(data.expiryTime),
      publisher: authStore.currentUser?.displayName || scheduleStore.currentOperator,
      publisherId: authStore.currentUser?.id,
      content: data.content.trim(),
      relatedBerthIds: [...data.relatedBerthIds],
      isPinned: data.isPinned,
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    announcements.value.unshift(announcement);

    scheduleStore.addLog({
      type: 'create',
      description: `创建公告 ${announcement.announcementNo}（${announcement.title}）`,
      before: null,
      after: { announcementId: announcement.id, title: announcement.title, type: announcement.type },
    });

    return announcement;
  }

  function updateAnnouncement(
    id: string,
    data: Partial<{
      title: string;
      type: AnnouncementType;
      scope: AnnouncementScope;
      effectiveTime: Date;
      expiryTime: Date;
      content: string;
      relatedBerthIds: string[];
      isPinned: boolean;
    }>,
  ): Announcement | null {
    const announcement = announcements.value.find((a) => a.id === id);
    if (!announcement) return null;
    if (announcement.status !== 'draft') return null;

    if (data.title !== undefined) announcement.title = data.title.trim();
    if (data.type !== undefined) announcement.type = data.type;
    if (data.scope !== undefined) announcement.scope = data.scope;
    if (data.effectiveTime !== undefined) announcement.effectiveTime = new Date(data.effectiveTime);
    if (data.expiryTime !== undefined) announcement.expiryTime = new Date(data.expiryTime);
    if (data.content !== undefined) announcement.content = data.content.trim();
    if (data.relatedBerthIds !== undefined) announcement.relatedBerthIds = [...data.relatedBerthIds];
    if (data.isPinned !== undefined) announcement.isPinned = data.isPinned;
    announcement.updatedAt = new Date();

    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'update',
      description: `编辑公告 ${announcement.announcementNo}`,
      before: null,
      after: { announcementId: announcement.id },
    });

    return announcement;
  }

  function publishAnnouncement(id: string): Announcement | null {
    const announcement = announcements.value.find((a) => a.id === id);
    if (!announcement) return null;
    if (announcement.status !== 'draft') return null;

    announcement.status = 'published';
    announcement.publishedAt = new Date();
    announcement.updatedAt = new Date();

    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'status_change',
      description: `发布公告 ${announcement.announcementNo}（${announcement.title}）`,
      before: { status: 'draft' },
      after: { status: 'published' },
    });

    return announcement;
  }

  function revokeAnnouncement(id: string, reason: string): Announcement | null {
    const announcement = announcements.value.find((a) => a.id === id);
    if (!announcement) return null;
    if (announcement.status !== 'published') return null;

    const authStore = useAuthStore();
    announcement.status = 'revoked';
    announcement.revokedAt = new Date();
    announcement.revokedBy = authStore.currentUser?.displayName || '系统';
    announcement.revokeReason = reason;
    announcement.updatedAt = new Date();

    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'status_change',
      description: `撤回公告 ${announcement.announcementNo}（${announcement.title}），原因：${reason}`,
      before: { status: 'published' },
      after: { status: 'revoked' },
    });

    return announcement;
  }

  function togglePin(id: string): Announcement | null {
    const announcement = announcements.value.find((a) => a.id === id);
    if (!announcement) return null;
    if (announcement.status !== 'published') return null;

    announcement.isPinned = !announcement.isPinned;
    announcement.updatedAt = new Date();

    const scheduleStore = useScheduleStore();
    scheduleStore.addLog({
      type: 'update',
      description: `${announcement.isPinned ? '置顶' : '取消置顶'}公告 ${announcement.announcementNo}`,
      before: { isPinned: !announcement.isPinned },
      after: { isPinned: announcement.isPinned },
    });

    return announcement;
  }

  function checkExpiry(): void {
    const now = new Date();
    announcements.value.forEach((a) => {
      if (a.status === 'published' && new Date(a.expiryTime) < now) {
        a.status = 'expired';
        a.updatedAt = new Date();
      }
    });
  }

  function filterAnnouncements(options?: {
    type?: AnnouncementType;
    scope?: AnnouncementScope;
    status?: AnnouncementStatus;
    keyword?: string;
    berthId?: string;
    pinnedOnly?: boolean;
  }): Announcement[] {
    let result = [...announcements.value];

    if (options?.type) {
      result = result.filter((a) => a.type === options.type);
    }
    if (options?.scope) {
      result = result.filter((a) => a.scope === options.scope);
    }
    if (options?.status) {
      result = result.filter((a) => a.status === options.status);
    }
    if (options?.berthId) {
      result = result.filter((a) => a.relatedBerthIds.includes(options.berthId!));
    }
    if (options?.pinnedOnly) {
      result = result.filter((a) => a.isPinned);
    }
    if (options?.keyword) {
      const kw = options.keyword.toLowerCase();
      result = result.filter(
        (a) =>
          a.announcementNo.toLowerCase().includes(kw) ||
          a.title.toLowerCase().includes(kw) ||
          a.content.toLowerCase().includes(kw) ||
          a.publisher.toLowerCase().includes(kw),
      );
    }

    return result.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  function getAnnouncementsByBerthId(berthId: string): Announcement[] {
    const now = new Date();
    return announcements.value.filter(
      (a) =>
        (a.status === 'published' || a.status === 'draft') &&
        (a.scope === 'all' || a.relatedBerthIds.includes(berthId)) &&
        new Date(a.expiryTime) > now,
    );
  }

  checkExpiry();

  return {
    announcements,
    publishedAnnouncements,
    pinnedAnnouncements,
    activeAnnouncements,
    expiredAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    publishAnnouncement,
    revokeAnnouncement,
    togglePin,
    checkExpiry,
    getAnnouncementById,
    filterAnnouncements,
    getAnnouncementsByBerthId,
  };
});

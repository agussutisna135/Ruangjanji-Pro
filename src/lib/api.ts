import { DashboardSummary, GuestRecord, InvitationData, InvitationRecord, RsvpWishRecord, ThemeItem } from '../shared/types.ts';

const TOKEN_STORAGE_KEY = 'rj_admin_token';

function getStoredToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function setStoredToken(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage restriction
  }
}

function getAuthHeaders(): Record<string, string> {
  const tok = getStoredToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });
  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { error: text };
  }
  if (!res.ok) {
    throw new Error(json.error || `Request failed (${res.status})`);
  }
  return json as T;
}

export async function downloadFileFromApi(url: string, fallbackFilename: string, options?: RequestInit): Promise<void> {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...(options?.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errMsg = `Gagal mengunduh file (${res.status})`;
    try {
      const json = await res.json();
      if (json?.error) errMsg = json.error;
    } catch {
      // ignore non-json error body
    }
    throw new Error(errMsg);
  }

  const blob = await res.blob();
  const disp = res.headers.get('content-disposition') || '';
  const fnMatch = disp.match(/filename="?([^";\n]+)"?/i);
  const filename = fnMatch?.[1] || fallbackFilename;

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
}

// Client-side image optimization via Canvas before uploading to server
export async function optimizeImageFile(file: File, maxDim = 1600, quality = 0.86): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }
  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size < 450 * 1024) {
        resolve(file);
        return;
      }
      const ratio = Math.min(maxDim / width, maxDim / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const ext = outputType === 'image/png' ? '.png' : '.jpg';
          const baseName = file.name.replace(/\.[^.]+$/, '');
          resolve(new File([blob], `${baseName}${ext}`, { type: outputType }));
        },
        outputType,
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export const api = {
  auth: {
    status: () => request<{ initialized: boolean; authenticated: boolean; admin: { id: string; username: string; email: string } | null }>('/api/auth/status'),
    setup: async (payload: { username: string; email: string; password: string; recoveryKey: string }) => {
      const res = await request<{ ok: boolean; token?: string; admin: { id: string; username: string; email: string } }>('/api/auth/setup', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.token) setStoredToken(res.token);
      return res;
    },
    login: async (payload: { username: string; password: string }) => {
      const res = await request<{ ok: boolean; token?: string; admin: { id: string; username: string; email: string } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.token) setStoredToken(res.token);
      return res;
    },
    logout: async () => {
      try {
        return await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
      } finally {
        setStoredToken(null);
      }
    },
    forgotPassword: (payload: { username: string; recoveryKey: string; newPassword: string }) =>
      request<{ ok: boolean; message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    changePassword: (payload: { currentPassword: string; newPassword: string; newRecoveryKey?: string }) =>
      request<{ ok: boolean }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  publicInvitations: {
    themes: () => request<ThemeItem[]>('/api/public/themes'),
    list: () => request<InvitationRecord[]>('/api/public/invitations'),
    getBySlug: (slug: string) =>
      request<{ invitation: InvitationRecord; wishes: RsvpWishRecord[] }>(`/api/public/invitations/${encodeURIComponent(slug)}`),
    exportHtml: (slug: string) =>
      downloadFileFromApi(`/api/public/invitations/${encodeURIComponent(slug)}/export-html`, 'contoh-undangan.html'),
    recordVisit: (slug: string, guestName: string) =>
      request<{ ok: boolean }>(`/api/public/invitations/${encodeURIComponent(slug)}/visit`, {
        method: 'POST',
        body: JSON.stringify({ guestName }),
      }),
    submitRsvp: (
      slug: string,
      payload: { guestName: string; attendance: 'hadir' | 'tidak_hadir' | 'ragu'; guestCount: number; message: string; whatsappConfirmed?: boolean }
    ) =>
      request<{ ok: boolean; wish: RsvpWishRecord }>(`/api/public/invitations/${encodeURIComponent(slug)}/rsvp`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  admin: {
    dashboard: () => request<DashboardSummary>('/api/admin/dashboard'),
    listInvitations: () => request<InvitationRecord[]>('/api/admin/invitations'),
    getInvitation: (id: string) => request<InvitationRecord>(`/api/admin/invitations/${id}`),
    createInvitation: (payload: { title: string; slug?: string; status?: 'draft' | 'published'; themeId?: number; data?: InvitationData }) =>
      request<InvitationRecord>('/api/admin/invitations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    updateInvitation: (id: string, payload: Partial<{ title: string; slug: string; status: 'draft' | 'published'; themeId: number; data: InvitationData }>) =>
      request<InvitationRecord>(`/api/admin/invitations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    deleteInvitation: (id: string) => request<{ ok: boolean }>(`/api/admin/invitations/${id}`, { method: 'DELETE' }),
    duplicateInvitation: (id: string) => request<InvitationRecord>(`/api/admin/invitations/${id}/duplicate`, { method: 'POST' }),

    exportInvitationHtml: (
      id: string,
      slug: string,
      livePayload?: Partial<{ title: string; slug: string; status: 'draft' | 'published'; themeId: number; data: InvitationData }>,
      filenameOverride?: string
    ) => {
      const qs = filenameOverride ? `?filename=${encodeURIComponent(filenameOverride)}` : '';
      const targetName = filenameOverride || `undangan-${slug}.html`;
      return livePayload
        ? downloadFileFromApi(`/api/admin/invitations/${id}/export-html${qs}`, targetName, {
            method: 'POST',
            body: JSON.stringify(livePayload),
          })
        : downloadFileFromApi(`/api/admin/invitations/${id}/export-html${qs}`, targetName);
    },

    exportAdminHtml: () => downloadFileFromApi('/api/admin/export-html', 'admin-undangan.html'),
    downloadBackup: () =>
      downloadFileFromApi('/api/admin/backup', `ruangjanji-backup-${new Date().toISOString().slice(0, 10)}.json`),
    exportGuestsExcel: (invId: string, slug: string) =>
      downloadFileFromApi(`/api/admin/invitations/${invId}/guests/export`, `daftar-tamu-${slug}.xlsx`),

    uploadFile: async (file: File) => {
      const optimized = file.type.startsWith('image/') ? await optimizeImageFile(file) : file;
      const fd = new FormData();
      fd.append('file', optimized);
      return request<{ url: string; filename: string; mimetype: string; size: number }>('/api/admin/upload', {
        method: 'POST',
        body: fd,
      });
    },

    listGuests: (invId: string) => request<GuestRecord[]>(`/api/admin/invitations/${invId}/guests`),
    addGuest: (invId: string, payload: { name: string; phone?: string; groupName?: string; pax?: number }) =>
      request<GuestRecord>(`/api/admin/invitations/${invId}/guests`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteGuest: (guestId: string) => request<{ ok: boolean }>(`/api/admin/guests/${guestId}`, { method: 'DELETE' }),
    importGuests: (invId: string, file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return request<{ ok: boolean; imported: number }>(`/api/admin/invitations/${invId}/guests/import`, {
        method: 'POST',
        body: fd,
      });
    },

    listWishes: (invId: string) => request<RsvpWishRecord[]>(`/api/admin/invitations/${invId}/wishes`),
    moderateWish: (wishId: string, isApproved: boolean) =>
      request<{ ok: boolean }>(`/api/admin/wishes/${wishId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isApproved }),
      }),
    deleteWish: (wishId: string) => request<{ ok: boolean }>(`/api/admin/wishes/${wishId}`, { method: 'DELETE' }),

    restoreBackup: (backupJson: any) =>
      request<{ ok: boolean; restoredInvitations: number }>('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify(backupJson),
      }),
  },
};

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';

export type PushStatus = 'unsupported' | 'denied' | 'default' | 'off' | 'enabled';

/**
 * Web Push: đăng ký service worker (/push-sw.js) + subscription với khoá VAPID từ server.
 * Bật/tắt từ trang Cấu hình. Lỗi im lặng — tính năng phụ, không được làm hỏng app.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  status = signal<PushStatus>('off');

  get supported(): boolean {
    return typeof window !== 'undefined'
      && 'serviceWorker' in navigator
      && 'PushManager' in window
      && 'Notification' in window;
  }

  /** Gọi khi đã đăng nhập: đăng ký SW + đồng bộ subscription có sẵn (nếu user đã cấp quyền). */
  async init(): Promise<void> {
    if (!this.auth.isLoggedIn()) return;
    if (!this.supported) { this.status.set('unsupported'); return; }
    try {
      await navigator.serviceWorker.register('/push-sw.js');
      if (Notification.permission === 'denied') { this.status.set('denied'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        this.status.set('enabled');
        await this.sync(sub);
      } else {
        this.status.set(Notification.permission === 'granted' ? 'off' : 'default');
      }
    } catch { /* bỏ qua */ }
  }

  /** Bật thông báo đẩy — cần gọi từ click của user (trình duyệt hỏi quyền). */
  async enable(): Promise<void> {
    if (!this.supported || !this.auth.isLoggedIn()) return;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { this.status.set('denied'); return; }
      const reg = await navigator.serviceWorker.ready;
      const res = await firstValueFrom(this.http.get<any>('/api/push/publickey'));
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlB64ToUint8Array(res.data),
      });
      await this.sync(sub);
      this.status.set('enabled');
    } catch {
      this.status.set('off');
    }
  }

  /** Tắt: huỷ subscription cả phía trình duyệt lẫn server. */
  async disable(): Promise<void> {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        firstValueFrom(this.http.post('/api/push/unsubscribe', { endpoint: sub.endpoint }))
          .catch(() => {});
        await sub.unsubscribe();
      }
    } catch { /* bỏ qua */ }
    this.status.set('off');
  }

  private async sync(sub: PushSubscription): Promise<void> {
    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
    firstValueFrom(this.http.post('/api/push/subscribe', {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    })).catch(() => {});
  }

  private urlB64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
    return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
  }
}

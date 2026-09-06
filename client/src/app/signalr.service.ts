import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export interface NotiEvent { body: string; link?: string | null; }

/**
 * SignalR realtime: server đẩy sự kiện "notification" qua /hub/notifications.
 * Mất kết nối tự reconnect; khi offline app vẫn hoạt động như trước (polling 60s).
 */
@Injectable({ providedIn: 'root' })
export class SignalrService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  connected = signal(false);
  private conn: HubConnection | null = null;
  private onNotification: ((n: NotiEvent) => void) | null = null;

  /** Đăng ký người nhận sự kiện (gọi 1 lần từ app.component). */
  listen(handler: (n: NotiEvent) => void) { this.onNotification = handler; }

  /** Gọi sau khi đăng nhập. Lỗi im lặng — polling vẫn chạy nền. */
  async start(): Promise<void> {
    if (!this.auth.isLoggedIn()) return;
    this.stop(); // đảm bảo không có kết nối cũ với token cũ

    const conn = new HubConnectionBuilder()
      .withUrl('/hub/notifications', {
        accessTokenFactory: () => this.auth.token(),
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.Warning)
      .build();

    conn.on('notification', (n: NotiEvent) => {
      this.onNotification?.(n);
    });
    conn.onreconnected(() => this.connected.set(true));
    conn.onclose(() => this.connected.set(false));

    try {
      await conn.start();
      this.connected.set(true);
      this.conn = conn;
    } catch { this.connected.set(false); }
  }

  stop(): void {
    if (this.conn) {
      this.conn.stop().catch(() => {});
      this.conn = null;
    }
    this.connected.set(false);
  }

  state(): HubConnectionState { return this.conn?.state ?? HubConnectionState.Disconnected; }
}

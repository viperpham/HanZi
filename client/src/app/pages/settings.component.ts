import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../toast.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="space-y-5 max-w-2xl">
      <div>
        <h1 class="text-2xl font-extrabold text-base-content">Cấu hình</h1>
        <p class="text-sm text-base-content/50 mt-0.5">Thông tin hệ thống và tuỳ chọn ứng dụng</p>
      </div>

      <!-- Thông tin hệ thống -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-5 gap-3">
          <h2 class="font-bold text-base-content flex items-center gap-2">
            <i class="fa-solid fa-circle-info text-base-content/50"></i> Thông tin hệ thống
          </h2>
          <div class="rounded-xl border border-base-200 divide-y divide-base-200 text-sm">
            @for (row of systemRows; track row.label) {
              <div class="flex items-center gap-3 px-4 py-2.5">
                <span class="text-base-content/50 grow">{{ row.label }}</span>
                <span class="font-semibold text-base-content text-right">{{ row.value }}</span>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Phiên đăng nhập -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-5 gap-3">
          <h2 class="font-bold text-base-content flex items-center gap-2">
            <i class="fa-solid fa-id-card text-base-content/50"></i> Phiên đăng nhập
          </h2>
          @if (auth.user(); as u) {
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center text-error font-bold shrink-0">
                {{ initials(u.fullName) }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-bold text-base-content">{{ u.fullName }}</p>
                <p class="text-xs text-base-content/40">{{ u.email }} · {{ u.role }}</p>
              </div>
            </div>
          }
          <div class="flex gap-2">
            <button (click)="refreshNotis()" class="btn btn-outline btn-sm gap-2">
              <i class="fa-solid fa-rotate"></i> Làm mới thông báo
            </button>
            <button (click)="logout()" class="btn btn-error btn-sm text-white gap-2">
              <i class="fa-solid fa-arrow-right-from-bracket"></i> Đăng xuất
            </button>
          </div>
        </div>
      </div>

      <!-- Tuỳ chọn ứng dụng (lưu tại máy này) -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-5 gap-3">
          <h2 class="font-bold text-base-content flex items-center gap-2">
            <i class="fa-solid fa-sliders text-base-content/50"></i> Tuỳ chọn ứng dụng
            <span class="badge badge-ghost badge-sm text-[10px]">chỉ lưu trên máy này</span>
          </h2>
          <label class="flex cursor-pointer items-center gap-3 text-sm font-semibold">
            <input type="checkbox" class="toggle toggle-sm toggle-error" [checked]="notifyPoll"
              (change)="setNotifyPoll($any($event.target)?.checked)" />
            Tự động làm mới thông báo mỗi phút
          </label>
          <label class="flex cursor-pointer items-center gap-3 text-sm font-semibold">
            <input type="checkbox" class="toggle toggle-sm toggle-error" [checked]="slowTts"
              (change)="setSlowTts($any($event.target)?.checked)" />
            Mặc định đọc chậm (slow mode) khi nghe phát âm
          </label>
        </div>
      </div>
    </div>
  `
})
export class SettingsComponent {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  systemRows = [
    { label: 'Ứng dụng', value: 'HanZi LMS — Web' },
    { label: 'Máy chủ API', value: typeof location !== 'undefined' ? location.origin : '' },
    { label: 'Nguồn từ điển', value: 'pinyin-pro · TTS hệ thống' },
    { label: 'Giao diện', value: 'DaisyUI · Font Awesome 6' },
  ];

  get notifyPoll() { return localStorage.getItem('hz_setting_notifypoll') !== '0'; }
  get slowTts() { return localStorage.getItem('hz_setting_slowtts') === '1'; }

  initials(name: string) {
    return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || '?';
  }

  refreshNotis() {
    this.http.get<any>('/api/notifications/mine').subscribe({
      next: (res) => this.toast.success(`Thông báo mới nhất: ${res.data?.length ?? 0} mục.`),
      error: () => this.toast.error('Không kết nối được máy chủ.')
    });
  }

  logout() {
    this.auth.logout();
    this.toast.success('Đã đăng xuất.');
    location.href = '/login';
  }

  setNotifyPoll(v: boolean | undefined) {
    if (v === undefined) return;
    localStorage.setItem('hz_setting_notifypoll', v ? '1' : '0');
    this.toast.success('Đã lưu tuỳ chọn.');
  }

  setSlowTts(v: boolean | undefined) {
    if (v === undefined) return;
    localStorage.setItem('hz_setting_slowtts', v ? '1' : '0');
    this.toast.success('Đã lưu tuỳ chọn.');
  }
}

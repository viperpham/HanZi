import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { ToastService } from '../toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen flex flex-col lg:flex-row">

      <!-- ===== LEFT PANEL — Branding ===== -->
      <div class="lg:w-[45%] bg-gradient-to-br from-red-700 via-red-600 to-rose-500
                  flex flex-col items-center justify-center p-10 text-white relative overflow-hidden">

        <!-- Decorative circles -->
        <div class="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-white/5"></div>
        <div class="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5"></div>
        <div class="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-white/5"></div>

        <div class="relative z-10 max-w-sm text-center lg:text-left">
          <!-- Logo chữ Hán -->
          <div class="hanzi text-[7rem] leading-none font-black mb-6
                      drop-shadow-2xl select-none">汉</div>

          <h1 class="text-4xl font-extrabold leading-tight mb-2">HanZi LMS</h1>
          <p class="text-red-100 text-base mb-8">
            Hệ thống dạy &amp; học tiếng Trung<br>theo giáo trình chuẩn HSK
          </p>

          <ul class="space-y-3 text-sm text-red-100">
            <li class="flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-white/20 shrink-0">
                <i class="fa-solid fa-book-open text-xs"></i>
              </span>
              Giáo trình bài học có cấu trúc rõ ràng
            </li>
            <li class="flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-white/20 shrink-0">
                <i class="fa-solid fa-chalkboard-user text-xs"></i>
              </span>
              Quản lý lớp học &amp; học viên
            </li>
            <li class="flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-white/20 shrink-0">
                <i class="fa-solid fa-circle-check text-xs"></i>
              </span>
              Chấm bài tự động &amp; theo dõi tiến độ
            </li>
            <li class="flex items-center gap-3">
              <span class="grid h-7 w-7 place-items-center rounded-full bg-white/20 shrink-0">
                <i class="fa-solid fa-volume-high text-xs"></i>
              </span>
              Text-to-speech phát âm chuẩn
            </li>
          </ul>
        </div>
      </div>

      <!-- ===== RIGHT PANEL — Form ===== -->
      <div class="flex-1 flex flex-col items-center justify-center p-8 bg-base-100">
        <div class="w-full max-w-sm">

          <!-- Mobile logo (chỉ hiện trên mobile) -->
          <div class="lg:hidden text-center mb-8">
            <div class="hanzi inline-grid h-16 w-16 place-items-center rounded-2xl
                        bg-error text-white text-3xl font-black shadow-lg mb-3">汉</div>
            <p class="text-sm text-base-content/50">HanZi LMS</p>
          </div>

          @if (mode() === 'login') {
            <div>
              <h2 class="text-2xl font-extrabold text-base-content mb-1">Chào mừng trở lại</h2>
              <p class="text-sm text-base-content/50 mb-7">Đăng nhập để tiếp tục học</p>

              <form (ngSubmit)="submit()" class="space-y-4">
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-sm font-semibold">Email</legend>
                  <label class="input flex items-center gap-2 w-full focus-within:input-error">
                    <i class="fa-solid fa-envelope text-base-content/40 fa-sm"></i>
                    <input [(ngModel)]="email" name="email" type="email"
                      placeholder="you@email.com" class="grow" autocomplete="email" />
                  </label>
                </fieldset>

                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-sm font-semibold">Mật khẩu</legend>
                  <label class="input flex items-center gap-2 w-full focus-within:input-error">
                    <i class="fa-solid fa-lock text-base-content/40 fa-sm"></i>
                    <input [(ngModel)]="password" name="password"
                      [type]="showPw() ? 'text' : 'password'"
                      placeholder="••••••" class="grow" autocomplete="current-password" />
                    <button type="button" (click)="showPw.set(!showPw())"
                      class="text-base-content/40 hover:text-base-content transition-colors">
                      <i class="fa-solid {{ showPw() ? 'fa-eye-slash' : 'fa-eye' }} fa-sm"></i>
                    </button>
                  </label>
                </fieldset>

                @if (error) {
                  <div role="alert" class="alert alert-error py-2.5 text-sm">
                    <i class="fa-solid fa-circle-exclamation shrink-0"></i>
                    <span>{{ error }}</span>
                  </div>
                }

                <button type="submit" [disabled]="loading"
                  class="btn btn-error text-white w-full mt-2">
                  @if (loading) {
                    <i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập…
                  } @else {
                    <i class="fa-solid fa-right-to-bracket"></i> Đăng nhập
                  }
                </button>

                <div class="flex items-center justify-between text-xs pt-1">
                  <button type="button" (click)="mode.set('forgot')"
                    class="text-error font-semibold hover:underline">
                    Quên mật khẩu?
                  </button>
                  <span class="text-base-content/40 text-right max-w-[55%]">
                    Giáo viên tạo tài khoản cho học viên
                  </span>
                </div>

                <div class="divider text-xs text-base-content/30 my-1">Tài khoản thử nghiệm</div>
                <div class="flex gap-2 justify-center">
                  <button type="button" (click)="fillDemo('admin@hanzi.vn', '123456')"
                    class="btn btn-ghost btn-xs border border-base-300 rounded-lg">
                    <i class="fa-solid fa-user-shield text-error mr-1"></i> Admin
                  </button>
                  <button type="button" (click)="fillDemo('b2@student.vn', '123456')"
                    class="btn btn-ghost btn-xs border border-base-300 rounded-lg">
                    <i class="fa-solid fa-user-graduate text-info mr-1"></i> Học viên B2
                  </button>
                </div>
              </form>
            </div>
          }

          @if (mode() === 'forgot') {
            <div>
              <button (click)="back()" class="btn btn-ghost btn-sm gap-2 mb-5 -ml-2">
                <i class="fa-solid fa-arrow-left"></i> Về đăng nhập
              </button>
              <h2 class="text-2xl font-extrabold text-base-content mb-1">Quên mật khẩu?</h2>
              <p class="text-sm text-base-content/50 mb-7">
                Nhập email để nhận mã xác nhận 6 số.
              </p>
              <form (ngSubmit)="requestCode()" class="space-y-4">
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-sm font-semibold">Email đã đăng ký</legend>
                  <label class="input flex items-center gap-2 w-full focus-within:input-error">
                    <i class="fa-solid fa-envelope text-base-content/40 fa-sm"></i>
                    <input [(ngModel)]="email" name="femail" type="email"
                      placeholder="you@email.com" class="grow" />
                  </label>
                </fieldset>

                @if (devCode()) {
                  <div role="alert" class="alert alert-warning py-2.5 text-sm">
                    <i class="fa-solid fa-key shrink-0"></i>
                    <span>Mã xác nhận của bạn: <b class="tracking-widest text-base">{{ devCode() }}</b></span>
                  </div>
                }
                @if (error) {
                  <div role="alert" class="alert alert-error py-2.5 text-sm">
                    <i class="fa-solid fa-circle-exclamation shrink-0"></i>
                    <span>{{ error }}</span>
                  </div>
                }
                <button type="submit" [disabled]="loading" class="btn btn-error text-white w-full">
                  @if (loading) { <i class="fa-solid fa-spinner fa-spin"></i> Đang gửi… }
                  @else { <i class="fa-solid fa-paper-plane"></i> Gửi mã xác nhận }
                </button>
              </form>
            </div>
          }

          @if (mode() === 'reset') {
            <div>
              <button (click)="back()" class="btn btn-ghost btn-sm gap-2 mb-5 -ml-2">
                <i class="fa-solid fa-arrow-left"></i> Về đăng nhập
              </button>
              <h2 class="text-2xl font-extrabold text-base-content mb-1">Đặt lại mật khẩu</h2>
              <p class="text-sm text-base-content/50 mb-7">Nhập mã 6 số đã nhận và mật khẩu mới.</p>
              <form (ngSubmit)="doReset()" class="space-y-4">
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-sm font-semibold">Mã xác nhận 6 số</legend>
                  <input [(ngModel)]="code" name="code" maxlength="6" placeholder="123456"
                    class="input w-full text-center text-2xl font-bold tracking-[0.5em]" />
                </fieldset>
                <fieldset class="fieldset">
                  <legend class="fieldset-legend text-sm font-semibold">Mật khẩu mới</legend>
                  <label class="input flex items-center gap-2 w-full">
                    <i class="fa-solid fa-lock text-base-content/40 fa-sm"></i>
                    <input [(ngModel)]="newPassword" name="newPassword" type="password"
                      placeholder="Ít nhất 6 ký tự" class="grow" />
                  </label>
                </fieldset>
                @if (error) {
                  <div role="alert" class="alert alert-error py-2.5 text-sm">
                    <i class="fa-solid fa-circle-exclamation shrink-0"></i>
                    <span>{{ error }}</span>
                  </div>
                }
                <button type="submit" [disabled]="loading" class="btn btn-error text-white w-full">
                  @if (loading) { <i class="fa-solid fa-spinner fa-spin"></i> Đang lưu… }
                  @else { <i class="fa-solid fa-floppy-disk"></i> Đặt lại mật khẩu }
                </button>
              </form>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`]
})
export class LoginComponent {
  email = '';
  password = '';
  code = '';
  newPassword = '';
  error = '';
  loading = false;
  mode = signal<'login' | 'forgot' | 'reset'>('login');
  showPw = signal(false);
  devCode = signal('');

  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private toast = inject(ToastService);

  fillDemo(email: string, pw: string) {
    this.email = email;
    this.password = pw;
  }

  submit() {
    this.loading = true;
    this.error = '';
    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Đăng nhập thành công!');
          this.router.navigate([this.auth.user()?.role === 'Student' ? '/home' : '/dashboard']);
        } else this.error = res.error ?? 'Đăng nhập thất bại.';
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.error ?? 'Không kết nối được máy chủ.';
        this.loading = false;
      }
    });
  }

  requestCode() {
    this.loading = true;
    this.error = '';
    this.devCode.set('');
    this.http.post<any>('/api/auth/forgot-password', { email: this.email }).subscribe({
      next: (res) => {
        if (res.success) {
          this.devCode.set(res.data?.code ?? '');
          this.mode.set('reset');
          this.toast.success('Đã tạo mã xác nhận, hiệu lực 10 phút.');
        } else this.error = res.error ?? 'Gửi mã thất bại.';
        this.loading = false;
      },
      error: (e) => { this.error = e.error?.error ?? 'Không kết nối được máy chủ.'; this.loading = false; }
    });
  }

  doReset() {
    this.loading = true;
    this.error = '';
    this.http.post<any>('/api/auth/reset-password', { email: this.email, code: this.code, newPassword: this.newPassword }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Đã đặt lại mật khẩu. Đăng nhập lại nhé!');
          this.back();
        } else this.error = res.error ?? 'Đặt lại thất bại.';
        this.loading = false;
      },
      error: (e) => { this.error = e.error?.error ?? 'Không kết nối được máy chủ.'; this.loading = false; }
    });
  }

  back() {
    this.mode.set('login');
    this.error = '';
    this.code = '';
    this.newPassword = '';
    this.devCode.set('');
  }
}

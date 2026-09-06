import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { PushService } from './push.service';
import { SignalrService } from './signalr.service';
import { filter } from 'rxjs/operators';

interface Noti { id: string; body: string; link?: string; createdAt: string; read: boolean; }

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  template: `
    @if (!auth.isLoggedIn()) {
      <router-outlet />
    } @else {
      <!-- DaisyUI Drawer Layout -->
      <div class="drawer lg:drawer-open min-h-screen bg-base-200">
        <input id="sidebar-toggle" type="checkbox" class="drawer-toggle" />

        <!-- ===== SIDEBAR ===== -->
        <div class="drawer-side z-50">
          <label for="sidebar-toggle" aria-label="close sidebar" class="drawer-overlay"></label>
          <aside class="bg-base-100 min-h-full w-64 flex flex-col border-r border-base-200 shadow-sm">

            <!-- Logo -->
            <div class="flex items-center gap-3 px-5 py-5 border-b border-base-200">
              <div class="hanzi grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-red-600 to-rose-500 text-white text-xl font-black shadow-md shadow-error/30">&#27721;</div>
              <div>
                <p class="font-extrabold text-base-content leading-tight">HanZi LMS</p>
                <p class="text-xs text-base-content/40">Học tiếng Trung</p>
              </div>
            </div>

            <!-- Nav -->
            <nav class="flex-1 px-3 py-4 overflow-y-auto">
              <ul class="menu menu-sm gap-0.5 p-0">
                @for (item of navItems(); track item.route) {
                  <li>
                    <a [routerLink]="item.route" routerLinkActive="menu-active"
                       (click)="closeSidebar()"
                       class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-base-content/60
                              hover:text-base-content transition-colors">
                      <i class="fa-solid {{ item.icon }} w-4 text-center text-[15px]"></i>
                      {{ item.label }}
                    </a>
                  </li>
                }
              </ul>
            </nav>

            <!-- User info + Logout -->
            <div class="border-t border-base-200 p-4">
              <div class="flex items-center gap-3 mb-3">
                <div class="shrink-0 grid h-9 w-9 place-items-center rounded-full
                            bg-gradient-to-br from-error/20 to-rose-500/20
                            text-error font-bold text-sm border border-error/20">
                  {{ initials() }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-base-content truncate">{{ auth.user()?.fullName }}</p>
                  <p class="text-xs text-base-content/40 truncate">{{ roleLabel() }}</p>
                </div>
              </div>
              <button (click)="logout()"
                class="btn btn-ghost btn-sm w-full justify-start gap-2 text-base-content/50
                       hover:text-error hover:bg-error/5 rounded-lg">
                <i class="fa-solid fa-right-from-bracket"></i>
                Đăng xuất
              </button>
            </div>
          </aside>
        </div>

        <!-- ===== MAIN CONTENT ===== -->
        <div class="drawer-content flex flex-col">

          <!-- Top Bar -->
          <header class="navbar bg-base-100 border-b border-base-200 sticky top-0 z-30 min-h-14 px-4 gap-2">
            <!-- Hamburger (mobile) -->
            <label for="sidebar-toggle" class="btn btn-ghost btn-sm btn-square lg:hidden">
              <i class="fa-solid fa-bars text-base"></i>
            </label>

            <!-- Page title -->
            <div class="flex-1">
              <span class="text-sm font-semibold text-base-content/60 hidden lg:block">
                {{ currentPageTitle() }}
              </span>
            </div>

            <!-- Notification -->
            <div class="relative" (click)="$event.stopPropagation()">
              <button (click)="toggleNoti()" tabindex="0"
                class="btn btn-ghost btn-sm btn-circle indicator">
                <i class="fa-solid fa-bell text-base text-base-content/60"></i>
                @if (unread() > 0) {
                  <span class="badge badge-error badge-xs indicator-item text-[10px] font-bold">
                    {{ unread() > 9 ? '9+' : unread() }}
                  </span>
                }
              </button>
              @if (notiOpen()) {
                <div class="absolute right-0 top-full mt-2 z-50 card card-compact w-80 bg-base-100 shadow-xl border border-base-200">
                  <div class="card-body p-0">
                    <div class="flex items-center justify-between px-4 py-3 border-b border-base-200">
                      <span class="font-bold text-sm">Thông báo</span>
                      @if (unread() > 0) {
                        <button (click)="markAllRead()" class="btn btn-ghost btn-xs gap-1 text-error">
                          <i class="fa-solid fa-check-double fa-xs"></i> Đã đọc tất cả
                        </button>
                      }
                    </div>
                    <div class="max-h-80 overflow-y-auto divide-y divide-base-200">
                      @for (n of notis(); track n.id) {
                        <button (click)="openNoti(n)"
                          class="w-full text-left px-4 py-3 hover:bg-base-200 transition-colors"
                          [class.font-semibold]="!n.read">
                          <p class="text-sm leading-snug" [class]="!n.read ? 'text-base-content' : 'text-base-content/60'">
                            {{ n.body }}
                          </p>
                          <p class="text-xs text-base-content/40 mt-1">{{ n.createdAt | date:'dd/MM HH:mm' }}</p>
                        </button>
                      } @empty {
                        <div class="py-8 text-center">
                          <i class="fa-regular fa-bell-slash text-2xl text-base-content/30"></i>
                          <p class="text-sm text-base-content/40 mt-2">Chưa có thông báo</p>
                        </div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- User avatar (top bar) -->
            <div class="hidden sm:grid h-8 w-8 place-items-center rounded-full
                        bg-gradient-to-br from-error/15 to-rose-500/15
                        text-error text-xs font-bold border border-error/15">
              {{ initials() }}
            </div>
          </header>

          <!-- Page Content -->
          <main class="flex-1 p-5 lg:p-7 max-w-7xl w-full mx-auto">
            <router-outlet />
          </main>
        </div>
      </div>
    }
  `,
  styles: []
})
export class AppComponent implements OnInit, OnDestroy {
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private push = inject(PushService);
  private signalr = inject(SignalrService);
  private router = inject(Router);

  notis = signal<Noti[]>([]);
  notiOpen = signal(false);
  unread = computed(() => this.notis().filter((n) => !n.read).length);
  private poller: ReturnType<typeof setInterval> | null = null;

  initials = computed(() => {
    const name = this.auth.user()?.fullName ?? '';
    return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || '?';
  });

  roleLabel = computed(() => {
    const r = this.auth.user()?.role;
    if (r === 'Admin') return 'Quản trị viên';
    if (r === 'Teacher') return 'Giáo viên';
    return 'Học viên';
  });

  navItems = computed<NavItem[]>(() => {
    const role = this.auth.user()?.role;
    if (role === 'Admin') return [
      { label: 'Tổng quan',      icon: 'fa-gauge',          route: '/admin' },
      { label: 'Người dùng',     icon: 'fa-users',          route: '/users' },
      { label: 'Giáo trình',     icon: 'fa-book-open',      route: '/curriculums' },
      { label: 'Lớp học',        icon: 'fa-chalkboard',     route: '/classes' },
      { label: 'Bài tập',        icon: 'fa-clipboard-list', route: '/assignments' },
      { label: 'Chấm bài',       icon: 'fa-pen-to-square',  route: '/grading' },
      { label: 'Cấu hình',       icon: 'fa-gear',           route: '/settings' },
    ];
    if (role === 'Teacher') return [
      { label: 'Tổng quan',      icon: 'fa-gauge',          route: '/dashboard' },
      { label: 'Giáo trình',     icon: 'fa-book-open',      route: '/curriculums' },
      { label: 'Lớp học',        icon: 'fa-chalkboard',     route: '/classes' },
      { label: 'Bài tập',        icon: 'fa-clipboard-list', route: '/assignments' },
      { label: 'Chấm bài',       icon: 'fa-pen-to-square',  route: '/grading' },
      { label: 'Cấu hình',       icon: 'fa-gear',           route: '/settings' },
    ];
    return [
      { label: 'Trang chủ',      icon: 'fa-house',          route: '/home' },
      { label: 'Học bài',        icon: 'fa-graduation-cap', route: '/learn' },
      { label: 'Bài tập của tôi', icon: 'fa-file-pen',      route: '/my-assignments' },
      { label: 'Kết quả',        icon: 'fa-chart-bar',      route: '/results' },
    ];
  });

  currentUrl = signal('');

  currentPageTitle = computed(() => {
    const url = this.currentUrl();
    const all: NavItem[] = [
      { label: 'Tổng quan',       icon: '', route: '/admin' },
      { label: 'Tổng quan',       icon: '', route: '/dashboard' },
      { label: 'Người dùng',      icon: '', route: '/users' },
      { label: 'Giáo trình',      icon: '', route: '/curriculums' },
      { label: 'Lớp học',         icon: '', route: '/classes' },
      { label: 'Bài tập',         icon: '', route: '/assignments' },
      { label: 'Chấm bài',        icon: '', route: '/grading' },
      { label: 'Cấu hình',        icon: '', route: '/settings' },
      { label: 'Trang chủ',       icon: '', route: '/home' },
      { label: 'Học bài',         icon: '', route: '/learn' },
      { label: 'Bài tập của tôi', icon: '', route: '/my-assignments' },
      { label: 'Kết quả',         icon: '', route: '/results' },
    ];
    return all.find(i => url.startsWith(i.route))?.label ?? '';
  });

  ngOnInit() {
    this.loadNotis();
    this.push.init();
    this.signalr.listen((n) => {
      this.toast.info(n.body);
      this.loadNotis();
    });
    this.signalr.start();
    this.poller = setInterval(() => this.loadNotis(), 60000);
    // Close noti dropdown on route change
    this.router.events.pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.notiOpen.set(false);
        this.currentUrl.set(e.urlAfterRedirects);
      });
  }

  ngOnDestroy() {
    if (this.poller) clearInterval(this.poller);
  }

  /** Click ngoài dropdown → đóng thông báo. */
  @HostListener('document:click')
  onDocClick() {
    if (this.notiOpen()) this.notiOpen.set(false);
  }

  closeSidebar() {
    const el = document.getElementById('sidebar-toggle') as HTMLInputElement | null;
    if (el) el.checked = false;
  }

  logout() {
    this.signalr.stop();
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  loadNotis() {
    if (!this.auth.isLoggedIn()) return;
    this.http.get<any>('/api/notifications/mine').subscribe({
      next: (res) => { if (res.success) this.notis.set(res.data); },
      error: () => {}
    });
  }

  toggleNoti() {
    if (!this.notiOpen()) this.loadNotis();
    this.notiOpen.update((v) => !v);
  }

  /** Đánh dấu toàn bộ thông báo là đã đọc. */
  markAllRead() {
    this.http.post<any>('/api/notifications/read-all', {}).subscribe({
      next: (res) => {
        if (res.success) {
          this.notis.update((list) => list.map((x) => ({ ...x, read: true })));
          this.toast.success('Đã đánh dấu tất cả thông báo là đã đọc.');
        }
      }
    });
  }

  openNoti(n: Noti) {
    if (!n.read) {
      this.http.post<any>('/api/notifications/read', { id: n.id }).subscribe({
        next: () => { this.notis.update((list) => list.map((x) => x.id === n.id ? { ...x, read: true } : x)); }
      });
    }
    this.notiOpen.set(false);
    if (n.link) this.router.navigateByUrl(n.link);
  }
}

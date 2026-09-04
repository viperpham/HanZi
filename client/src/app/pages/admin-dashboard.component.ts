import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Activity { id: string; actorName?: string; action: string; entity?: string; createdAt: string; }
interface AdminHome {
  students: number; teachers: number; admins: number; locked: number;
  curriculums: number; classes: number; pendingGrading: number; activities: Activity[];
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="space-y-6">

      <!-- Page Header -->
      <div>
        <h1 class="text-2xl font-extrabold text-base-content">Tổng quan quản trị</h1>
        <p class="text-sm text-base-content/50 mt-1">Xin chào Admin — đây là tóm tắt hệ thống</p>
      </div>

      <!-- Stat Cards -->
      <div class="stats stats-vertical md:stats-horizontal shadow-sm border border-base-200 w-full bg-base-100">
        <a routerLink="/users" class="stat hover:bg-base-200 transition-colors cursor-pointer">
          <div class="stat-figure">
            <div class="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
              <i class="fa-solid fa-user-graduate text-info text-xl"></i>
            </div>
          </div>
          <div class="stat-title text-xs">Học viên</div>
          <div class="stat-value text-info">{{ data?.students ?? 0 }}</div>
          <div class="stat-desc">Đã đăng ký hệ thống</div>
        </a>

        <div class="stat">
          <div class="stat-figure">
            <div class="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <i class="fa-solid fa-chalkboard-user text-warning text-xl"></i>
            </div>
          </div>
          <div class="stat-title text-xs">Giáo viên</div>
          <div class="stat-value text-warning">{{ data?.teachers ?? 0 }}</div>
          <div class="stat-desc">Đang giảng dạy</div>
        </div>

        <div class="stat">
          <div class="stat-figure">
            <div class="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <i class="fa-solid fa-layer-group text-success text-xl"></i>
            </div>
          </div>
          <div class="stat-title text-xs">Giáo trình / Lớp</div>
          <div class="stat-value text-success">
            {{ data?.curriculums ?? 0 }}
            <span class="text-base text-base-content/30">/ {{ data?.classes ?? 0 }}</span>
          </div>
          <div class="stat-desc">Đang hoạt động</div>
        </div>

        <a routerLink="/grading" class="stat hover:bg-base-200 transition-colors cursor-pointer">
          <div class="stat-figure">
            <div class="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center">
              <i class="fa-solid fa-pen-to-square text-error text-xl"></i>
            </div>
          </div>
          <div class="stat-title text-xs">Bài chờ chấm</div>
          <div class="stat-value text-error">{{ data?.pendingGrading ?? 0 }}</div>
          <div class="stat-desc">Cần xử lý sớm</div>
        </a>
      </div>

      <!-- Content Grid -->
      <div class="grid gap-6 lg:grid-cols-2">

        <!-- Activity Log -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold mb-3">
              <i class="fa-solid fa-clock-rotate-left text-base-content/50 mr-1"></i>
              Nhật ký hoạt động gần đây
            </h2>
            <div class="space-y-2 max-h-80 overflow-y-auto">
              @for (a of data?.activities ?? []; track a.id) {
                <div class="flex items-start gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors">
                  <div class="w-8 h-8 rounded-full bg-base-200 flex items-center justify-center shrink-0 mt-0.5">
                    <i class="fa-solid fa-bolt text-xs text-base-content/50"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-medium text-base-content leading-snug">{{ a.action }}</p>
                    <p class="text-xs text-base-content/40 mt-0.5">
                      {{ a.actorName ?? 'Hệ thống' }} &middot; {{ a.createdAt | date:'dd/MM HH:mm' }}
                    </p>
                  </div>
                </div>
              } @empty {
                <div class="py-8 text-center">
                  <i class="fa-solid fa-inbox text-3xl text-base-content/20"></i>
                  <p class="text-sm text-base-content/40 mt-2">Chưa có hoạt động nào.</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Account Summary + Quick Actions -->
        <div class="space-y-4">
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body p-5">
              <h2 class="card-title text-base font-bold mb-3">
                <i class="fa-solid fa-shield-halved text-base-content/50 mr-1"></i>
                Tài khoản hệ thống
              </h2>
              <div class="space-y-2">
                <div class="flex items-center justify-between py-2 border-b border-base-200">
                  <span class="text-sm flex items-center gap-2 text-base-content/70">
                    <i class="fa-solid fa-user-shield w-4 text-center text-base-content/40"></i>
                    Quản trị viên
                  </span>
                  <span class="badge badge-ghost font-bold">{{ data?.admins ?? 0 }}</span>
                </div>
                <div class="flex items-center justify-between py-2">
                  <span class="text-sm flex items-center gap-2 text-base-content/70">
                    <i class="fa-solid fa-lock w-4 text-center text-error/60"></i>
                    Tài khoản đã khoá
                  </span>
                  <span class="badge badge-error badge-outline font-bold">{{ data?.locked ?? 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-2 gap-3">
            <a routerLink="/users"
              class="card bg-error text-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <div class="card-body p-4 items-start gap-2">
                <i class="fa-solid fa-users text-xl opacity-90"></i>
                <p class="text-sm font-bold">Người dùng</p>
              </div>
            </a>
            <a routerLink="/curriculums"
              class="card bg-base-100 border border-base-200 shadow-sm hover:bg-base-200 transition-colors cursor-pointer">
              <div class="card-body p-4 items-start gap-2">
                <i class="fa-solid fa-book-open text-xl text-base-content/60"></i>
                <p class="text-sm font-bold text-base-content/70">Giáo trình</p>
              </div>
            </a>
            <a routerLink="/classes"
              class="card bg-base-100 border border-base-200 shadow-sm hover:bg-base-200 transition-colors cursor-pointer">
              <div class="card-body p-4 items-start gap-2">
                <i class="fa-solid fa-chalkboard text-xl text-base-content/60"></i>
                <p class="text-sm font-bold text-base-content/70">Lớp học</p>
              </div>
            </a>
            <a routerLink="/grading"
              class="card bg-base-100 border border-base-200 shadow-sm hover:bg-base-200 transition-colors cursor-pointer">
              <div class="card-body p-4 items-start gap-2">
                <i class="fa-solid fa-pen-to-square text-xl text-base-content/60"></i>
                <p class="text-sm font-bold text-base-content/70">Chấm bài</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminDashboardComponent implements OnInit {
  data: AdminHome | null = null;
  private http = inject(HttpClient);

  ngOnInit() {
    this.http.get<any>('/api/dashboard/admin').subscribe({
      next: (res) => { if (res.success) this.data = res.data; }
    });
  }
}

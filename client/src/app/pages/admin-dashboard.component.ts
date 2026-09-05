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
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Tổng quan quản trị</h1>
          <p class="text-sm text-base-content/50 mt-1">Xin chào Admin — đây là tóm tắt hệ thống</p>
        </div>
        <a routerLink="/users" class="btn btn-error btn-sm text-white gap-2">
          <i class="fa-solid fa-plus fa-sm"></i> Thêm người dùng
        </a>
      </div>

      <!-- Stat Cards — grid 2×2 trên mobile, 4 cột trên md -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a routerLink="/users"
          class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-info/40 transition-all cursor-pointer">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between">
              <div class="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-user-graduate text-info text-lg"></i>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square text-xs text-base-content/20"></i>
            </div>
            <div>
              <p class="text-xs text-base-content/50 font-medium">Học viên</p>
              <p class="text-2xl font-extrabold text-info mt-0.5">{{ data?.students ?? 0 }}</p>
              <p class="text-xs text-base-content/40 mt-0.5">Đã đăng ký</p>
            </div>
          </div>
        </a>

        <a routerLink="/users"
          class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-warning/40 transition-all cursor-pointer">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between">
              <div class="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-chalkboard-user text-warning text-lg"></i>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square text-xs text-base-content/20"></i>
            </div>
            <div>
              <p class="text-xs text-base-content/50 font-medium">Giáo viên</p>
              <p class="text-2xl font-extrabold text-warning mt-0.5">{{ data?.teachers ?? 0 }}</p>
              <p class="text-xs text-base-content/40 mt-0.5">Đang giảng dạy</p>
            </div>
          </div>
        </a>

        <a routerLink="/curriculums"
          class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-success/40 transition-all cursor-pointer">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between">
              <div class="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-layer-group text-success text-lg"></i>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square text-xs text-base-content/20"></i>
            </div>
            <div>
              <p class="text-xs text-base-content/50 font-medium">Giáo trình / Lớp</p>
              <p class="text-2xl font-extrabold text-success mt-0.5">
                {{ data?.curriculums ?? 0 }}<span class="text-base text-base-content/30 font-normal"> / {{ data?.classes ?? 0 }}</span>
              </p>
              <p class="text-xs text-base-content/40 mt-0.5">Đang hoạt động</p>
            </div>
          </div>
        </a>

        <a routerLink="/grading"
          class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-error/40 transition-all cursor-pointer">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between">
              <div class="w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-pen-to-square text-error text-lg"></i>
              </div>
              @if ((data?.pendingGrading ?? 0) > 0) {
                <span class="badge badge-error badge-sm text-white font-bold">{{ data!.pendingGrading }}</span>
              }
            </div>
            <div>
              <p class="text-xs text-base-content/50 font-medium">Bài chờ chấm</p>
              <p class="text-2xl font-extrabold text-error mt-0.5">{{ data?.pendingGrading ?? 0 }}</p>
              <p class="text-xs text-base-content/40 mt-0.5">Cần xử lý sớm</p>
            </div>
          </div>
        </a>
      </div>

      <!-- Content Grid -->
      <div class="grid gap-6 lg:grid-cols-2">

        <!-- Activity Log -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold mb-3">
              <i class="fa-solid fa-clock-rotate-left text-base-content/50"></i>
              Nhật ký hoạt động gần đây
            </h2>
            <div class="space-y-1 max-h-80 overflow-y-auto">
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
                <div class="py-10 text-center">
                  <i class="fa-solid fa-inbox text-3xl text-base-content/20"></i>
                  <p class="text-sm text-base-content/40 mt-2">Chưa có hoạt động nào.</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Account Summary + Quick Actions -->
        <div class="space-y-4">
          <!-- Tài khoản hệ thống -->
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body p-5">
              <h2 class="card-title text-base font-bold mb-3">
                <i class="fa-solid fa-shield-halved text-base-content/50"></i>
                Tài khoản hệ thống
              </h2>
              <div class="space-y-1">
                <a routerLink="/users"
                  class="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-base-200 transition-colors">
                  <span class="text-sm flex items-center gap-2 text-base-content/70">
                    <i class="fa-solid fa-user-shield w-4 text-center text-base-content/40"></i>
                    Quản trị viên
                  </span>
                  <span class="badge badge-ghost font-bold">{{ data?.admins ?? 0 }}</span>
                </a>
                <a routerLink="/users"
                  class="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-base-200 transition-colors">
                  <span class="text-sm flex items-center gap-2 text-base-content/70">
                    <i class="fa-solid fa-lock w-4 text-center text-error/60"></i>
                    Tài khoản đã khoá
                  </span>
                  <span class="badge badge-error badge-outline font-bold">{{ data?.locked ?? 0 }}</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Quick Actions — 5 items in responsive grid -->
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body p-5">
              <h2 class="card-title text-base font-bold mb-3">
                <i class="fa-solid fa-bolt text-base-content/50"></i>
                Truy cập nhanh
              </h2>
              <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <a routerLink="/users"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl bg-error text-white shadow-sm hover:shadow-md hover:opacity-90 transition-all cursor-pointer">
                  <i class="fa-solid fa-users text-xl"></i>
                  <p class="text-xs font-bold text-center leading-tight">Người dùng</p>
                </a>
                <a routerLink="/curriculums"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl border border-base-200 hover:bg-base-200 hover:border-info/30 transition-all cursor-pointer">
                  <i class="fa-solid fa-book-open text-xl text-info"></i>
                  <p class="text-xs font-bold text-base-content/70 text-center leading-tight">Giáo trình</p>
                </a>
                <a routerLink="/classes"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl border border-base-200 hover:bg-base-200 hover:border-success/30 transition-all cursor-pointer">
                  <i class="fa-solid fa-chalkboard text-xl text-success"></i>
                  <p class="text-xs font-bold text-base-content/70 text-center leading-tight">Lớp học</p>
                </a>
                <a routerLink="/assignments"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl border border-base-200 hover:bg-base-200 hover:border-warning/30 transition-all cursor-pointer">
                  <i class="fa-solid fa-clipboard-list text-xl text-warning"></i>
                  <p class="text-xs font-bold text-base-content/70 text-center leading-tight">Bài tập</p>
                </a>
                <a routerLink="/grading"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl border border-base-200 hover:bg-base-200 hover:border-error/30 transition-all cursor-pointer">
                  <i class="fa-solid fa-pen-to-square text-xl text-error"></i>
                  <p class="text-xs font-bold text-base-content/70 text-center leading-tight">Chấm bài</p>
                </a>
                <a routerLink="/settings"
                  class="flex flex-col items-center gap-2 p-3 rounded-xl border border-base-200 hover:bg-base-200 transition-all cursor-pointer">
                  <i class="fa-solid fa-gear text-xl text-base-content/50"></i>
                  <p class="text-xs font-bold text-base-content/70 text-center leading-tight">Cấu hình</p>
                </a>
              </div>
            </div>
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

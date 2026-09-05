import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { ToastService } from '../toast.service';

interface Continue { lessonId: string; titleZh: string; titleVi: string; currentPart: number; }
interface Upcoming { assignmentId: string; title: string; classId: string; className: string; dueAt: string; }
interface SClass { id: string; name: string; teacherName: string; schedule?: string; room?: string; curriculumName: string; lessonCount: number; lessonsStudied: number; progressPercent: number; }
interface StudentHome {
  assignmentsPending: number; lessonsStudied: number; avgScore: number; streakDays: number;
  recentNoteCount?: number;
  continue?: Continue; upcoming: Upcoming[]; classes: SClass[];
}

@Component({
  selector: 'app-home',
  standalone: true,
  template: `
    <div class="space-y-6">

      <!-- Page Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Trang chủ</h1>
          <p class="text-sm text-base-content/50 mt-1">Chào mừng bạn quay lại!</p>
        </div>
        <a routerLink="/learn" class="btn btn-error btn-sm text-white gap-2">
          <i class="fa-solid fa-graduation-cap fa-sm"></i> Vào học bài
        </a>
      </div>

      <!-- Stat Cards — grid 2×2 trên mobile, 4 cột trên md -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <a routerLink="/my-assignments"
          class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-error/40 transition-all cursor-pointer">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between">
              <div class="w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-file-pen text-error text-lg"></i>
              </div>
              @if ((data?.assignmentsPending ?? 0) > 0) {
                <span class="badge badge-error badge-sm text-white font-bold">{{ data!.assignmentsPending }}</span>
              }
            </div>
            <div>
              <p class="text-xs text-base-content/50 font-medium">Bài cần nộp</p>
              <p class="text-2xl font-extrabold text-error mt-0.5">{{ data?.assignmentsPending ?? 0 }}</p>
              <p class="text-xs text-base-content/40 mt-0.5">Chưa hoàn thành</p>
            </div>
          </div>
        </a>

        <a routerLink="/learn"
          class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-success/40 transition-all cursor-pointer">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between">
              <div class="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-book-open-reader text-success text-lg"></i>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square text-xs text-base-content/20"></i>
            </div>
            <div>
              <p class="text-xs text-base-content/50 font-medium">Bài đã học</p>
              <p class="text-2xl font-extrabold text-success mt-0.5">{{ data?.lessonsStudied ?? 0 }}</p>
              <p class="text-xs text-base-content/40 mt-0.5">Tổng số hoàn thành</p>
            </div>
          </div>
        </a>

        <a routerLink="/results"
          class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md hover:border-info/40 transition-all cursor-pointer">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between">
              <div class="w-11 h-11 rounded-xl bg-info/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-star text-info text-lg"></i>
              </div>
              <i class="fa-solid fa-arrow-up-right-from-square text-xs text-base-content/20"></i>
            </div>
            <div>
              <p class="text-xs text-base-content/50 font-medium">Điểm trung bình</p>
              <p class="text-2xl font-extrabold text-info mt-0.5">{{ data?.avgScore ?? 0 }}</p>
              <p class="text-xs text-base-content/40 mt-0.5">Trên thang 10</p>
            </div>
          </div>
        </a>

        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-4 gap-3">
            <div class="flex items-start justify-between">
              <div class="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-fire text-warning text-lg"></i>
              </div>
            </div>
            <div>
              <p class="text-xs text-base-content/50 font-medium">Chuỗi ngày học</p>
              <p class="text-2xl font-extrabold text-warning mt-0.5">{{ data?.streakDays ?? 0 }}</p>
              <p class="text-xs text-base-content/40 mt-0.5">Ngày liên tiếp</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Alert: ghi chú chấm bài mới từ giáo viên -->
      @if ((data?.recentNoteCount ?? 0) > 0) {
        <a routerLink="/results"
          class="alert bg-warning/10 border-warning/30 text-warning hover:bg-warning/20 transition-colors cursor-pointer">
          <i class="fa-solid fa-comment-dots text-lg shrink-0"></i>
          <span class="text-sm">
            <b>Giáo viên vừa gửi ghi chú cho bạn</b> — {{ data!.recentNoteCount }} ghi chú chấm bài trong 3 ngày qua.
            <span class="font-bold underline">Xem ngay</span>
          </span>
          <i class="fa-solid fa-arrow-right shrink-0"></i>
        </a>
      }

      <!-- Continue Learning Banner -->
      @if (data?.continue; as c) {
        <a [routerLink]="'/learn/' + c.lessonId"
          class="card bg-gradient-to-r from-error to-rose-500 text-white shadow-md
                 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
          <div class="card-body p-5 flex-row items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-play text-xl"></i>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-xs font-bold uppercase tracking-wider opacity-80">Tiếp tục học</p>
              <p class="hanzi text-lg font-extrabold truncate mt-0.5">{{ c.titleZh }} · {{ c.titleVi }}</p>
            </div>
            <div class="badge bg-white/20 text-white border-0 shrink-0">
              Phần {{ c.currentPart }}/5
            </div>
          </div>
        </a>
      } @else {
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-6 items-center text-center">
            <i class="fa-solid fa-graduation-cap text-3xl text-base-content/20 mb-2"></i>
            <p class="text-sm text-base-content/50">
              Chưa có bài học nào —
              <a routerLink="/learn" class="text-error font-bold hover:underline">bắt đầu từ mục Học bài</a>
            </p>
          </div>
        </div>
      }

      <!-- Two Column Grid -->
      <div class="grid gap-6 lg:grid-cols-2">

        <!-- Upcoming Assignments -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="card-title text-base font-bold">
                <i class="fa-solid fa-clock text-base-content/50"></i>
                Bài tập sắp đến hạn
              </h2>
              <a routerLink="/my-assignments" class="btn btn-ghost btn-xs gap-1 text-error">
                Xem tất cả <i class="fa-solid fa-arrow-right fa-xs"></i>
              </a>
            </div>
            <div class="space-y-2">
              @for (u of data?.upcoming ?? []; track u.assignmentId) {
                <div class="flex items-center gap-3 p-3 rounded-xl border border-base-200 hover:bg-base-200 transition-colors">
                  <div class="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-clipboard-list text-sm text-error"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-base-content truncate">{{ u.title }}</p>
                    <p class="text-xs text-base-content/40">
                      {{ u.className }} &middot; hạn {{ u.dueAt | date:'dd/MM HH:mm' }}
                    </p>
                  </div>
                  <a [routerLink]="'/do/' + u.assignmentId"
                    class="btn btn-error btn-xs text-white gap-1 shrink-0">
                    <i class="fa-solid fa-pen"></i> Làm
                  </a>
                </div>
              } @empty {
                <div class="py-6 text-center">
                  <i class="fa-solid fa-circle-check text-3xl text-success/60"></i>
                  <p class="text-sm text-base-content/40 mt-2">Không có bài tập nào đến hạn!</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- My Classes -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold mb-3">
              <i class="fa-solid fa-chalkboard text-base-content/50"></i>
              Lớp của tôi
            </h2>
            <div class="space-y-3">
              @for (c of data?.classes ?? []; track c.id) {
                <a [routerLink]="'/my-class/' + c.id"
                  class="block p-3 rounded-xl border border-base-200 hover:bg-base-200 hover:border-error/30 transition-colors cursor-pointer">
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <p class="font-semibold text-sm text-base-content">{{ c.name }}</p>
                    <span class="badge badge-error badge-sm text-white">{{ c.progressPercent }}%</span>
                  </div>
                  <p class="text-xs text-base-content/40 mb-2">
                    <i class="fa-solid fa-chalkboard-user mr-1"></i>{{ c.teacherName }}
                    &nbsp;&middot;&nbsp;
                    <i class="fa-solid fa-book mr-1"></i>{{ c.curriculumName }}
                    @if (c.schedule) { &nbsp;&middot;&nbsp;<i class="fa-solid fa-clock mr-1"></i>{{ c.schedule }} }
                    @if (c.room) { &nbsp;&middot;&nbsp;<i class="fa-solid fa-location-dot mr-1"></i>{{ c.room }} }
                  </p>
                  <progress class="progress progress-error w-full h-1.5"
                    [value]="c.progressPercent" max="100"></progress>
                  <p class="mt-1.5 text-[11px] text-error/70 font-semibold text-right flex items-center justify-end gap-1">
                    Xem lớp <i class="fa-solid fa-arrow-right fa-xs"></i>
                  </p>
                </a>
              } @empty {
                <div class="py-6 text-center">
                  <i class="fa-solid fa-door-open text-3xl text-base-content/20"></i>
                  <p class="text-sm text-base-content/40 mt-2">Chưa vào lớp nào.</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Join Class + CTA -->
      @if (auth.user()?.role === 'Student') {
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5 flex-row flex-wrap items-center gap-4">
            <div class="flex items-center gap-2">
              <i class="fa-solid fa-ticket text-error"></i>
              <span class="text-sm font-bold text-base-content">Có mã lớp?</span>
            </div>
            <label class="input input-sm flex items-center gap-2 w-44">
              <i class="fa-solid fa-hashtag text-base-content/30 fa-xs"></i>
              <input [(ngModel)]="joinCode" placeholder="VD: L1234"
                class="grow font-mono uppercase text-sm" />
            </label>
            <button (click)="joinClass()" class="btn btn-sm btn-neutral gap-2">
              <i class="fa-solid fa-right-to-bracket"></i> Tham gia lớp
            </button>
            <span class="text-xs text-base-content/40">Giáo viên sẽ duyệt yêu cầu</span>
          </div>
        </div>
      }

      <!-- Bottom CTA Buttons -->
      <div class="flex gap-3">
        <a routerLink="/learn"
          class="btn btn-error text-white flex-1 gap-2">
          <i class="fa-solid fa-graduation-cap"></i> Vào học bài
        </a>
        <a routerLink="/my-assignments"
          class="btn btn-outline flex-1 gap-2">
          <i class="fa-solid fa-file-pen"></i> Bài tập của tôi
        </a>
      </div>
    </div>
  `,
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`],
  imports: [DatePipe, RouterLink, FormsModule]
})
export class HomeComponent implements OnInit {
  data: StudentHome | null = null;
  joinCode = '';
  auth = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);
  private toast = inject(ToastService);

  ngOnInit() {
    this.http.get<any>('/api/dashboard/student').subscribe({
      next: (res) => { if (res.success) this.data = res.data; },
      error: () => this.router.navigate(['/login'])
    });
  }

  joinClass() {
    const code = this.joinCode.trim().toUpperCase();
    if (!code) { this.toast.error('Nhập mã lớp trước.'); return; }
    this.http.post<any>('/api/classes/join', { code }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Đã gửi yêu cầu tham gia lớp. Chờ giáo viên duyệt nhé!');
          this.joinCode = '';
          this.ngOnInit();
        } else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }
}

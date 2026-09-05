import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../toast.service';

interface ClassDetail {
  id: string;
  code: string;
  name: string;
  curriculumId: string;
  curriculumName: string;
  teacherName: string;
  schedule?: string;
  room?: string;
  status: string;
  students: { id: string; fullName: string }[];
}

interface AssignmentRow {
  id: string;
  title: string;
  dueAt: string;
  questionCount: number;
}

interface SubRow {
  assignmentId: string;
  status: string;
  finalScore: number;
}

interface AttRow {
  date: string;
  status: string;
}

@Component({
  selector: 'app-my-class',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @if (cls; as c) {
      <div class="max-w-6xl mx-auto space-y-6 pb-12">

        <!-- ===== HERO BANNER LỚP HỌC ===== -->
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-rose-600 to-rose-500 text-white shadow-md">
          <!-- Họa tiết nền mờ -->
          <div class="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div class="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-white/10 blur-xl pointer-events-none"></div>

          <div class="relative z-10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <!-- Thông tin chính -->
            <div class="flex items-start sm:items-center gap-5 min-w-0">
              <div class="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center text-3xl shrink-0 shadow-inner border border-white/20">
                <i class="fa-solid fa-chalkboard"></i>
              </div>

              <div class="min-w-0 space-y-1.5">
                <div class="flex flex-wrap items-center gap-2">
                  <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                    {{ c.name }}
                  </h1>
                  @if (c.code) {
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white/20 text-white border border-white/25">
                      {{ c.code }}
                    </span>
                  }
                  @if (c.curriculumName) {
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-black/20 text-white/90">
                      <i class="fa-solid fa-book-bookmark text-[10px]"></i>
                      {{ c.curriculumName }}
                    </span>
                  }
                </div>

                <!-- Thông tin phụ: GV, Lịch, Phòng -->
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/90">
                  <span class="flex items-center gap-1.5">
                    <i class="fa-solid fa-chalkboard-user text-white/70"></i>
                    <b>{{ c.teacherName }}</b>
                  </span>
                  @if (c.schedule) {
                    <span class="flex items-center gap-1.5">
                      <i class="fa-solid fa-clock text-white/70"></i>
                      {{ c.schedule }}
                    </span>
                  }
                  @if (c.room) {
                    <span class="flex items-center gap-1.5">
                      <i class="fa-solid fa-location-dot text-white/70"></i>
                      {{ c.room }}
                    </span>
                  }
                  <span class="flex items-center gap-1.5">
                    <i class="fa-solid fa-user-group text-white/70"></i>
                    {{ c.students.length }} học viên
                  </span>
                </div>
              </div>
            </div>

            <!-- Nút hành động -->
            <div class="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end">
              <a routerLink="/learn"
                class="btn bg-white hover:bg-white/90 text-rose-600 font-bold border-0 shadow-md rounded-2xl px-6 py-3 gap-2.5 hover:scale-[1.02] transition-transform">
                <i class="fa-solid fa-circle-play text-lg"></i>
                <span>Vào học bài</span>
              </a>
            </div>
          </div>
        </div>

        <!-- ===== KHỐI NỘI DUNG CHÍNH (2 CỘT) ===== -->
        <div class="grid gap-6 lg:grid-cols-12 items-start">

          <!-- CỘT TRÁI (7/12): Bài tập & Danh sách bạn cùng lớp -->
          <div class="lg:col-span-7 space-y-6">

            <!-- Card Bài tập của lớp -->
            <div class="rounded-2xl bg-base-100 border border-base-200 shadow-xs p-5 sm:p-6 space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-base-200">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-sm">
                    <i class="fa-solid fa-clipboard-list"></i>
                  </div>
                  <div>
                    <h2 class="text-base font-bold text-base-content">Bài tập của lớp</h2>
                    <p class="text-xs text-base-content/50">Danh sách bài tập và tiến độ hoàn thành</p>
                  </div>
                </div>

                <a routerLink="/my-assignments"
                  class="btn btn-ghost btn-xs text-primary font-semibold gap-1 hover:bg-primary/10 rounded-lg">
                  Tất cả bài tập <i class="fa-solid fa-arrow-right text-[10px]"></i>
                </a>
              </div>

              <!-- Danh sách bài tập -->
              <div class="space-y-2.5">
                @for (a of assignments; track a.id) {
                  <div class="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-base-200 hover:border-primary/30 hover:bg-base-200/40 transition-all">
                    <!-- Bên trái: Icon + Tiêu đề + Hạn -->
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        [class]="statusOf(a.id) === 'Graded' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : statusOf(a.id) === 'Submitted' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-base-200 text-base-content/50'">
                        <i class="fa-solid fa-file-lines text-base"></i>
                      </div>

                      <div class="min-w-0">
                        <p class="text-sm font-bold text-base-content truncate">{{ a.title }}</p>
                        <div class="flex items-center gap-2 mt-0.5 text-xs text-base-content/50">
                          <span class="flex items-center gap-1">
                            <i class="fa-regular fa-clock fa-xs"></i>
                            Hạn {{ a.dueAt | date:'dd/MM HH:mm' }}
                          </span>
                          <span>·</span>
                          <span>{{ a.questionCount }} câu</span>
                        </div>
                      </div>
                    </div>

                    <!-- Bên phải: Trạng thái / Nút làm bài -->
                    <div class="shrink-0">
                      @switch (statusOf(a.id)) {
                        @case ('Graded') {
                          <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <i class="fa-solid fa-award text-xs"></i>
                            <span>{{ scoreOf(a.id) }} / 10</span>
                          </div>
                        }
                        @case ('Submitted') {
                          <div class="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                            <i class="fa-solid fa-hourglass-half text-xs"></i>
                            <span>Chờ chấm</span>
                          </div>
                        }
                        @default {
                          <a [routerLink]="'/do/' + a.id"
                            class="btn btn-primary btn-sm rounded-xl text-white font-semibold gap-1.5 shadow-xs">
                            <i class="fa-solid fa-pen-to-square fa-xs"></i>
                            <span>Làm bài</span>
                          </a>
                        }
                      }
                    </div>
                  </div>
                } @empty {
                  <div class="py-10 text-center space-y-2">
                    <div class="w-12 h-12 rounded-2xl bg-base-200 text-base-content/30 flex items-center justify-center text-xl mx-auto">
                      <i class="fa-solid fa-clipboard-check"></i>
                    </div>
                    <p class="text-sm font-medium text-base-content/50">Lớp hiện chưa có bài tập nào.</p>
                  </div>
                }
              </div>
            </div>

            <!-- Card Bạn cùng lớp -->
            <div class="rounded-2xl bg-base-100 border border-base-200 shadow-xs p-5 sm:p-6 space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-base-200">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-sm">
                    <i class="fa-solid fa-users"></i>
                  </div>
                  <div>
                    <h2 class="text-base font-bold text-base-content">Bạn cùng lớp</h2>
                    <p class="text-xs text-base-content/50">{{ cls.students.length }} thành viên trong lớp</p>
                  </div>
                </div>
              </div>

              <!-- Grid học viên -->
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                @for (s of cls.students; track s.id) {
                  <div class="flex items-center gap-2.5 p-2.5 rounded-xl border border-base-200 bg-base-200/30">
                    <div class="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0 border border-primary/20">
                      {{ initials(s.fullName) }}
                    </div>
                    <span class="text-xs font-semibold text-base-content truncate">
                      {{ s.fullName }}
                    </span>
                  </div>
                } @empty {
                  <p class="text-xs text-base-content/40 py-4 col-span-full text-center">Chưa có thông tin học viên.</p>
                }
              </div>
            </div>

          </div>

          <!-- CỘT PHẢI (5/12): Điểm danh & Chuyên cần -->
          <div class="lg:col-span-5 space-y-6">

            <!-- Card Điểm danh & Chuyên cần -->
            <div class="rounded-2xl bg-base-100 border border-base-200 shadow-xs p-5 sm:p-6 space-y-4">
              <div class="flex items-center justify-between pb-3 border-b border-base-200">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-sm">
                    <i class="fa-solid fa-calendar-check"></i>
                  </div>
                  <div>
                    <h2 class="text-base font-bold text-base-content">Điểm danh &amp; Chuyên cần</h2>
                    <p class="text-xs text-base-content/50">Lịch sử tham gia các buổi học</p>
                  </div>
                </div>
              </div>

              <!-- 3 Thống kê điểm danh -->
              <div class="grid grid-cols-3 gap-2">
                <!-- Có mặt -->
                <div class="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-0.5">
                  <p class="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-center gap-1">
                    <i class="fa-solid fa-circle-check fa-xs"></i> Có mặt
                  </p>
                  <p class="text-lg font-black text-emerald-800">{{ count('Present') }}</p>
                </div>

                <!-- Muộn -->
                <div class="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-0.5">
                  <p class="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-center gap-1">
                    <i class="fa-solid fa-clock fa-xs"></i> Muộn
                  </p>
                  <p class="text-lg font-black text-amber-800">{{ count('Late') }}</p>
                </div>

                <!-- Vắng -->
                <div class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-center space-y-0.5">
                  <p class="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-center gap-1">
                    <i class="fa-solid fa-circle-xmark fa-xs"></i> Vắng
                  </p>
                  <p class="text-lg font-black text-rose-800">{{ count('Absent') }}</p>
                </div>
              </div>

              <!-- Danh sách lịch sử điểm danh -->
              <div class="space-y-2 max-h-80 overflow-y-auto pr-1">
                @for (a of attendance; track a.date) {
                  <div class="flex items-center justify-between p-2.5 rounded-xl border border-base-200 bg-base-200/20">
                    <span class="text-xs font-semibold text-base-content/80 flex items-center gap-2">
                      <i class="fa-regular fa-calendar text-base-content/40 fa-xs"></i>
                      {{ formatDateVi(a.date) }}
                    </span>

                    @switch (a.status) {
                      @case ('Present') {
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <i class="fa-solid fa-check fa-xs"></i> Có mặt
                        </span>
                      }
                      @case ('Late') {
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <i class="fa-solid fa-clock fa-xs"></i> Đi muộn
                        </span>
                      }
                      @default {
                        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <i class="fa-solid fa-xmark fa-xs"></i> Nghỉ vắng
                        </span>
                      }
                    }
                  </div>
                } @empty {
                  <div class="py-8 text-center space-y-1">
                    <i class="fa-regular fa-calendar-xmark text-2xl text-base-content/25"></i>
                    <p class="text-xs text-base-content/40">Chưa có buổi điểm danh nào.</p>
                  </div>
                }
              </div>

            </div>

            <!-- Quick Link sang Kết quả học tập -->
            <div class="rounded-2xl bg-gradient-to-br from-primary/5 to-base-200/50 border border-primary/20 p-4 flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg shrink-0">
                  <i class="fa-solid fa-graduation-cap"></i>
                </div>
                <div>
                  <p class="text-xs font-bold text-base-content">Xem điểm số &amp; nhận xét</p>
                  <p class="text-[11px] text-base-content/50">Chi tiết lời phê của giáo viên</p>
                </div>
              </div>
              <a routerLink="/results" class="btn btn-outline btn-primary btn-xs rounded-xl font-semibold gap-1">
                Xem ngay <i class="fa-solid fa-chevron-right text-[10px]"></i>
              </a>
            </div>

          </div>

        </div>

      </div>
    } @else {
      <div class="card bg-base-100 border border-base-200 shadow-sm max-w-md mx-auto mt-16 rounded-2xl">
        <div class="card-body items-center text-center py-12 space-y-3">
          <i class="fa-solid fa-circle-notch fa-spin text-3xl text-primary"></i>
          <p class="text-sm font-medium text-base-content/60">Đang tải thông tin lớp học…</p>
        </div>
      </div>
    }
  `
})
export class MyClassComponent implements OnInit {
  cls: ClassDetail | null = null;
  assignments: AssignmentRow[] = [];
  subs: SubRow[] = [];
  attendance: AttRow[] = [];

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<any>(`/api/classes/${id}`).subscribe({
      next: (res) => {
        if (res.success) this.cls = res.data;
        else this.toast.error(res.error ?? 'Không tải được lớp.');
      }
    });
    this.http.get<any>(`/api/assignments?classId=${id}`).subscribe({
      next: (res) => { if (res.success) this.assignments = res.data; }
    });
    this.http.get<any>('/api/submissions/mine').subscribe({
      next: (res) => { if (res.success) this.subs = res.data; }
    });
    this.http.get<any>(`/api/classes/${id}/attendance/mine`).subscribe({
      next: (res) => { if (res.success) this.attendance = res.data; }
    });
  }

  statusOf(assignmentId: string): string {
    return this.subs.find((s) => s.assignmentId === assignmentId)?.status ?? 'Doing';
  }

  scoreOf(assignmentId: string): number {
    return this.subs.find((s) => s.assignmentId === assignmentId)?.finalScore ?? 0;
  }

  count(status: string): number {
    return this.attendance.filter((a) => a.status === status).length;
  }

  initials(name: string): string {
    return name.split(' ').slice(-2).map((w) => w[0]).join('').toUpperCase() || '?';
  }

  formatDateVi(dateStr?: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[d.getDay()];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${dayName}, ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }
}

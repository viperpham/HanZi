import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

interface Pending { submissionId: string; assignmentId: string; assignmentTitle: string; studentName: string; submittedAt: string; }
interface Daily { date: string; count: number; }
interface ClassToday {
  classId: string; name: string; code: string; schedule?: string; room?: string;
  studentCount: number; avgProgressPercent: number;
  nextLessonId?: string; nextLessonOrderNo?: number; nextLessonZh?: string; nextLessonVi?: string;
}
interface AtRisk { studentId: string; studentName: string; classId: string; className: string; progressPercent: number; avgScore?: number; }
interface RecentActivity { id: string; actorName: string; action: string; createdAt: string; }
interface TeacherHome {
  pendingGrading: number; classesCount: number; curriculumsCount: number; onTimeRate: number;
  pendingList: Pending[]; last7Days: Daily[];
  todayClasses: ClassToday[]; atRiskStudents: AtRisk[]; recentActivities: RecentActivity[];
}

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    <div class="space-y-6">

      <!-- Page Header -->
      <div>
        <h1 class="text-2xl font-extrabold text-base-content">Bảng điều khiển</h1>
        <p class="text-sm text-base-content/50 mt-1">Tổng quan hoạt động giảng dạy của bạn</p>
      </div>

      <!-- Stat Cards -->
      <div class="stats stats-vertical md:stats-horizontal shadow-sm border border-base-200 w-full bg-base-100">
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

        <div class="stat">
          <div class="stat-figure">
            <div class="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <i class="fa-solid fa-chalkboard text-success text-xl"></i>
            </div>
          </div>
          <div class="stat-title text-xs">Lớp đang dạy</div>
          <div class="stat-value text-success">{{ data?.classesCount ?? 0 }}</div>
          <div class="stat-desc">Đang hoạt động</div>
        </div>

        <div class="stat">
          <div class="stat-figure">
            <div class="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
              <i class="fa-solid fa-book-open text-info text-xl"></i>
            </div>
          </div>
          <div class="stat-title text-xs">Giáo trình</div>
          <div class="stat-value text-info">{{ data?.curriculumsCount ?? 0 }}</div>
          <div class="stat-desc">Đang phụ trách</div>
        </div>

        <div class="stat">
          <div class="stat-figure">
            <div class="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <i class="fa-solid fa-clock text-warning text-xl"></i>
            </div>
          </div>
          <div class="stat-title text-xs">Nộp đúng hạn</div>
          <div class="stat-value text-warning">{{ data?.onTimeRate ?? 0 }}%</div>
          <div class="stat-desc">Tỉ lệ học viên</div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="grid gap-6 lg:grid-cols-2">

        <!-- Pending Submissions -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold mb-3">
              <i class="fa-solid fa-inbox text-base-content/50 mr-1"></i>
              Bài cần chấm ngay
            </h2>
            <div class="space-y-2">
              @for (p of data?.pendingList ?? []; track p.submissionId) {
                <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors">
                  <div class="w-9 h-9 rounded-full bg-error/10 flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-file-lines text-sm text-error"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-base-content truncate">{{ p.assignmentTitle }}</p>
                    <p class="text-xs text-base-content/40">
                      {{ p.studentName }} &middot; nộp {{ p.submittedAt | date:'dd/MM HH:mm' }}
                    </p>
                  </div>
                  <a routerLink="/grading" class="btn btn-error btn-xs text-white gap-1 shrink-0">
                    <i class="fa-solid fa-pen-nib"></i> Chấm
                  </a>
                </div>
              } @empty {
                <div class="py-8 text-center">
                  <i class="fa-solid fa-circle-check text-3xl text-success/60"></i>
                  <p class="text-sm text-base-content/40 mt-2">Đã chấm hết bài!</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Chart.js Bar Chart -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold mb-4">
              <i class="fa-solid fa-chart-column text-base-content/50 mr-1"></i>
              Nộp bài 7 ngày qua
            </h2>
            <div class="relative h-44">
              <canvas #barChart></canvas>
              @if (!data?.last7Days?.length) {
                <div class="absolute inset-0 flex items-center justify-center">
                  <p class="text-sm text-base-content/40">Chưa có dữ liệu</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Lịch dạy + bài đang học của từng lớp -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold mb-3">
              <i class="fa-solid fa-calendar-days text-base-content/50 mr-1"></i>
              Lịch dạy &amp; bài đang học
            </h2>
            <div class="space-y-2">
              @for (c of data?.todayClasses ?? []; track c.classId) {
                <div class="p-3 rounded-xl border border-base-200 hover:border-error/30 transition-colors">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="badge badge-error badge-sm text-white font-semibold">{{ c.code }}</span>
                    <span class="text-sm font-bold text-base-content">{{ c.name }}</span>
                    <span class="ml-auto text-xs font-semibold"
                      [class]="c.avgProgressPercent < 40 ? 'text-warning' : 'text-success'">
                      Tiến độ {{ c.avgProgressPercent }}%
                    </span>
                  </div>
                  <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-base-content/50">
                    <span><i class="fa-regular fa-clock mr-1"></i>{{ c.schedule || 'Chưa xếp lịch' }}</span>
                    <span><i class="fa-solid fa-location-dot mr-1"></i>{{ c.room || '—' }}</span>
                    <span><i class="fa-solid fa-users mr-1"></i>{{ c.studentCount }} học viên</span>
                  </div>
                  @if (c.nextLessonId) {
                    <div class="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-base-200/60">
                      <span class="text-xs text-base-content/50">Bài đang học:</span>
                      <span class="text-xs font-semibold text-base-content">
                        Bài {{ c.nextLessonOrderNo }} · <span class="hanzi">{{ c.nextLessonZh }}</span> — {{ c.nextLessonVi }}
                      </span>
                      <a [routerLink]="['/learn', c.nextLessonId]" class="btn btn-ghost btn-xs gap-1 text-error ml-auto">
                        <i class="fa-solid fa-chalkboard-user fa-xs"></i> Xem bài
                      </a>
                    </div>
                  }
                </div>
              } @empty {
                <div class="py-8 text-center">
                  <i class="fa-solid fa-chalkboard text-3xl text-base-content/20"></i>
                  <p class="text-sm text-base-content/40 mt-2">Chưa có lớp nào</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Học viên cần chú ý -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold mb-3">
              <i class="fa-solid fa-user-clock text-base-content/50 mr-1"></i>
              Học viên cần chú ý
            </h2>
            <div class="space-y-2">
              @for (s of data?.atRiskStudents ?? []; track s.studentId + s.classId) {
                <div class="flex items-center gap-3 p-3 rounded-xl hover:bg-base-200 transition-colors">
                  <div class="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-user text-sm text-warning"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-base-content truncate">{{ s.studentName }}</p>
                    <p class="text-xs text-base-content/40">{{ s.className }}</p>
                  </div>
                  <div class="w-24 shrink-0">
                    <progress class="progress h-2"
                      [class.progress-warning]="s.progressPercent < 30"
                      [class.progress-success]="s.progressPercent >= 30"
                      [value]="s.progressPercent" max="100"></progress>
                    <p class="text-[10px] text-base-content/40 text-center mt-0.5">{{ s.progressPercent }}%</p>
                  </div>
                  <span class="text-xs font-bold text-base-content/60 shrink-0 w-9 text-right">
                    {{ s.avgScore ?? '—' }}
                  </span>
                </div>
              } @empty {
                <div class="py-8 text-center">
                  <i class="fa-solid fa-thumbs-up text-3xl text-success/60"></i>
                  <p class="text-sm text-base-content/40 mt-2">Tất cả học viên đều có tiến độ tốt!</p>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Hoạt động gần đây -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold mb-3">
              <i class="fa-solid fa-wave-square text-base-content/50 mr-1"></i>
              Hoạt động gần đây
            </h2>
            <div class="space-y-2">
              @for (a of data?.recentActivities ?? []; track a.id) {
                <div class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-base-200 transition-colors">
                  <div class="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-bolt text-xs text-info"></i>
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-base-content">
                      <span class="font-semibold">{{ a.actorName }}</span> — {{ a.action }}
                    </p>
                    <p class="text-xs text-base-content/40">{{ a.createdAt | date:'dd/MM HH:mm' }}</p>
                  </div>
                </div>
              } @empty {
                <div class="py-8 text-center">
                  <i class="fa-solid fa-wind text-3xl text-base-content/20"></i>
                  <p class="text-sm text-base-content/40 mt-2">Chưa có hoạt động nào</p>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="flex flex-wrap gap-3">
        <a routerLink="/curriculums" class="btn btn-error text-white gap-2">
          <i class="fa-solid fa-book-open"></i> Giáo trình
        </a>
        <a routerLink="/classes" class="btn btn-outline gap-2">
          <i class="fa-solid fa-chalkboard"></i> Lớp học
        </a>
        <a routerLink="/assignments" class="btn btn-outline gap-2">
          <i class="fa-solid fa-clipboard-list"></i> Tạo bài tập
        </a>
      </div>
    </div>
  `
})
export class TeacherDashboardComponent implements OnInit, AfterViewInit {
  data: TeacherHome | null = null;
  private http = inject(HttpClient);
  private chart: Chart | null = null;

  @ViewChild('barChart') barChartRef!: ElementRef<HTMLCanvasElement>;

  ngOnInit() {
    this.http.get<any>('/api/dashboard/teacher').subscribe({
      next: (res) => {
        if (res.success) {
          this.data = res.data;
          this.renderChart();
        }
      }
    });
  }

  ngAfterViewInit() {
    if (this.data) this.renderChart();
  }

  renderChart() {
    if (!this.barChartRef || !this.data?.last7Days?.length) return;
    if (this.chart) this.chart.destroy();

    const days = this.data.last7Days;
    this.chart = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: days.map(d => d.date),
        datasets: [{
          data: days.map(d => d.count),
          backgroundColor: 'rgba(220,38,38,0.15)',
          borderColor: '#dc2626',
          borderWidth: 2,
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: { label: (ctx) => ` ${ctx.parsed.y} bài nộp` }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } }
        }
      }
    });
  }
}

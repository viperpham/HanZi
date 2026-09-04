import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

interface Pending { submissionId: string; assignmentId: string; assignmentTitle: string; studentName: string; submittedAt: string; }
interface Daily { date: string; count: number; }
interface TeacherHome {
  pendingGrading: number; classesCount: number; curriculumsCount: number; onTimeRate: number;
  pendingList: Pending[]; last7Days: Daily[];
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

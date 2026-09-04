import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface Curriculum { id: string; nameVi: string; nameZh: string; level: string; coverEmoji: string; status: string; lessonCount: number; }
interface LessonBrief { id: string; orderNo: number; titleVi: string; titleZh: string; vocabCount: number; }
interface Progress { lessonId: string; currentPart: number; }

type StatusFilter = 'all' | 'done' | 'doing' | 'new';

@Component({
  selector: 'app-student-learn',
  standalone: true,
  template: `
    <div class="space-y-5">
      <div>
        <h1 class="text-2xl font-extrabold text-base-content">Học bài</h1>
        <p class="text-sm text-base-content/50 mt-0.5">Chọn giáo trình và bài học để bắt đầu</p>
      </div>

      @if (!curriculumId()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (c of curriculums; track c.id) {
            <button (click)="pick(c.id)"
              class="card bg-base-100 border border-base-200 shadow-sm hover:border-error/40 hover:shadow-md transition-all text-left">
              <div class="card-body p-5 flex-row items-center gap-4">
                <div class="w-12 h-12 rounded-2xl bg-error/10 flex items-center justify-center text-error text-xl shrink-0 font-extrabold">
                  <i class="fa-solid fa-book-open"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="hanzi font-bold text-base-content text-lg truncate">{{ c.nameZh }}</p>
                  <p class="text-sm font-semibold text-base-content/70 truncate">{{ c.nameVi }} &middot; {{ c.level }}</p>
                  <p class="text-xs text-base-content/40 mt-0.5">{{ c.lessonCount }} bài học</p>
                </div>
              </div>
            </button>
          }
        </div>
        @if (!curriculums.length) {
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body p-12 items-center text-center">
              <i class="fa-solid fa-book-open text-4xl text-base-content/15 mb-3"></i>
              <p class="text-sm text-base-content/40">Chưa có giáo trình nào được xuất bản.</p>
            </div>
          </div>
        }
      } @else {
        <button (click)="back()" class="btn btn-outline btn-sm gap-2">
          <i class="fa-solid fa-arrow-left"></i> Chọn giáo trình khác
        </button>

        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="text-sm font-semibold text-base-content/70">Tiến độ giáo trình:</span>
            <progress class="progress progress-error w-44 h-2.5" [value]="curriculumProgress()" max="100"></progress>
            <span class="text-sm font-bold text-error">{{ curriculumProgress() }}%</span>
          </div>
          <div class="select-wrap">
            <select [(ngModel)]="filter" class="select select-sm">
              <option value="all">Tất cả bài</option>
              <option value="done">Đã học xong</option>
              <option value="doing">Đang học</option>
              <option value="new">Chưa học</option>
            </select>
          </div>
        </div>

        <div class="space-y-3">
          @for (l of filteredLessons(); track l.id) {
            <div class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow">
              <div class="card-body p-4 flex-row flex-wrap items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0 font-extrabold text-error">
                  {{ l.orderNo }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="hanzi truncate text-lg font-bold text-base-content">{{ l.titleZh }} &middot; {{ l.titleVi }}</p>
                  <p class="text-sm text-base-content/50 mt-0.5">
                    <i class="fa-solid fa-font fa-xs mr-1"></i>{{ l.vocabCount }} từ mới
                  </p>
                  @if (progressOf(l.id)) {
                    <progress class="progress progress-error w-36 h-1.5 mt-2" [value]="progressOf(l.id)! * 20" max="100"></progress>
                  }
                </div>
                @switch (statusOf(l.id)) {
                  @case ('done') {
                    <span class="badge badge-success badge-sm gap-1">
                      <i class="fa-solid fa-check fa-xs"></i> Đã học xong
                    </span>
                  }
                  @case ('doing') {
                    <span class="badge badge-info badge-sm gap-1">
                      <i class="fa-solid fa-spinner fa-xs"></i> Đang học (Phần {{ progressOf(l.id) }}/5)
                    </span>
                  }
                  @default {
                    <span class="badge badge-ghost badge-sm">Chưa học</span>
                  }
                }
                <button (click)="learn(l)" class="btn btn-error btn-sm text-white gap-2">
                  {{ statusOf(l.id) === 'new' ? 'Học ngay' : 'Học tiếp' }}
                  <i class="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          }
        </div>
        @if (!filteredLessons().length) {
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body p-12 items-center text-center">
              <i class="fa-solid fa-filter text-4xl text-base-content/15 mb-3"></i>
              <p class="text-sm text-base-content/40">Không có bài nào ở mục lọc này.</p>
            </div>
          </div>
        }
      }
    </div>
  `,
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`],
  imports: [FormsModule]
})
export class StudentLearnComponent implements OnInit {
  curriculums: Curriculum[] = [];
  lessons: LessonBrief[] = [];
  curriculumId = signal('');
  progress: Progress[] = [];
  filter = signal<StatusFilter>('all');

  private http = inject(HttpClient);
  private router = inject(Router);

  ngOnInit() {
    this.http.get<any>('/api/curriculums').subscribe({
      next: (res) => { if (res.success) this.curriculums = (res.data.items ?? []).filter((c: any) => c.status === 'Published'); }
    });
    this.http.get<any>('/api/progress/mine').subscribe({
      next: (res) => { if (res.success) this.progress = res.data; }
    });
  }

  // Method thường (không dùng computed) — vì lessons/progress là mảng thường,
  // computed sẽ cache kết quả cũ và không bao giờ tính lại khi mảng thay đổi
  filteredLessons(): LessonBrief[] {
    const f = this.filter();
    if (f === 'all') return this.lessons;
    return this.lessons.filter((l) => this.statusOf(l.id) === f);
  }

  curriculumProgress(): number {
    if (!this.lessons.length) return 0;
    const done = this.lessons.filter((l) => this.statusOf(l.id) === 'done').length;
    return Math.round((done / this.lessons.length) * 100);
  }

  pick(id: string) {
    this.curriculumId.set(id);
    this.http.get<any>(`/api/lessons?curriculumId=${id}`).subscribe({
      next: (res) => { if (res.success) this.lessons = res.data; }
    });
  }

  back() {
    this.curriculumId.set('');
    this.filter.set('all');
    this.lessons = [];
  }

  progressOf(lessonId: string): number | null {
    return this.progress.find((p) => p.lessonId === lessonId)?.currentPart ?? null;
  }

  statusOf(lessonId: string): 'done' | 'doing' | 'new' {
    const p = this.progressOf(lessonId);
    if (!p) return 'new';
    return p >= 5 ? 'done' : 'doing';
  }

  learn(l: LessonBrief) { this.router.navigate(['/learn', l.id]); }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ToastService } from '../toast.service';

interface ClassRow { id: string; name: string; }
interface AssignmentRow { id: string; title: string; dueAt: string; questionCount: number; className: string; status: string; finalScore: number; }

@Component({
  selector: 'app-my-assignments',
  standalone: true,
  template: `
    <div class="space-y-5">
      <div>
        <h1 class="text-2xl font-extrabold text-base-content">Bài tập của tôi</h1>
        <p class="text-sm text-base-content/50 mt-0.5">Tất cả bài tập từ các lớp đang tham gia</p>
      </div>

      <!-- Filter tabs -->
      <div class="flex flex-wrap gap-2">
        @for (f of filters; track f.key) {
          <button (click)="filter.set(f.key)"
            [class]="filter() === f.key ? 'btn btn-sm btn-error text-white gap-2' : 'btn btn-sm btn-ghost gap-2'">
            <i [class]="'fa-solid fa-sm ' + f.icon"></i>
            {{ f.label }}
            @if (f.key !== 'all') {
              <span [class]="filter() === f.key ? 'badge badge-sm bg-white/20 text-white border-0' : 'badge badge-sm badge-ghost'">
                {{ countFor(f.key) }}
              </span>
            }
          </button>
        }
      </div>

      <!-- Assignment Cards -->
      <div class="space-y-3">
        @for (a of filtered(); track a.id) {
          <div class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="card-body p-5 flex-row flex-wrap items-center gap-4">

              <!-- Status icon -->
              @if (!a.status || a.status === 'Doing') {
                <div class="w-11 h-11 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
                  <i class="fa-solid fa-file-pen text-xl text-error"></i>
                </div>
              } @else if (a.status === 'Submitted') {
                <div class="w-11 h-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <i class="fa-solid fa-hourglass-half text-xl text-warning"></i>
                </div>
              } @else {
                <div class="w-11 h-11 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <i class="fa-solid fa-circle-check text-xl text-success"></i>
                </div>
              }

              <!-- Info -->
              <div class="min-w-0 flex-1">
                <p class="font-bold text-base-content">{{ a.title }}</p>
                <p class="text-sm text-base-content/50 mt-0.5">
                  <i class="fa-solid fa-chalkboard fa-xs mr-1"></i>{{ a.className }}
                  &nbsp;&middot;&nbsp;
                  <i class="fa-solid fa-clock fa-xs mr-1"></i>Hạn {{ a.dueAt | date:'dd/MM HH:mm' }}
                  &nbsp;&middot;&nbsp;
                  <i class="fa-solid fa-list-ol fa-xs mr-1"></i>{{ a.questionCount }} câu
                </p>
              </div>

              <!-- Score / Status badge -->
              @if (a.status === 'Graded') {
                <div class="text-center shrink-0">
                  <p class="text-2xl font-extrabold text-success">{{ a.finalScore }}<span class="text-sm text-base-content/30">/10</span></p>
                  <p class="text-xs text-success/70 font-semibold">Đã chấm</p>
                </div>
              } @else if (a.status === 'Submitted') {
                <span class="badge badge-warning gap-1 shrink-0">
                  <i class="fa-solid fa-hourglass-half fa-xs"></i> Chờ chấm
                </span>
              } @else {
                <span class="badge badge-error gap-1 shrink-0">
                  <i class="fa-solid fa-circle-exclamation fa-xs"></i> Cần làm
                </span>
              }

              <!-- CTA button -->
              @if (!a.status || a.status === 'Doing') {
                <button (click)="open(a)" class="btn btn-error btn-sm text-white shrink-0 gap-2">
                  <i class="fa-solid fa-play"></i> Vào làm bài
                </button>
              } @else if (a.status === 'Submitted') {
                <button (click)="open(a)" class="btn btn-ghost btn-sm shrink-0 gap-2">
                  <i class="fa-solid fa-circle-check"></i> Đã nộp
                </button>
              } @else {
                <button (click)="open(a)" class="btn btn-ghost btn-sm shrink-0 gap-2">
                  <i class="fa-solid fa-magnifying-glass"></i> Xem kết quả
                </button>
              }
            </div>
          </div>
        }
      </div>

      @if (!filtered().length) {
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-12 items-center text-center">
            <i class="fa-solid fa-clipboard-list text-4xl text-base-content/15 mb-3"></i>
            <p class="text-sm text-base-content/40">Không có bài tập nào trong mục này.</p>
          </div>
        </div>
      }
    </div>
  `,
  imports: [DatePipe]
})
export class MyAssignmentsComponent implements OnInit {
  items: AssignmentRow[] = [];
  filter = signal<'todo' | 'submitted' | 'graded' | 'all'>('all');
  filters = [
    { key: 'all' as const,       label: 'Tất cả',   icon: 'fa-list' },
    { key: 'todo' as const,      label: 'Cần làm',  icon: 'fa-file-pen' },
    { key: 'submitted' as const, label: 'Chờ chấm', icon: 'fa-hourglass-half' },
    { key: 'graded' as const,    label: 'Đã chấm',  icon: 'fa-circle-check' }
  ];

  // Method thường — items là mảng thường, computed sẽ cache kết quả cũ
  filtered() {
    const f = this.filter();
    if (f === 'all') return this.items;
    if (f === 'todo') return this.items.filter((a) => !a.status || a.status === 'Doing');
    return this.items.filter((a) => a.status.toLowerCase() === f);
  }

  countFor(key: string): number {
    if (key === 'todo') return this.items.filter(a => !a.status || a.status === 'Doing').length;
    return this.items.filter(a => a.status?.toLowerCase() === key).length;
  }

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private router = inject(Router);

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('/api/classes').subscribe({
      next: async (cls) => {
        if (!cls.success) return;
        const classes: ClassRow[] = cls.data;
        const all: AssignmentRow[] = [];
        const mine = await new Promise<any>((resolve) =>
          this.http.get<any>('/api/submissions/mine').subscribe(resolve));

        for (const c of classes) {
          const res = await new Promise<any>((resolve) =>
            this.http.get<any>(`/api/assignments?classId=${c.id}`).subscribe(resolve));
          for (const a of res?.data ?? []) {
            const sub = (mine?.data ?? []).find((s: any) => s.assignmentId === a.id);
            all.push({ ...a, className: c.name, status: sub?.status ?? 'Doing', finalScore: sub?.finalScore ?? 0, id: a.id });
          }
        }
        this.items = all;
      },
      error: () => this.toast.error('Không tải được danh sách lớp.')
    });
  }

  open(a: AssignmentRow) {
    this.router.navigate(a.status === 'Graded' ? ['/results'] : ['/do', a.id]);
  }
}

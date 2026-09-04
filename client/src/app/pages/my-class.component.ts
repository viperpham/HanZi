import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../toast.service';

interface ClassDetail {
  id: string; code: string; name: string; curriculumId: string; curriculumName: string;
  teacherName: string; schedule?: string; room?: string; status: string;
  students: { id: string; fullName: string }[];
}
interface AssignmentRow { id: string; title: string; dueAt: string; questionCount: number; }
interface SubRow { assignmentId: string; status: string; finalScore: number; }
interface AttRow { date: string; status: string; }

@Component({
  selector: 'app-my-class',
  standalone: true,
  imports: [DatePipe, RouterLink],
  template: `
    @if (cls; as c) {
      <div class="space-y-6">

        <!-- Header -->
        <div class="card bg-gradient-to-r from-error to-rose-500 text-white shadow-md">
          <div class="card-body p-6 flex-row flex-wrap items-center gap-5">
            <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-chalkboard text-2xl"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h1 class="text-xl font-extrabold">{{ c.name }}</h1>
              <p class="text-sm opacity-90 mt-0.5">
                <i class="fa-solid fa-chalkboard-user mr-1"></i>{{ c.teacherName }}
                @if (c.schedule) { · <i class="fa-solid fa-clock mr-1"></i>{{ c.schedule }} }
                @if (c.room) { · <i class="fa-solid fa-location-dot mr-1"></i>{{ c.room }} }
              </p>
            </div>
            <a routerLink="/learn" class="btn bg-white text-error border-0 gap-2 shrink-0">
              <i class="fa-solid fa-book-open"></i> Vào học bài
            </a>
          </div>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">

          <!-- Bài tập của lớp -->
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body p-5">
              <h2 class="card-title text-base font-bold mb-2">
                <i class="fa-solid fa-clipboard-list text-base-content/50 mr-1"></i>
                Bài tập của lớp
              </h2>
              <div class="space-y-2">
                @for (a of assignments; track a.id) {
                  <div class="flex items-center gap-3 p-3 rounded-xl border border-base-200 hover:bg-base-200 transition-colors">
                    <div class="min-w-0 flex-1">
                      <p class="text-sm font-semibold truncate">{{ a.title }}</p>
                      <p class="text-xs text-base-content/40">Hạn {{ a.dueAt | date:'dd/MM HH:mm' }} · {{ a.questionCount }} câu</p>
                    </div>
                    @switch (statusOf(a.id)) {
                      @case ('Graded') { <span class="badge badge-success badge-sm text-white">{{ scoreOf(a.id) }}/10</span> }
                      @case ('Submitted') { <span class="badge badge-warning badge-sm text-white">Chờ chấm</span> }
                      @default {
                        <a [routerLink]="'/do/' + a.id" class="btn btn-error btn-xs text-white gap-1">
                          <i class="fa-solid fa-pen"></i> Làm
                        </a>
                      }
                    }
                  </div>
                } @empty {
                  <p class="py-6 text-center text-sm text-base-content/40">Lớp chưa có bài tập nào.</p>
                }
              </div>
              <a routerLink="/my-assignments" class="btn btn-ghost btn-sm gap-1 mt-2 self-start">
                Tất cả bài tập <i class="fa-solid fa-arrow-right text-xs"></i>
              </a>
            </div>
          </div>

          <!-- Điểm danh của tôi -->
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body p-5">
              <h2 class="card-title text-base font-bold mb-2">
                <i class="fa-solid fa-clipboard-check text-base-content/50 mr-1"></i>
                Điểm danh của tôi
              </h2>
              <div class="flex gap-2 mb-2 text-xs">
                <span class="badge badge-success badge-outline">✓ {{ count('Present') }} buổi có mặt</span>
                <span class="badge badge-warning badge-outline">🕐 {{ count('Late') }} muộn</span>
                <span class="badge badge-error badge-outline">✕ {{ count('Absent') }} vắng</span>
              </div>
              <div class="max-h-72 space-y-1.5 overflow-y-auto">
                @for (a of attendance; track a.date) {
                  <div class="flex items-center justify-between rounded-lg border border-base-200 px-3 py-1.5">
                    <span class="text-sm">{{ a.date | date:'EEEE, dd/MM/yyyy' }}</span>
                    @switch (a.status) {
                      @case ('Present') { <span class="badge badge-success badge-sm text-white">Có mặt</span> }
                      @case ('Late') { <span class="badge badge-warning badge-sm text-white">Muộn</span> }
                      @default { <span class="badge badge-error badge-sm text-white">Vắng</span> }
                    }
                  </div>
                } @empty {
                  <p class="py-6 text-center text-sm text-base-content/40">Chưa có buổi điểm danh nào.</p>
                }
              </div>
            </div>
          </div>
        </div>

        <!-- Bạn cùng lớp -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <h2 class="card-title text-base font-bold">
              <i class="fa-solid fa-users text-base-content/50 mr-1"></i>
              Bạn cùng lớp ({{ cls.students.length }})
            </h2>
            <div class="flex flex-wrap gap-2 mt-1">
              @for (s of cls.students; track s.id) {
                <span class="badge badge-ghost gap-1 py-2.5">
                  <span class="grid h-5 w-5 place-items-center rounded-full bg-error/10 text-[10px] font-bold text-error">
                    {{ initials(s.fullName) }}</span>
                  {{ s.fullName }}
                </span>
              }
            </div>
          </div>
        </div>
      </div>
    } @else {
      <div class="card bg-base-100 border border-base-200 shadow-sm max-w-md mx-auto mt-10">
        <div class="card-body items-center text-center">
          <i class="fa-solid fa-spinner fa-spin text-3xl text-base-content/30"></i>
          <p class="text-sm text-base-content/50">Đang tải lớp học…</p>
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
}

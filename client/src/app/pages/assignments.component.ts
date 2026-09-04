import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';

interface ClassRow { id: string; name: string; }
interface AssignmentRow { id: string; title: string; dueAt: string; questionCount: number; }

@Component({
  selector: 'app-assignments',
  standalone: true,
  template: `
    <div class="space-y-6">

      <!-- ===== HEADER ===== -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Bài tập</h1>
          <p class="text-sm text-base-content/50 mt-0.5">Quản lý và giao bài tập cho lớp</p>
        </div>
        <button (click)="add()" class="btn btn-error btn-sm text-white gap-2 shadow-sm shadow-error/30">
          <i class="fa-solid fa-plus"></i> Giao bài tập
        </button>
      </div>

      <!-- ===== FILTER BAR ===== -->
      <div class="card bg-base-100 border border-base-200 shadow-sm">
        <div class="card-body p-4">
          <div class="flex flex-wrap items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-filter text-error text-sm"></i>
            </div>
            <span class="text-sm font-semibold text-base-content/70">Lọc theo lớp</span>
            <div class="select-wrap">
              <select [(ngModel)]="classId" (change)="load()"
                class="select select-sm min-w-[200px]">
                <option value="" disabled>— chọn lớp —</option>
                @for (c of classes; track c.id) {
                  <option [value]="c.id">{{ c.name }}</option>
                }
              </select>
            </div>
            @if (classId && items.length) {
              <span class="ml-auto text-xs font-semibold text-base-content/40">
                {{ items.length }} bài tập
              </span>
            }
          </div>
        </div>
      </div>

      <!-- ===== BẢNG BÀI TẬP ===== -->
      @if (classId && items.length) {
        <div class="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="table w-full min-w-[600px]">
              <thead>
                <tr class="bg-base-200/50">
                  <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3">Bài tập</th>
                  <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3">Hạn nộp</th>
                  <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3 text-center">Số câu</th>
                  <th class="py-3 text-right"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-base-200">
                @for (a of items; track a.id) {
                  <tr class="hover:bg-base-50 transition-colors group">
                    <!-- Tiêu đề -->
                    <td class="py-3.5">
                      <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg bg-error/8 flex items-center justify-center shrink-0">
                          <i class="fa-solid fa-clipboard-list text-error text-xs"></i>
                        </div>
                        <span class="font-semibold text-sm text-base-content">{{ a.title }}</span>
                      </div>
                    </td>

                    <!-- Hạn nộp -->
                    <td class="py-3.5">
                      <div class="flex items-center gap-1.5 text-sm text-base-content/60">
                        <i class="fa-solid fa-clock fa-xs text-base-content/30"></i>
                        {{ a.dueAt | date:'dd/MM/yyyy HH:mm' }}
                      </div>
                    </td>

                    <!-- Số câu -->
                    <td class="py-3.5 text-center">
                      <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                                   bg-base-200 text-base-content/60">
                        {{ a.questionCount }} câu
                      </span>
                    </td>

                    <!-- Hành động -->
                    <td class="py-3.5 text-right">
                      <div class="flex items-center justify-end gap-0.5
                                  opacity-40 group-hover:opacity-100 transition-opacity">
                        <button (click)="view(a)" title="Xem đề"
                          class="btn btn-ghost btn-xs btn-square hover:text-info hover:bg-info/10 rounded-lg">
                          <i class="fa-solid fa-eye fa-xs"></i>
                        </button>
                        <button (click)="edit(a)" title="Sửa bài tập"
                          class="btn btn-ghost btn-xs btn-square hover:text-warning hover:bg-warning/10 rounded-lg">
                          <i class="fa-solid fa-pencil fa-xs"></i>
                        </button>
                        <button (click)="exportScores(a)" title="Xuất điểm CSV"
                          class="btn btn-ghost btn-xs btn-square hover:text-success hover:bg-success/10 rounded-lg">
                          <i class="fa-solid fa-chart-simple fa-xs"></i>
                        </button>
                      <button (click)="viewSubs(a)" title="Xem bài đã nộp"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-warning">
                        <i class="fa-solid fa-inbox"></i>
                      </button>
                        <button (click)="del(a)" title="Xoá bài tập"
                          class="btn btn-ghost btn-xs btn-square hover:text-error hover:bg-error/10 rounded-lg">
                          <i class="fa-solid fa-trash fa-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      @if (classId && !items.length) {
        <div class="card bg-base-100 border border-dashed border-base-300">
          <div class="card-body py-16 items-center text-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-base-200 flex items-center justify-center">
              <i class="fa-solid fa-clipboard-list text-2xl text-base-content/20"></i>
            </div>
            <p class="text-sm text-base-content/40">Lớp này chưa có bài tập nào</p>
            <button (click)="add()" class="btn btn-error btn-sm text-white gap-2 mt-1">
              <i class="fa-solid fa-plus fa-xs"></i> Giao bài tập ngay
            </button>
          </div>
        </div>
      }

      @if (!classId) {
        <div class="card bg-base-100 border border-dashed border-base-300">
          <div class="card-body py-16 items-center text-center gap-3">
            <div class="w-14 h-14 rounded-2xl bg-error/5 border border-error/15 flex items-center justify-center">
              <i class="fa-solid fa-filter text-2xl text-error/30"></i>
            </div>
            <p class="text-sm text-base-content/40">Chọn lớp để xem danh sách bài tập</p>
          </div>
        </div>
      }

      <!-- ===== XEM ĐỀ BÀI TẬP ===== -->
      @if (detail; as d) {
        <div class="card bg-base-100 border border-info/25 shadow-sm">
          <div class="card-body p-5 gap-4">
            <div class="flex flex-wrap items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-info/10 flex items-center justify-center">
                <i class="fa-solid fa-eye text-info text-sm"></i>
              </div>
              <div>
                <h2 class="text-base font-extrabold text-base-content">{{ d.title }}</h2>
                <p class="text-xs text-base-content/40">
                  {{ d.questions.length }} câu
                  @if (d.dueAt) { · Hạn {{ d.dueAt | date:'dd/MM HH:mm' }} }
                </p>
              </div>
              <button (click)="detail = null" class="btn btn-ghost btn-sm ml-auto gap-2">
                <i class="fa-solid fa-xmark"></i> Đóng
              </button>
            </div>

            @if (d.description) {
              <div class="rounded-xl bg-base-200/60 px-4 py-2.5 text-sm text-base-content/70">
                <i class="fa-solid fa-quote-left fa-xs mr-2 text-base-content/30"></i>{{ d.description }}
              </div>
            }

            <div class="space-y-2.5">
              @for (q of d.questions; track q.id) {
                <div class="rounded-xl border border-base-200 bg-base-50/50 p-4">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="grid h-6 w-6 place-items-center rounded-lg bg-error/10 text-xs font-bold text-error">{{ q.orderNo }}</span>
                    <span class="text-xs px-2 py-0.5 rounded-full bg-base-200 text-base-content/60 font-medium">{{ q.type }}</span>
                    <span class="text-xs text-base-content/40">{{ q.points }} điểm</span>
                  </div>
                  <p class="hanzi text-sm font-semibold text-base-content">{{ q.prompt }}</p>
                  @if (q.options?.length) {
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      @for (opt of q.options; track $index) {
                        <span class="hanzi rounded-lg px-2.5 py-1 text-xs border transition-colors"
                          [class]="isAns(q, $index) ? 'border-success/40 bg-success/10 font-bold text-success' : 'border-base-200 text-base-content/60'">
                          {{ ['A','B','C','D'][$index] }}. {{ opt }}
                          @if (isAns(q, $index)) { <i class="fa-solid fa-check fa-xs ml-1"></i> }
                        </span>
                      }
                    </div>
                  }
                  @if (q.answer && q.type !== 'MultipleChoice') {
                    <p class="mt-2 text-xs">
                      <span class="text-base-content/40">Đáp án: </span>
                      <span class="hanzi font-semibold text-success">{{ q.answer }}</span>
                    </p>
                  }
                  @if (q.sampleAnswer) {
                    <p class="mt-1 text-xs text-base-content/40">
                      <i class="fa-solid fa-lightbulb fa-xs mr-1"></i>{{ q.sampleAnswer }}
                    </p>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ===== BÀI ĐÃ NỘP ===== -->
      @if (subsView; as sv) {
        <div class="card bg-base-100 border border-warning/40 shadow-md">
          <div class="card-body p-5 gap-3">
            <div class="flex flex-wrap items-center gap-3">
              <h2 class="text-lg font-extrabold text-base-content">📥 Bài đã nộp: {{ sv.assignment.title }}</h2>
              <span class="badge badge-ghost badge-sm">{{ sv.subs.length }} bài nộp</span>
              <button (click)="subsView = null" class="btn btn-ghost btn-sm ml-auto">Đóng</button>
            </div>
            <div class="overflow-x-auto rounded-xl border border-base-200">
              <table class="table table-zebra w-full min-w-[600px]">
                <thead>
                  <tr class="text-xs uppercase text-base-content/50">
                    <th>Học viên</th><th>Thời gian nộp</th><th>Trạng thái</th><th>Điểm tự động</th><th>Điểm cuối</th><th>Ghi chú</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of sv.subs; track s.id) {
                    <tr>
                      <td class="font-semibold text-sm">{{ s.studentName }}</td>
                      <td class="text-sm text-base-content/60">{{ s.submittedAt | date:'dd/MM HH:mm' }}</td>
                      <td>
                        @if (s.status === 'Graded') { <span class="badge badge-success badge-sm text-white">Đã chấm</span> }
                        @else if (s.status === 'Submitted') { <span class="badge badge-warning badge-sm text-white">Chờ chấm</span> }
                        @else { <span class="badge badge-ghost badge-sm">Nháp</span> }
                      </td>
                      <td class="font-bold text-info">{{ s.autoScore }}</td>
                      <td><span [class]="s.status === 'Graded' ? 'font-extrabold text-success' : 'font-extrabold text-base-content/20'">{{ s.finalScore }}</span></td>
                      <td>
                        @if (s.noteSent) { <span class="badge badge-success badge-sm gap-1"><i class="fa-solid fa-check fa-xs"></i> Đã gửi</span> }
                        @else { <span class="text-base-content/30">—</span> }
                      </td>
                      <td class="text-right">
                        <a routerLink="/grading" [queryParams]="{ classId: classId, assignmentId: sv.assignment.id, submission: s.id }"
                          class="btn btn-error btn-xs text-white gap-1">
                          <i class="fa-solid fa-pen-nib"></i> Chấm
                        </a>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (!sv.subs.length) {
              <p class="py-8 text-center text-sm text-base-content/40">Chưa có ai nộp bài này.</p>
            }
          </div>
        </div>
      }

      <!-- ===== SỬA BÀI TẬP ===== -->
      @if (editing; as e) {
        <div class="card bg-base-100 border border-error/30 shadow-md">
          <div class="card-body p-5 gap-4">

            <!-- Header -->
            <div class="flex flex-wrap items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center">
                <i class="fa-solid fa-pencil text-error text-sm"></i>
              </div>
              <div>
                <h2 class="text-base font-extrabold text-base-content">Sửa bài tập</h2>
                <p class="text-xs text-base-content/40">{{ e.questions.length }} câu hỏi</p>
              </div>
              <div class="ml-auto flex gap-2">
                <button (click)="cancelEdit()" class="btn btn-ghost btn-sm">Huỷ</button>
                <button (click)="saveEdit()" [disabled]="savingEdit"
                  class="btn btn-error btn-sm text-white gap-2">
                  <i class="fa-solid fa-floppy-disk"></i>
                  {{ savingEdit ? 'Đang lưu…' : 'Lưu bài tập' }}
                </button>
              </div>
            </div>

            <!-- Thông tin chung -->
            <div class="grid gap-3 sm:grid-cols-2 p-4 rounded-xl bg-base-200/40 border border-base-200">
              <label class="form-control">
                <span class="label-text text-sm font-semibold mb-1">Tiêu đề</span>
                <input [(ngModel)]="e.title" class="input input-sm w-full" />
              </label>
              <label class="form-control">
                <span class="label-text text-sm font-semibold mb-1">Lời dặn</span>
                <input [(ngModel)]="e.description" class="input input-sm w-full" />
              </label>
              <label class="form-control">
                <span class="label-text text-sm font-semibold mb-1">Hạn nộp</span>
                <input type="datetime-local" [(ngModel)]="e.dueAt" class="input input-sm w-full" />
              </label>
              <label class="form-control">
                <span class="label-text text-sm font-semibold mb-1">Hẹn giờ giao (trống = giao ngay)</span>
                <input type="datetime-local" [(ngModel)]="e.publishAt" class="input input-sm w-full" />
              </label>
              <label class="form-control">
                <span class="label-text text-sm font-semibold mb-1">Thời gian làm (phút)</span>
                <input type="number" min="1" [(ngModel)]="e.durationMin" class="input input-sm w-full" />
              </label>
              <label class="form-control">
                <span class="label-text text-sm font-semibold mb-1">Nộp muộn</span>
                <div class="select-wrap">
                  <select [(ngModel)]="e.latePolicy" class="select select-sm w-full">
                    <option value="Penalty">Cho nộp muộn (trừ điểm)</option>
                    <option value="Block">Chặn nộp sau hạn</option>
                  </select>
                </div>
              </label>
              <div class="sm:col-span-2 flex items-center gap-6 pt-1">
                <label class="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" [(ngModel)]="e.showAnswer" class="toggle toggle-sm toggle-error" />
                  Hiện đáp án sau khi chấm
                </label>
                <label class="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" [(ngModel)]="e.shuffle" class="toggle toggle-sm toggle-error" />
                  Đảo thứ tự câu
                </label>
              </div>
            </div>

            <!-- Câu hỏi -->
            <div class="flex items-center gap-2">
              <div class="flex-1 h-px bg-base-200"></div>
              <span class="text-xs font-bold text-base-content/40 uppercase tracking-wider px-2">Câu hỏi</span>
              <div class="flex-1 h-px bg-base-200"></div>
            </div>

            <div class="space-y-3">
              @for (q of e.questions; track $index; let qi = $index) {
                <div class="rounded-xl border border-base-200 p-4 bg-base-50/50">
                  <div class="flex flex-wrap items-center gap-2 mb-3">
                    <span class="grid h-7 w-7 place-items-center rounded-lg bg-error/10 text-sm font-bold text-error">{{ qi + 1 }}</span>
                    <div class="select-wrap select-wrap-xs">
                      <select [(ngModel)]="q.type" (ngModelChange)="onTypeChange(q)" class="select select-xs">
                        <option value="MultipleChoice">Trắc nghiệm</option>
                        <option value="Fill">Điền từ</option>
                        <option value="Order">Sắp xếp câu</option>
                        <option value="Match">Nối từ</option>
                        <option value="Writing">Viết đoạn</option>
                        <option value="Record">Ghi âm</option>
                        <option value="Photo">Nộp ảnh</option>
                      </select>
                    </div>
                    <div class="flex items-center gap-1">
                      <input type="number" step="0.5" min="0.5" [(ngModel)]="q.points"
                        class="input input-xs w-16 text-center" title="Điểm" />
                      <span class="text-xs text-base-content/40">đ</span>
                    </div>
                    <div class="ml-auto flex gap-0.5">
                      <button (click)="moveQ(qi, -1)" [disabled]="qi === 0"
                        class="btn btn-ghost btn-xs btn-square disabled:opacity-20">↑</button>
                      <button (click)="moveQ(qi, 1)" [disabled]="qi === e.questions.length - 1"
                        class="btn btn-ghost btn-xs btn-square disabled:opacity-20">↓</button>
                      <button (click)="delQ(qi)"
                        class="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10">
                        <i class="fa-solid fa-trash fa-xs"></i>
                      </button>
                    </div>
                  </div>

                  <input [(ngModel)]="q.prompt" placeholder="Nội dung câu hỏi…"
                    class="input input-sm w-full mb-3" />

                  @if (q.type === 'MultipleChoice') {
                    <div class="space-y-2">
                      @for (opt of q.options; track $index; let oi = $index) {
                        <div class="flex items-center gap-2">
                          <button (click)="setAns(q, oi)"
                            class="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors"
                            [class]="isAns(q, oi) ? 'border-success bg-success text-white' : 'border-base-300 text-base-content/40 hover:border-success/50'"
                            title="Chọn là đáp án đúng">{{ isAns(q, oi) ? '✓' : ['A','B','C','D'][oi] }}</button>
                          <input [(ngModel)]="q.options[oi]" placeholder="Nội dung lựa chọn…"
                            class="input input-sm grow"
                            [class.input-success]="isAns(q, oi)" />
                          <button (click)="delOpt(q, oi)"
                            class="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error hover:bg-error/10">✕</button>
                        </div>
                      }
                      <button (click)="addOpt(q)" class="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-base-content">
                        <i class="fa-solid fa-plus fa-xs"></i> Thêm lựa chọn
                      </button>
                    </div>
                  } @else if (q.type === 'Writing' || q.type === 'Record' || q.type === 'Photo') {
                    <label class="form-control">
                      <span class="label-text text-xs font-semibold text-base-content/50 mb-1">Gợi ý chấm (hiện cho học viên khi làm bài)</span>
                      <input [(ngModel)]="q.sampleAnswer" class="input input-sm w-full"
                        placeholder="VD: Giới thiệu bản thân bằng 5 câu" />
                    </label>
                  } @else {
                    <label class="form-control">
                      <span class="label-text text-xs font-semibold text-base-content/50 mb-1">
                        Đáp án đúng {{ q.type === 'Order' ? '(thứ tự, VD: 3-1-0-2)' : q.type === 'Match' ? '(cặp nối, VD: 0-0,1-1,2-2)' : '' }}
                      </span>
                      <input [(ngModel)]="q.answer" class="hanzi input input-sm w-full" placeholder="Đáp án…" />
                    </label>
                  }
                </div>
              }
              <button (click)="addQ()" class="btn btn-outline btn-sm gap-2 w-full border-dashed hover:border-error hover:text-error">
                <i class="fa-solid fa-plus fa-xs"></i> Thêm câu hỏi
              </button>
            </div>

            <div class="flex justify-end gap-2 border-t border-base-200 pt-4">
              <button (click)="cancelEdit()" class="btn btn-ghost btn-sm">Huỷ</button>
              <button (click)="saveEdit()" [disabled]="savingEdit"
                class="btn btn-error btn-sm text-white gap-2">
                <i class="fa-solid fa-floppy-disk"></i>
                {{ savingEdit ? 'Đang lưu…' : 'Lưu bài tập' }}
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  imports: [FormsModule, DatePipe, RouterLink]
})
export class AssignmentsComponent implements OnInit {
  classes: ClassRow[] = [];
  items: AssignmentRow[] = [];
  classId = '';
  detail: any = null;
  editing: any = null;
  savingEdit = false;
  subsView: { assignment: AssignmentRow; subs: any[] } | null = null;
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);

  async view(a: AssignmentRow) {
    const res = await this.http.get<any>(`http://localhost:5000/api/assignments/${a.id}`).toPromise();
    if (res?.success) { this.detail = res.data; this.subsView = null; this.editing = null; }
    else this.toast.error(res?.error ?? 'Không tải được đề.');
  }

  isAns(q: any, i: number) { return q.answer === String(i); }
  setAns(q: any, i: number) { q.answer = String(i); }

  ngOnInit() { this.loadClasses(); }

  loadClasses() {
    this.http.get<any>('http://localhost:5000/api/classes').subscribe({
      next: (res) => { if (res.success) this.classes = res.data; }
    });
  }

  load() {
    if (!this.classId) return;
    this.http.get<any>(`http://localhost:5000/api/assignments?classId=${this.classId}`).subscribe({
      next: (res) => { if (res.success) this.items = res.data; }
    });
  }

  async add() {
    if (!this.classId) { this.toast.error('Chọn lớp trước đã.'); return; }
    const r = await this.modal.form({
      title: 'Giao bài tập mới', confirmText: 'Tiếp tục',
      fields: [
        { key: 'title', label: 'Tiêu đề', placeholder: 'VD: Bài tập Bài 1 — 你好' },
        { key: 'description', label: 'Lời dặn', type: 'textarea' },
        { key: 'dueAt', label: 'Hạn nộp (năm-tháng-ngày giờ:phút)', placeholder: '2026-09-10T19:00' },
        { key: 'publishAt', label: 'Hẹn giờ giao (bỏ trống = giao ngay)', placeholder: '2026-09-05T08:00' }
      ]
    });
    if (!r) return;
    const due = r['dueAt'] ? new Date(r['dueAt']).toISOString() : new Date(Date.now() + 3 * 86400000).toISOString();
    const publish = r['publishAt'] ? new Date(r['publishAt']).toISOString() : null;

    const src = await this.modal.form({
      title: 'Nguồn câu hỏi', confirmText: 'Tiếp tục',
      fields: [{
        key: 'src', label: 'Chọn nguồn câu hỏi', type: 'select',
        options: [['sample', '1 câu mẫu (sửa sau)'], ['bank', 'Lấy từ bài tập đã tạo']]
      }]
    });
    if (!src) return;
    let questions: any[];
    if (src['src'] === 'bank') {
      const bankQs = await this.pickFromBank();
      if (!bankQs) return;
      questions = bankQs;
    } else {
      questions = [{ type: 'MultipleChoice', prompt: '你好 nghĩa là gì?', points: 2, options: ['xin chào', 'tạm biệt', 'cảm ơn'], answer: '0' }];
    }
    const firstLesson = await this.pickLessonId();
    this.http.post<any>('http://localhost:5000/api/assignments', {
      title: r['title'], description: r['description'], classId: this.classId,
      lessonId: firstLesson, dueAt: due, publishAt: publish,
      durationMin: 15, maxAttempts: 2,
      latePolicy: 'Penalty', showAnswer: true, shuffle: false,
      questions
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(publish ? `Đã lên lịch giao — học viên sẽ thấy lúc ${r['publishAt']}.` : 'Đã giao bài.');
          this.load();
        } else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  private async pickFromBank(): Promise<any[] | null> {
    const all: [string, string][] = [];
    for (const c of this.classes) {
      const res = await this.http.get<any>(`http://localhost:5000/api/assignments?classId=${c.id}`).toPromise();
      for (const a of res?.data ?? []) all.push([a.id, `${c.name} — ${a.title} (${a.questionCount} câu)`]);
    }
    if (!all.length) { this.toast.error('Chưa có bài tập nào để lấy câu hỏi.'); return null; }
    const pick = await this.modal.form({
      title: 'Ngân hàng câu hỏi', confirmText: 'Dùng câu hỏi này',
      fields: [{ key: 'id', label: 'Chọn bài tập nguồn', type: 'select', options: all }]
    });
    if (!pick) return null;
    const detail = await this.http.get<any>(`http://localhost:5000/api/assignments/${pick['id']}`).toPromise();
    const qs = (detail?.data?.questions ?? []).map((q: any) => ({
      type: q.type, prompt: q.prompt, points: q.points,
      options: q.options ?? [], answer: q.answer ?? '', sampleAnswer: q.sampleAnswer ?? ''
    }));
    if (!qs.length) { this.toast.error('Bài nguồn không có câu hỏi.'); return null; }
    return qs;
  }

  private downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async exportScores(a: AssignmentRow) {
    const res = await this.http.get<any>(`http://localhost:5000/api/assignments/${a.id}/submissions`).toPromise();
    const subs = res?.data ?? [];
    if (!subs.length) { this.toast.error('Chưa có bài nộp nào để xuất.'); return; }
    this.downloadCsv(`diem-${a.title}.csv`.replace(/[\\/:*?"<>|]/g, '_'),
      ['Học viên', 'Trạng thái', 'Thời gian nộp', 'Điểm tự động', 'Điểm cuối', 'Đã gửi ghi chú'],
      subs.map((s: any) => [s.studentName, s.status, s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi-VN') : '', s.autoScore, s.finalScore, s.noteSent ? 'Rồi' : 'Chưa']));
    this.toast.success(`Đã xuất điểm cho ${subs.length} học viên.`);
  }

  private async pickLessonId(): Promise<string> {
    const curs = await this.http.get<any>('http://localhost:5000/api/curriculums').toPromise();
    const first = curs?.data?.items?.[0];
    if (!first) return '';
    const lessons = await this.http.get<any>(`http://localhost:5000/api/lessons?curriculumId=${first.id}`).toPromise();
    return lessons?.data?.[0]?.id ?? '';
  }

  private toLocalInput(iso: string): string {
    if (!iso) return '';
    const dt = new Date(iso);
    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  async edit(a: AssignmentRow) {
    const res = await this.http.get<any>(`http://localhost:5000/api/assignments/${a.id}`).toPromise();
    const d = res?.data;
    if (!d) { this.toast.error('Không tải được bài tập.'); return; }
    this.detail = null;
    this.subsView = null;
    this.editing = JSON.parse(JSON.stringify(d));
    this.editing.dueAt = this.toLocalInput(d.dueAt);
    this.editing.publishAt = this.toLocalInput(d.publishAt ?? '');
  }

  cancelEdit() { this.editing = null; }

  addQ() {
    this.editing.questions.push({ type: 'MultipleChoice', prompt: '', points: 2, options: ['', '', ''], answer: '0', sampleAnswer: '' });
  }

  delQ(i: number) { this.editing.questions.splice(i, 1); }

  moveQ(i: number, dir: -1 | 1) {
    const qs = this.editing.questions;
    const j = i + dir;
    if (j < 0 || j >= qs.length) return;
    [qs[i], qs[j]] = [qs[j], qs[i]];
  }

  onTypeChange(q: any) {
    if (q.type === 'MultipleChoice' && (!q.options || !q.options.length)) q.options = ['', '', ''];
    if (q.type === 'MultipleChoice' && q.answer !== undefined && !q.options?.[Number(q.answer)]) q.answer = '0';
  }

  addOpt(q: any) { q.options = [...(q.options ?? []), '']; }
  delOpt(q: any, oi: number) {
    q.options.splice(oi, 1);
    if (q.answer === String(oi)) q.answer = '0';
    else if (Number(q.answer) > oi) q.answer = String(Number(q.answer) - 1);
  }

  async saveEdit() {
    const e = this.editing;
    if (!e.title?.trim()) { this.toast.error('Cần có tiêu đề.'); return; }
    const questions = (e.questions ?? []).map((q: any) => ({
      type: q.type,
      prompt: q.prompt,
      points: Number(q.points) || 1,
      options: q.type === 'MultipleChoice' ? (q.options ?? []).map((o: string) => o.trim()).filter(Boolean) : null,
      answer: q.answer ?? '',
      sampleAnswer: q.sampleAnswer ?? ''
    }));
    this.savingEdit = true;
    this.http.put<any>(`http://localhost:5000/api/assignments/${e.id}`, {
      title: e.title, description: e.description, classId: e.classId, lessonId: e.lessonId,
      dueAt: e.dueAt ? new Date(e.dueAt).toISOString() : new Date(Date.now() + 3 * 86400000).toISOString(),
      publishAt: e.publishAt ? new Date(e.publishAt).toISOString() : null,
      durationMin: Number(e.durationMin) || 15, maxAttempts: Number(e.maxAttempts) || 1,
      latePolicy: e.latePolicy, showAnswer: e.showAnswer, shuffle: e.shuffle,
      questions
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Đã lưu bài tập.');
          this.editing = null;
          this.load();
        } else this.toast.error(res.error!);
        this.savingEdit = false;
      },
      error: (er) => { this.toast.error(er.error?.error ?? 'Lưu thất bại'); this.savingEdit = false; }
    });
  }

  async viewSubs(a: AssignmentRow) {
    const res = await this.http.get<any>(`http://localhost:5000/api/assignments/${a.id}/submissions`).toPromise();
    this.detail = null;
    this.editing = null;
    this.subsView = { assignment: a, subs: res?.data ?? [] };
  }

  async del(a: AssignmentRow) {
    if (!(await this.modal.confirm(`Xoá bài tập <b>${a.title}</b>?`, 'Xoá', true))) return;
    this.http.delete<any>(`http://localhost:5000/api/assignments/${a.id}`).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã xoá.'); this.load(); } else this.toast.error(res.error!); }
    });
  }
}

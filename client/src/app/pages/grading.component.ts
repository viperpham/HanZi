import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../toast.service';

interface ClassRow { id: string; name: string; }
interface AssignmentRow { id: string; title: string; dueAt: string; questionCount: number; }
interface SubRow { id: string; studentName: string; status: string; autoScore: number; manualScore: number; finalScore: number; noteSent: boolean; }
interface AnswerDetail {
  questionId: string; orderNo: number; questionType: string; prompt: string; points: number;
  options?: string[]; correctAnswer?: string; sampleAnswer?: string;
  answerText?: string; autoScore?: number; teacherComment?: string; knowledgeTag?: string;
}
interface SubDetail {
  id: string; studentName: string; status: string; submittedAt?: string;
  autoScore: number; manualScore: number; finalScore: number;
  answers: AnswerDetail[]; note?: { comment?: string; weakTags?: string[]; todos?: string[] };
}

const TYPE_LABEL: Record<string, string> = {
  MultipleChoice: 'Trắc nghiệm', Fill: 'Điền từ', Order: 'Sắp xếp câu', Match: 'Nối từ',
  Writing: 'Viết đoạn', Record: 'Ghi âm', Photo: 'Nộp ảnh'
};
const isManual = (t: string) => ['Writing', 'Record', 'Photo'].includes(t);

/** Mảng kiến thức suy ra từ dạng câu hỏi — dùng cho "gợi ý phần chưa đạt". */
const TYPE_TAG: Record<string, string> = {
  MultipleChoice: 'Từ vựng', Fill: 'Điền từ', Order: 'Trật tự câu', Match: 'Từ vựng'
};

/** Mẫu nhận xét chèn nhanh vào ô nhận xét chung. */
const TEMPLATES = [
  { label: 'Khen + nhắc', text: 'Em nắm chắc phần từ vựng, nhưng cần luyện thêm phần ngữ pháp.' },
  { label: 'Lỗi lặp lại', text: 'Lỗi này lặp lại ở nhiều câu, em xem kỹ lại mục ngữ pháp nhé.' },
  { label: 'Việc cần làm', text: 'Trước buổi sau em hãy làm lại phần Ôn tập của bài này.' }
];

@Component({
  selector: 'app-grading',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="space-y-6">

      @if (!detail) {
        <!-- ===== DANH SÁCH BÀI NỘP ===== -->
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Chấm bài</h1>
          <p class="text-sm text-base-content/50 mt-0.5">Chọn lớp và bài tập để xem bài làm của học viên</p>
        </div>

        <!-- Filter Bar -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-4">
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                  <i class="fa-solid fa-chalkboard text-error text-sm"></i>
                </div>
                <span class="text-sm font-semibold text-base-content/70 whitespace-nowrap">Lớp học</span>
                <div class="select-wrap">
                  <select [(ngModel)]="classId" (change)="loadAssignments()"
                    class="select select-sm min-w-[180px]">
                    <option value="" disabled>— chọn lớp —</option>
                    @for (c of classes; track c.id) { <option [value]="c.id">{{ c.name }}</option> }
                  </select>
                </div>
              </div>

              <div class="w-px h-8 bg-base-200 hidden sm:block"></div>

              <div class="flex items-center gap-2 min-w-0">
                <div class="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                  <i class="fa-solid fa-clipboard-list text-warning text-sm"></i>
                </div>
                <span class="text-sm font-semibold text-base-content/70 whitespace-nowrap">Bài tập</span>
                <div class="select-wrap">
                  <select [(ngModel)]="assignmentId" (change)="loadSubs()"
                    class="select select-sm min-w-[220px]"
                    [disabled]="!classId">
                    <option value="" disabled>— chọn bài tập —</option>
                    @for (a of assignments; track a.id) { <option [value]="a.id">{{ a.title }}</option> }
                  </select>
                </div>
              </div>

              @if (subs.length) {
                <div class="ml-auto flex items-center gap-3">
                  <div class="flex items-center gap-1.5 text-xs text-base-content/50">
                    <span class="w-2 h-2 rounded-full bg-success inline-block"></span> Đã chấm: {{ gradedCount }}
                  </div>
                  <div class="flex items-center gap-1.5 text-xs text-base-content/50">
                    <span class="w-2 h-2 rounded-full bg-warning inline-block"></span> Chờ chấm: {{ pendingCount }}
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- ===== BẢNG DANH SÁCH BÀI TẬP (chọn lớp xong) ===== -->
        @if (classId && assignments.length && !assignmentId) {
          <div class="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
            <div class="px-4 py-3 border-b border-base-200 flex items-center gap-2">
              <i class="fa-solid fa-clipboard-list text-base-content/40 text-sm"></i>
              <span class="text-sm font-semibold text-base-content/70">Chọn bài tập để xem bài nộp</span>
              <span class="ml-auto text-xs text-base-content/40">{{ assignments.length }} bài tập</span>
            </div>
            <div class="overflow-x-auto">
              <table class="table w-full min-w-[500px]">
                <thead>
                  <tr class="bg-base-200/40">
                    <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3">Bài tập</th>
                    <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3">Hạn nộp</th>
                    <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3 text-center">Số câu</th>
                    <th class="py-3"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-base-200">
                  @for (a of assignments; track a.id) {
                    <tr class="hover:bg-base-50 transition-colors cursor-pointer group"
                        (click)="selectAssignment(a)">
                      <td class="py-3.5">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                            <i class="fa-solid fa-clipboard-list text-warning text-xs"></i>
                          </div>
                          <span class="font-semibold text-sm text-base-content">{{ a.title }}</span>
                        </div>
                      </td>
                      <td class="py-3.5">
                        <div class="flex items-center gap-1.5 text-sm text-base-content/50">
                          <i class="fa-solid fa-clock fa-xs text-base-content/25"></i>
                          {{ a.dueAt | date:'dd/MM/yyyy HH:mm' }}
                        </div>
                      </td>
                      <td class="py-3.5 text-center">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 text-base-content/60">
                          {{ a.questionCount }} câu
                        </span>
                      </td>
                      <td class="py-3.5 text-right">
                        <button class="btn btn-error btn-xs text-white gap-1.5
                                       opacity-0 group-hover:opacity-100 transition-opacity">
                          <i class="fa-solid fa-pen-nib fa-xs"></i> Chấm bài
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        @if (classId && assignments.length && assignmentId) {
          <!-- Breadcrumb bài tập đã chọn -->
          <div class="flex items-center gap-2 text-sm">
            <button (click)="clearAssignment()" class="btn btn-ghost btn-xs gap-1.5 -ml-1 text-base-content/50 hover:text-base-content">
              <i class="fa-solid fa-arrow-left fa-xs"></i> Danh sách bài tập
            </button>
            <span class="text-base-content/25">/</span>
            <span class="font-semibold text-base-content truncate">
              {{ selectedAssignmentTitle }}
            </span>
          </div>
        }

        @if (classId && !assignments.length) {
          <div class="card bg-base-100 border border-dashed border-base-300">
            <div class="card-body py-12 items-center text-center gap-3">
              <div class="w-12 h-12 rounded-xl bg-base-200 flex items-center justify-center">
                <i class="fa-solid fa-clipboard-list text-2xl text-base-content/20"></i>
              </div>
              <p class="text-sm text-base-content/40">Lớp này chưa có bài tập nào</p>
            </div>
          </div>
        }

        <!-- Table bài nộp -->
        @if (assignmentId && subs.length) {
          <div class="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
            <div class="overflow-x-auto">
              <table class="table w-full min-w-[640px]">
                <thead>
                  <tr class="bg-base-200/50">
                    <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3">Học viên</th>
                    <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3">Trạng thái</th>
                    <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3 text-center">Điểm tự động</th>
                    <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3 text-center">Điểm cuối</th>
                    <th class="text-xs font-semibold uppercase tracking-wide text-base-content/50 py-3 text-center">Ghi chú</th>
                    <th class="py-3"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-base-200">
                  @for (s of subs; track s.id) {
                    <tr class="hover:bg-base-50 transition-colors cursor-pointer group" (click)="open(s)">
                      <!-- Học viên -->
                      <td class="py-3.5">
                        <div class="flex items-center gap-3">
                          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-error/20 to-rose-400/20
                                      text-error text-xs font-bold flex items-center justify-center shrink-0 border border-error/15">
                            {{ initials(s.studentName) }}
                          </div>
                          <span class="font-semibold text-sm text-base-content">{{ s.studentName }}</span>
                        </div>
                      </td>

                      <!-- Trạng thái -->
                      <td class="py-3.5">
                        @if (s.status === 'Graded') {
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                                       bg-success/10 text-success border border-success/20">
                            <i class="fa-solid fa-circle-check fa-xs"></i> Đã chấm
                          </span>
                        } @else if (s.status === 'Submitted') {
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                                       bg-warning/10 text-warning border border-warning/20">
                            <i class="fa-solid fa-hourglass-half fa-xs"></i> Chờ chấm
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                                       bg-base-200 text-base-content/50 border border-base-200">
                            <i class="fa-solid fa-ellipsis fa-xs"></i> Chưa nộp
                          </span>
                        }
                      </td>

                      <!-- Điểm tự động -->
                      <td class="py-3.5 text-center">
                        <span class="text-base font-bold text-info">{{ s.autoScore }}</span>
                        <span class="text-xs text-base-content/30">/10</span>
                      </td>

                      <!-- Điểm cuối -->
                      <td class="py-3.5 text-center">
                        @if (s.status === 'Graded') {
                          <span class="text-lg font-extrabold text-success">{{ s.finalScore }}</span>
                          <span class="text-xs text-base-content/30">/10</span>
                        } @else {
                          <span class="text-base font-bold text-base-content/15">—</span>
                        }
                      </td>

                      <!-- Ghi chú -->
                      <td class="py-3.5 text-center">
                        @if (s.noteSent) {
                          <span class="inline-flex items-center gap-1 text-xs font-semibold text-success">
                            <i class="fa-solid fa-check-circle"></i> Đã gửi
                          </span>
                        } @else {
                          <span class="text-base-content/25 text-sm">—</span>
                        }
                      </td>

                      <!-- Action -->
                      <td class="py-3.5 text-right" (click)="$event.stopPropagation()">
                        <button (click)="open(s)" [disabled]="s.status === 'Doing'"
                          class="btn btn-error btn-xs text-white gap-1.5 disabled:opacity-30
                                 opacity-0 group-hover:opacity-100 transition-opacity">
                          <i class="fa-solid fa-pen-nib fa-xs"></i> Chấm bài
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        @if (assignmentId && !subs.length) {
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body py-16 items-center text-center">
              <div class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mb-4">
                <i class="fa-solid fa-inbox text-3xl text-base-content/20"></i>
              </div>
              <p class="text-sm font-semibold text-base-content/40">Chưa có bài nộp nào</p>
            </div>
          </div>
        }

        @if (!assignmentId) {
          <div class="card bg-base-100 border border-dashed border-base-300 shadow-none">
            <div class="card-body py-16 items-center text-center gap-3">
              <div class="w-16 h-16 rounded-2xl bg-error/5 border border-error/15 flex items-center justify-center">
                <i class="fa-solid fa-filter text-2xl text-error/40"></i>
              </div>
              <p class="text-sm text-base-content/40">Chọn lớp và bài tập để bắt đầu chấm</p>
            </div>
          </div>
        }
      }

      @if (detail; as d) {
        <!-- ===== CHI TIẾT BÀI LÀM ===== -->

        <!-- Back + Header -->
        <div class="flex flex-wrap items-center gap-3">
          <button (click)="close()" class="btn btn-ghost btn-sm gap-2 -ml-2">
            <i class="fa-solid fa-arrow-left"></i> Danh sách
          </button>
          <div class="h-5 w-px bg-base-300"></div>
          <button (click)="navStudent(-1)" [disabled]="studentIndex() <= 0"
            class="btn btn-ghost btn-sm btn-square" title="Học viên trước">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <div class="flex items-center gap-3 flex-1 flex-wrap">
            <div class="w-9 h-9 rounded-full bg-gradient-to-br from-error/20 to-rose-400/20
                        text-error text-sm font-bold flex items-center justify-center border border-error/15">
              {{ initials(d.studentName) }}
            </div>
            <h1 class="text-xl font-extrabold text-base-content">{{ d.studentName }}</h1>
            @if (d.status === 'Graded') {
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                           bg-success/10 text-success border border-success/20">
                <i class="fa-solid fa-circle-check fa-xs"></i> Đã chấm
              </span>
            } @else {
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                           bg-warning/10 text-warning border border-warning/20">
                <i class="fa-solid fa-hourglass-half fa-xs"></i> Chờ chấm
              </span>
            }
            @if (d.submittedAt) {
              <span class="text-xs text-base-content/40 ml-auto">
                <i class="fa-solid fa-clock mr-1"></i>Nộp {{ d.submittedAt | date:'dd/MM HH:mm' }}
              </span>
            }
          </div>
          <span class="text-xs font-semibold text-base-content/40">{{ studentIndex() + 1 }}/{{ gradeableCount() }}</span>
          <button (click)="navStudent(1)" [disabled]="studentIndex() >= gradeableCount() - 1"
            class="btn btn-ghost btn-sm btn-square" title="Học viên sau">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <!-- Score Summary -->
        <div class="grid grid-cols-3 gap-4">
          <div class="card bg-info/5 border border-info/20">
            <div class="card-body p-4 items-center text-center">
              <p class="text-xs font-semibold text-info/70 uppercase tracking-wide">Điểm tự động</p>
              <p class="text-4xl font-extrabold text-info mt-1">{{ d.autoScore }}</p>
              <p class="text-xs text-base-content/40">/10</p>
            </div>
          </div>
          <div class="card bg-warning/5 border border-warning/20">
            <div class="card-body p-4 items-center text-center">
              <p class="text-xs font-semibold text-warning/70 uppercase tracking-wide">Điểm chấm tay</p>
              <p class="text-4xl font-extrabold text-warning mt-1">{{ d.manualScore }}</p>
              <p class="text-xs text-base-content/40">/10</p>
            </div>
          </div>
          <div class="card bg-success/5 border border-success/20">
            <div class="card-body p-4 items-center text-center">
              <p class="text-xs font-semibold text-success/70 uppercase tracking-wide">Điểm cuối</p>
              <p class="text-4xl font-extrabold text-success mt-1">{{ d.finalScore }}</p>
              <p class="text-xs text-base-content/40">/10</p>
            </div>
          </div>
        </div>

        <!-- Câu hỏi -->
        <div class="space-y-3">
          @for (a of d.answers; track a.questionId) {
            <div class="card bg-base-100 border shadow-sm"
              [class]="manual(a.questionType) ? 'border-warning/30' : (a.autoScore ?? 0) > 0 ? 'border-success/25' : 'border-base-200'">
              <div class="card-body p-4 gap-3">

                <!-- Header câu -->
                <div class="flex flex-wrap items-center gap-2">
                  <div class="w-7 h-7 rounded-lg text-sm font-extrabold flex items-center justify-center
                    bg-error/10 text-error shrink-0">{{ a.orderNo }}</div>
                  <span class="text-xs px-2 py-0.5 rounded-full font-semibold border
                    bg-base-100 text-base-content/60 border-base-200">{{ typeLabel(a.questionType) }}</span>
                  <span class="text-xs text-base-content/40">{{ a.points }} điểm</span>
                  <div class="ml-auto">
                    @if (manual(a.questionType)) {
                      <span class="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                        <i class="fa-solid fa-pen-nib fa-xs"></i> Chấm tay
                      </span>
                    } @else {
                      <span class="text-sm font-extrabold"
                        [class]="(a.autoScore ?? 0) > 0 ? 'text-success' : 'text-error'">
                        {{ a.autoScore ?? 0 }}<span class="text-xs font-normal text-base-content/30">/{{ a.points }}</span>
                      </span>
                    }
                  </div>
                </div>

                <!-- Câu hỏi -->
                <p class="hanzi font-semibold text-sm text-base-content">{{ a.prompt }}</p>

                <!-- Trắc nghiệm -->
                @if (a.questionType === 'MultipleChoice' && a.options?.length) {
                  <div class="space-y-1.5">
                    @for (opt of a.options; track $index) {
                      <div class="flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-colors"
                        [class]="isCorrect(a, $index) ? 'border-success/40 bg-success/8 font-semibold'
                               : isPicked(a, $index) ? 'border-error/40 bg-error/5' : 'border-base-200'">
                        <span class="w-5 text-center text-xs font-bold text-base-content/40">{{ ['A','B','C','D'][$index] }}</span>
                        <span class="hanzi flex-1">{{ opt }}</span>
                        @if (isCorrect(a, $index)) { <i class="fa-solid fa-check text-success fa-xs ml-auto"></i> }
                        @if (isPicked(a, $index) && !isCorrect(a, $index)) { <i class="fa-solid fa-xmark text-error fa-xs ml-auto"></i> }
                      </div>
                    }
                  </div>
                }

                <!-- Tự luận -->
                @if (manual(a.questionType)) {
                  <div class="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5">
                    <p class="text-xs font-semibold text-warning/80 mb-1.5">Câu trả lời của học viên</p>
                    <p class="hanzi text-sm whitespace-pre-wrap text-base-content">{{ a.answerText || '(bỏ trống)' }}</p>
                    @if (a.sampleAnswer) {
                      <p class="text-xs text-base-content/40 mt-2 pt-2 border-t border-warning/15">
                        <i class="fa-solid fa-lightbulb fa-xs mr-1 text-warning/60"></i>Gợi ý chấm: {{ a.sampleAnswer }}
                      </p>
                    }
                  </div>
                } @else if (a.questionType !== 'MultipleChoice' && a.answerText) {
                  <p class="text-sm">
                    <span class="text-base-content/40">HV trả lời: </span>
                    <span class="hanzi font-semibold">{{ a.answerText }}</span>
                  </p>
                  @if (a.correctAnswer) {
                    <p class="text-sm">
                      <span class="text-base-content/40">Đáp án: </span>
                      <span class="hanzi font-semibold text-success">{{ a.correctAnswer }}</span>
                    </p>
                  }
                }

                <!-- Chấm điểm câu -->
                <div class="pt-2 border-t border-base-200/60">
                  @if (manual(a.questionType)) {
                    <!-- Câu cần chấm tay: hiện cả điểm + nhận xét -->
                    <div class="rounded-lg border-2 border-warning/30 bg-warning/5 p-3 grid gap-2 sm:grid-cols-[150px_1fr]">
                      <label class="form-control">
                        <span class="label-text text-xs font-bold text-warning mb-1.5">
                          <i class="fa-solid fa-pen-nib fa-xs mr-1"></i>Điểm chấm (0–{{ a.points }})
                        </span>
                        <input type="number" step="0.5" [min]="0" [max]="a.points"
                          [(ngModel)]="scores[a.questionId]"
                          class="input input-sm w-full border-warning/50 focus:border-warning" />
                      </label>
                      <label class="form-control">
                        <span class="label-text text-xs font-semibold text-base-content/50 mb-1.5">Nhận xét câu này</span>
                        <input [(ngModel)]="comments[a.questionId]"
                          placeholder="VD: Diễn đạt tốt nhưng thiếu dấu câu"
                          class="input input-sm w-full" />
                      </label>
                    </div>
                  } @else {
                    <!-- Câu tự động: chỉ nhận xét thêm (không cần nhập điểm) -->
                    <label class="form-control">
                      <span class="label-text text-xs font-semibold text-base-content/40 mb-1">
                        Nhận xét thêm (tuỳ chọn)
                      </span>
                      <input [(ngModel)]="comments[a.questionId]"
                        placeholder="VD: Cần ôn lại trật tự từ"
                        class="input input-sm w-full" />
                    </label>
                  }
                </div>

              </div>
            </div>
          }
        </div>

        <!-- Form gửi điểm tổng -->
        <div class="card bg-gradient-to-br from-error/3 to-rose-50/50 border border-error/20 shadow-sm">
          <div class="card-body p-5 gap-4">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center shrink-0">
                <i class="fa-solid fa-paper-plane text-error text-sm"></i>
              </div>
              <h2 class="font-bold text-base-content">Gửi điểm &amp; nhận xét cho học viên</h2>
            </div>

            <!-- Hàng 1: Điểm chấm tay + Phần chưa đạt -->
            <div class="grid gap-3 sm:grid-cols-2 items-start">
              <div class="flex flex-col gap-1">
                <label class="text-sm font-semibold text-base-content">Điểm chấm tay (0–10)</label>
                <input type="number" step="0.5" min="0" max="10"
                  [(ngModel)]="manualScore" class="input input-sm w-full" />
              </div>
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-semibold text-base-content">Phần chưa đạt (cách nhau bằng ;)</label>
                  <button type="button" (click)="suggestWeakTags()"
                    class="btn btn-ghost btn-xs text-warning gap-1">
                    <i class="fa-solid fa-wand-magic-sparkles fa-xs"></i> Gợi ý
                  </button>
                </div>
                <input [(ngModel)]="weakTags" placeholder="Ngữ pháp Bài 1;Phiên âm"
                  class="input input-sm w-full" />
              </div>
            </div>

            <!-- Hàng 2: Nhận xét chung -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-base-content">Nhận xét chung</label>
              <div class="flex flex-wrap gap-1.5 mb-1">
                @for (t of templates; track t.label) {
                  <button type="button" (click)="appendTemplate(t.text)"
                    class="btn btn-ghost btn-xs border border-base-200 gap-1 text-base-content/60">
                    <i class="fa-regular fa-comment-dots fa-xs"></i> {{ t.label }}
                  </button>
                }
              </div>
              <textarea [(ngModel)]="comment" rows="2" class="textarea textarea-bordered w-full text-sm"
                placeholder="VD: Em làm tốt, cần ôn lại trật tự từ."></textarea>
            </div>

            <!-- Hàng 3: Việc cần làm -->
            <div class="flex flex-col gap-1">
              <label class="text-sm font-semibold text-base-content">Việc cần làm trước buổi sau (cách nhau bằng ;)</label>
              <input [(ngModel)]="todos" placeholder="Học lại ngữ pháp Bài 1; Làm lại trò ghép từ"
                class="input input-sm w-full" />
            </div>

            <!-- Actions -->
            <div class="flex flex-wrap justify-end gap-2 pt-1 border-t border-error/10">
              <button type="button" (click)="openBulkApply()"
                class="btn btn-ghost btn-sm gap-2 border border-base-200"
                [disabled]="!comment.trim()">
                <i class="fa-solid fa-users"></i> Áp dụng cho HV cùng lỗi
              </button>
              <button (click)="submitGrade()" [disabled]="saving"
                class="btn btn-error text-white gap-2 px-6">
                <i class="fa-solid fa-paper-plane"></i>
                {{ saving ? 'Đang gửi…' : 'Gửi điểm + ghi chú' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Modal áp dụng ghi chú cho các học viên cùng lỗi -->
        @if (bulkOpen) {
          <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" (click)="bulkOpen = false">
            <div class="bg-base-100 rounded-2xl shadow-xl border border-base-200 w-full max-w-md" (click)="$event.stopPropagation()">
              <div class="p-4 border-b border-base-200 flex items-center gap-2">
                <i class="fa-solid fa-users text-error"></i>
                <h3 class="font-bold">Áp dụng ghi chú cho học viên cùng lỗi</h3>
                <button class="btn btn-ghost btn-xs btn-circle ml-auto" (click)="bulkOpen = false">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div class="p-4 space-y-2 max-h-72 overflow-y-auto">
                @if (bulkCandidates().length) {
                  <div class="alert bg-warning/10 border-warning/20 text-warning text-xs mb-3">
                    <i class="fa-solid fa-circle-info"></i>
                    <span>Ghi chú gửi cho từng em <b>riêng biệt</b> — không ai thấy của ai. Điểm số không bị thay đổi.</span>
                  </div>
                  @for (s of bulkCandidates(); track s.id) {
                    <label class="flex items-center gap-3 rounded-lg border border-base-200 px-3 py-2 cursor-pointer hover:bg-base-50">
                      <input type="checkbox" class="checkbox checkbox-sm checkbox-error"
                        [checked]="bulkSel[s.id]" (change)="bulkSel[s.id] = !bulkSel[s.id]" />
                      <span class="text-sm font-semibold">{{ s.studentName }}</span>
                      <span class="text-xs text-base-content/40 ml-auto">{{ s.autoScore }}/10</span>
                    </label>
                  }
                } @else {
                  <p class="text-sm text-base-content/40 text-center py-6">
                    Không có học viên nào khác đã nộp bài này.
                  </p>
                }
              </div>
              <div class="p-4 border-t border-base-200 flex justify-end gap-2">
                <button class="btn btn-ghost btn-sm" (click)="bulkOpen = false">Huỷ</button>
                <button class="btn btn-error btn-sm text-white gap-1.5"
                  [disabled]="!hasBulkPicked() || bulkSending"
                  (click)="sendBulkNotes()">
                  <i class="fa-solid fa-paper-plane"></i>
                  Gửi cho {{ bulkPickedCount() }} học viên
                </button>
              </div>
            </div>
          </div>
        }

      }
    </div>
  `
})
export class GradingComponent implements OnInit {
  classes: ClassRow[] = [];
  assignments: AssignmentRow[] = [];
  subs: SubRow[] = [];
  classId = '';
  assignmentId = '';

  detail: SubDetail | null = null;
  scores: Record<string, number | null> = {};
  comments: Record<string, string> = {};
  manualScore = 5;
  weakTags = '';
  comment = '';
  todos = '';
  saving = false;

  templates = TEMPLATES;
  bulkOpen = false;
  bulkSel: Record<string, boolean> = {};
  bulkSending = false;

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  get gradedCount() { return this.subs.filter(s => s.status === 'Graded').length; }
  get pendingCount() { return this.subs.filter(s => s.status === 'Submitted').length; }
  get selectedAssignmentTitle() {
    return this.assignments.find(a => a.id === this.assignmentId)?.title ?? '';
  }

  selectAssignment(a: AssignmentRow) {
    this.assignmentId = a.id;
    this.loadSubs();
  }

  clearAssignment() {
    this.assignmentId = '';
    this.subs = [];
  }

  initials(name: string) {
    return name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase() || '?';
  }

  ngOnInit() {
    this.http.get<any>('/api/classes').subscribe({
      next: (res) => {
        if (!res.success) return;
        this.classes = res.data;
        // Deep-link: /grading?classId=..&assignmentId=..&submission=.. → tự chọn và mở bài làm
        const qp = this.route.snapshot.queryParamMap;
        const cid = qp.get('classId');
        if (!cid || !this.classes.some((c) => c.id === cid)) return;
        this.classId = cid;
        this.http.get<any>(`/api/assignments?classId=${cid}`).subscribe({
          next: (r2) => {
            if (!r2.success) return;
            this.assignments = r2.data;
            const aid = qp.get('assignmentId');
            if (!aid || !this.assignments.some((a) => a.id === aid)) return;
            this.assignmentId = aid;
            this.http.get<any>(`/api/assignments/${aid}/submissions`).subscribe({
              next: (r3) => {
                if (!r3.success) return;
                this.subs = r3.data;
                const s = this.subs.find((x) => x.id === qp.get('submission'));
                if (s) this.open(s);
              }
            });
          }
        });
      }
    });
  }

  loadAssignments() {
    this.assignmentId = '';
    this.subs = [];
    this.http.get<any>(`/api/assignments?classId=${this.classId}`).subscribe({
      next: (res) => { if (res.success) this.assignments = res.data; }
    });
  }

  loadSubs() {
    if (!this.assignmentId) return;
    this.http.get<any>(`/api/assignments/${this.assignmentId}/submissions`).subscribe({
      next: (res) => { if (res.success) this.subs = res.data; }
    });
  }

  typeLabel(t: string) { return TYPE_LABEL[t] ?? t; }
  manual(t: string) { return isManual(t); }
  isCorrect(a: AnswerDetail, i: number) { return a.correctAnswer === String(i); }
  isPicked(a: AnswerDetail, i: number) { return a.answerText === String(i); }

  async open(s: SubRow) {
    if (s.status === 'Doing') { this.toast.error('Học viên chưa nộp bài.'); return; }
    const res = await this.http.get<any>(`/api/grading/submissions/${s.id}`).toPromise();
    if (!res?.success) { this.toast.error(res?.error ?? 'Không tải được bài làm.'); return; }
    const d: SubDetail = res.data;
    this.scores = {};
    this.comments = {};
    for (const a of d.answers) {
      if (isManual(a.questionType)) this.scores[a.questionId] = a.autoScore ?? null;
      if (a.teacherComment) this.comments[a.questionId] = a.teacherComment;
    }
    this.manualScore = d.manualScore || 5;
    this.weakTags = (d.note?.weakTags ?? []).join(';');
    this.comment = d.note?.comment ?? '';
    this.todos = (d.note?.todos ?? []).join(';');
    this.detail = d;
  }

  close() { this.detail = null; }

  /** Danh sách bài nộp đã nộp (làm cơ sở điều hướng trước/sau). */
  gradeableSubs() { return this.subs.filter(s => s.status !== 'Doing'); }
  gradeableCount() { return this.gradeableSubs().length; }
  studentIndex() {
    if (!this.detail) return 0;
    return this.gradeableSubs().findIndex(s => s.id === this.detail!.id);
  }

  /** Chuyển tới bài nộp trước/sau (ưu tiên bài còn chờ chấm khi đi tới). */
  navStudent(dir: -1 | 1) {
    const list = this.gradeableSubs();
    const i = this.studentIndex();
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    this.open(list[j]);
  }

  /** Chèn mẫu nhận xét vào cuối ô nhận xét chung. */
  appendTemplate(text: string) {
    this.comment = (this.comment ? this.comment.replace(/\s*$/, ' ') : '') + text;
  }

  /** Gợi ý phần chưa đạt từ các câu tự chấm mà học viên trả lời sai. */
  suggestWeakTags() {
    if (!this.detail) return;
    const tags = new Set<string>();
    for (const a of this.detail.answers) {
      if (isManual(a.questionType)) continue;
      if (a.answerText && (a.autoScore ?? 0) === 0) {
        const tag = (a.knowledgeTag ?? '').trim() || TYPE_TAG[a.questionType];
        if (tag) tags.add(tag);
      }
    }
    if (!tags.size) {
      this.toast.info('Học viên không sai câu tự chấm nào.');
      return;
    }
    const current = this.weakTags.split(';').map(x => x.trim()).filter(Boolean);
    const merged = [...new Set([...current, ...tags])];
    this.weakTags = merged.join(';');
    this.toast.success(`Đã gợi ý ${tags.size} phần chưa đạt dựa trên câu sai.`);
  }

  /** Học viên khác đã nộp cùng bài — ứng viên nhận ghi chú hàng loạt. */
  bulkCandidates() {
    return this.subs.filter(s => s.id !== this.detail?.id && s.status !== 'Doing');
  }

  bulkPickedCount() { return this.bulkCandidates().filter(s => this.bulkSel[s.id]).length; }
  hasBulkPicked() { return this.bulkPickedCount() > 0; }

  openBulkApply() {
    if (!this.detail || !this.comment.trim()) return;
    this.bulkSel = {};
    this.bulkOpen = true;
  }

  /** Gửi ghi chú (không đổi điểm) cho các học viên được chọn. */
  sendBulkNotes() {
    const picked = this.bulkCandidates().filter(s => this.bulkSel[s.id]);
    if (!picked.length) return;
    this.bulkSending = true;
    const payload = {
      weakTags: this.weakTags.split(';').map(x => x.trim()).filter(Boolean),
      comment: this.comment.trim(),
      todos: []
    };
    let done = 0;
    const next = () => {
      if (done >= picked.length) {
        this.toast.success(`Đã gửi ghi chú cho ${picked.length} học viên.`);
        this.bulkOpen = false;
        this.bulkSending = false;
        this.loadSubs();
        return;
      }
      const s = picked[done++];
      this.http.post<any>(`/api/grading/submissions/${s.id}/note`, payload)
        .subscribe({ next: () => next(), error: () => next() });
    };
    next();
  }

  submitGrade() {
    if (!this.detail) return;
    this.saving = true;
    this.http.post<any>(`/api/grading/submissions/${this.detail.id}/grade`, {
      manualScore: Number(this.manualScore) || 0,
      answers: this.detail.answers.map((a) => ({
        questionId: a.questionId,
        autoScore: this.scores[a.questionId] ?? null,
        comment: this.comments[a.questionId] ?? ''
      })),
      weakTags: this.weakTags.split(';').map((x) => x.trim()).filter(Boolean),
      comment: this.comment,
      todos: this.todos.split(';').map((x) => x.trim()).filter(Boolean)
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(`Đã gửi điểm ${res.data.finalScore}/10 cho ${this.detail!.studentName}.`);
          this.close();
          this.loadSubs();
        } else this.toast.error(res.error!);
        this.saving = false;
      },
      error: (e) => { this.toast.error(e.error?.error ?? 'Chấm thất bại'); this.saving = false; }
    });
  }
}

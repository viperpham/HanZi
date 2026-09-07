import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';

interface ClassRow { id: string; name: string; curriculumId?: string; }
interface AssignmentRow { id: string; title: string; dueAt: string; questionCount: number; }
interface SubStats {
  totalStudents: number; submitted: number; late: number;
  notSubmitted: number; pendingGrading: number;
  topWrongQuestions: { orderNo: number; prompt: string; wrongCount: number }[];
}

@Component({
  selector: 'app-assignments',
  standalone: true,
  template: `
    <div class="space-y-4 sm:space-y-6">

      <!-- ===== HEADER ===== -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-base-content tracking-tight">Bài tập</h1>
          <p class="text-xs sm:text-sm text-base-content/50 mt-0.5">Quản lý và giao bài tập theo lớp học</p>
        </div>
        <button (click)="add()" class="btn btn-error btn-sm text-white rounded-xl gap-2 font-bold shadow-md shadow-error/25 hover:shadow-lg transition-all self-start sm:self-auto">
          <i class="fa-solid fa-plus text-xs"></i> Giao bài tập
        </button>
      </div>

      <!-- ===== FILTER BAR ===== -->
      <div class="card bg-base-100 border border-base-200 shadow-sm rounded-2xl p-3 sm:p-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-error/10 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-filter text-error text-xs"></i>
            </div>
            <span class="text-xs sm:text-sm font-bold text-base-content">Lọc theo lớp học</span>
          </div>

          <div class="flex items-center gap-2.5 flex-1 sm:justify-end">
            <select [(ngModel)]="classId" (change)="load()"
              class="select select-bordered select-sm rounded-xl w-full sm:w-72 bg-base-100 text-xs sm:text-sm font-medium">
              <option value="" disabled>— Chọn lớp học cần quản lý —</option>
              @for (c of classes; track c.id) {
                <option [value]="c.id">{{ c.name }}</option>
              }
            </select>
            @if (classId && items.length) {
              <span class="badge badge-sm font-bold bg-error/10 text-error border-error/20 shrink-0">
                {{ items.length }} bài tập
              </span>
            }
          </div>
        </div>
      </div>

      <!-- ===== DANH SÁCH BÀI TẬP ===== -->
      @if (classId && items.length) {
        <!-- Desktop Table -->
        <div class="hidden md:block card bg-base-100 border border-base-200 shadow-sm rounded-2xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="table w-full">
              <thead>
                <tr class="bg-base-200/40 text-[11px] font-bold uppercase tracking-wider text-base-content/60 border-b border-base-200">
                  <th class="py-3.5 pl-6">Bài tập</th>
                  <th class="py-3.5">Hạn nộp</th>
                  <th class="py-3.5 text-center">Số câu</th>
                  <th class="py-3.5 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-base-200">
                @for (a of items; track a.id) {
                  <tr class="hover:bg-base-200/30 transition-colors">
                    <td class="pl-6 py-3.5">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
                          <i class="fa-solid fa-clipboard-list text-sm"></i>
                        </div>
                        <div>
                          <div class="font-bold text-sm text-base-content">{{ a.title }}</div>
                          <div class="text-xs text-base-content/40">Mã: {{ a.id.slice(0, 8) }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="py-3.5">
                      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-base-200/60 text-base-content/70">
                        <i class="fa-regular fa-clock text-base-content/40"></i>
                        {{ a.dueAt | date:'dd/MM/yyyy HH:mm' }}
                      </div>
                    </td>
                    <td class="py-3.5 text-center">
                      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-base-200 text-base-content/70 border border-base-300/60">
                        {{ a.questionCount }} câu
                      </span>
                    </td>
                    <td class="pr-6 py-3.5 text-right">
                      <div class="inline-flex items-center gap-1">
                        <button (click)="view(a)" title="Xem đề bài"
                          class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-info hover:bg-info/10">
                          <i class="fa-solid fa-eye text-xs"></i>
                        </button>
                        <button (click)="viewSubs(a)" title="Xem bài đã nộp"
                          class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-amber-600 hover:bg-amber-500/10">
                          <i class="fa-solid fa-inbox text-xs"></i>
                        </button>
                        <button (click)="exportScores(a)" title="Xuất điểm CSV"
                          class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-success hover:bg-success/10">
                          <i class="fa-solid fa-file-csv text-xs"></i>
                        </button>
                        <button (click)="edit(a)" title="Sửa bài tập"
                          class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-warning hover:bg-warning/10">
                          <i class="fa-solid fa-pencil text-xs"></i>
                        </button>
                        <button (click)="del(a)" title="Xoá bài tập"
                          class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-error hover:bg-error/10">
                          <i class="fa-solid fa-trash text-xs"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Mobile Card List -->
        <div class="md:hidden space-y-3">
          @for (a of items; track a.id) {
            <div class="card bg-base-100 border border-base-200 shadow-sm rounded-2xl p-4 space-y-3">
              <div class="flex items-start justify-between gap-2.5">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-clipboard-list text-sm"></i>
                  </div>
                  <div class="min-w-0">
                    <h3 class="font-bold text-sm text-base-content truncate">{{ a.title }}</h3>
                    <p class="text-xs text-base-content/50 flex items-center gap-1 mt-0.5">
                      <i class="fa-regular fa-clock text-[10px]"></i>
                      Hạn: {{ a.dueAt | date:'dd/MM/yyyy HH:mm' }}
                    </p>
                  </div>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-base-200 text-base-content/70 shrink-0">
                  {{ a.questionCount }} câu
                </span>
              </div>

              <!-- Action Bar Mobile -->
              <div class="flex items-center justify-between gap-2 pt-2 border-t border-base-200">
                <div class="flex items-center gap-2 flex-1">
                  <button (click)="view(a)" class="btn btn-outline btn-xs rounded-xl flex-1 border-base-300 font-bold gap-1 text-base-content hover:bg-base-200">
                    <i class="fa-solid fa-eye text-xs text-info"></i> Xem đề
                  </button>
                  <button (click)="viewSubs(a)" class="btn btn-outline btn-xs rounded-xl flex-1 border-base-300 font-bold gap-1 text-base-content hover:bg-amber-500/10 hover:border-amber-500 hover:text-amber-700">
                    <i class="fa-solid fa-inbox text-xs text-amber-600"></i> Bài nộp
                  </button>
                </div>
                <div class="flex items-center gap-1 shrink-0 border-l border-base-200 pl-2">
                  <button (click)="exportScores(a)" title="Xuất điểm CSV"
                    class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-success">
                    <i class="fa-solid fa-file-csv text-xs"></i>
                  </button>
                  <button (click)="edit(a)" title="Sửa bài tập"
                    class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-warning">
                    <i class="fa-solid fa-pencil text-xs"></i>
                  </button>
                  <button (click)="del(a)" title="Xoá bài tập"
                    class="btn btn-ghost btn-xs btn-square rounded-lg text-error/70 hover:text-error hover:bg-error/10">
                    <i class="fa-solid fa-trash text-xs"></i>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      }

      @if (classId && !items.length) {
        <div class="card bg-base-100 border border-base-200 shadow-sm rounded-2xl py-14 items-center text-center gap-3">
          <div class="w-14 h-14 rounded-2xl bg-base-200/60 flex items-center justify-center">
            <i class="fa-solid fa-clipboard-list text-2xl text-base-content/30"></i>
          </div>
          <div>
            <p class="text-sm font-bold text-base-content/70">Lớp này chưa có bài tập nào</p>
            <p class="text-xs text-base-content/40 mt-1">Giao bài tập để học viên bắt đầu luyện tập</p>
          </div>
          <button (click)="add()" class="btn btn-error btn-sm text-white rounded-xl gap-2 font-bold shadow-md shadow-error/25 mt-1">
            <i class="fa-solid fa-plus text-xs"></i> Giao bài tập ngay
          </button>
        </div>
      }

      @if (!classId) {
        <div class="card bg-base-100 border border-base-200 shadow-sm rounded-2xl py-14 items-center text-center gap-3">
          <div class="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center">
            <i class="fa-solid fa-filter text-2xl text-error"></i>
          </div>
          <div>
            <p class="text-sm font-bold text-base-content/70">Vui lòng chọn lớp học</p>
            <p class="text-xs text-base-content/40 mt-1">Chọn lớp ở bộ lọc bên trên để xem danh sách bài tập đã giao</p>
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
              <button (click)="previewAsStudent()" class="btn btn-outline btn-xs gap-1.5 ml-auto">
                <i class="fa-solid fa-user-graduate fa-xs"></i> Xem thử như học viên
              </button>
              <button (click)="detail = null" class="btn btn-ghost btn-sm gap-2">
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
                    <span class="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">{{ q.orderNo }}</span>
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
              <i class="fa-solid fa-inbox text-warning"></i>
              <h2 class="text-lg font-extrabold text-base-content">Bài đã nộp: {{ sv.assignment.title }}</h2>
              <button (click)="remind(sv.assignment)"
                class="btn btn-outline btn-xs gap-1.5 border-warning text-warning hover:bg-warning hover:text-white ml-auto">
                <i class="fa-solid fa-bell"></i> Nhắc {{ sv.stats?.notSubmitted ?? 0 }} người chưa nộp
              </button>
              <button (click)="subsView = null" class="btn btn-ghost btn-sm">Đóng</button>
            </div>

            <!-- Thống kê tổng hợp -->
            @if (sv.stats; as st) {
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div class="rounded-xl border border-success/25 bg-success/5 px-3 py-2">
                  <p class="text-xs font-semibold text-success/70">Đã nộp</p>
                  <p class="text-xl font-extrabold text-success">{{ st.submitted }}<span class="text-xs text-base-content/30">/{{ st.totalStudents }}</span></p>
                </div>
                <div class="rounded-xl border border-warning/25 bg-warning/5 px-3 py-2">
                  <p class="text-xs font-semibold text-warning/70">Nộp muộn</p>
                  <p class="text-xl font-extrabold text-warning">{{ st.late }}</p>
                </div>
                <div class="rounded-xl border border-error/25 bg-error/5 px-3 py-2">
                  <p class="text-xs font-semibold text-error/70">Chưa nộp</p>
                  <p class="text-xl font-extrabold text-error">{{ st.notSubmitted }}</p>
                </div>
                <div class="rounded-xl border border-info/25 bg-info/5 px-3 py-2">
                  <p class="text-xs font-semibold text-info/70">Chờ chấm</p>
                  <p class="text-xl font-extrabold text-info">{{ st.pendingGrading }}</p>
                </div>
              </div>

              @if (st.topWrongQuestions.length) {
                <div class="alert bg-info/10 border-info/20 text-info text-sm py-2">
                  <i class="fa-solid fa-chart-simple"></i>
                  <span>
                    <b>Câu sai nhiều nhất:</b>
                    @for (w of st.topWrongQuestions; track w.orderNo; let last = $last) {
                      Câu {{ w.orderNo }} — <span class="hanzi">{{ w.prompt }}</span>
                      <b>({{ w.wrongCount }} em sai)</b>{{ last ? '.' : ' · ' }}
                    }
                    Nên nhắc lại ở buổi tới.
                  </span>
                </div>
              }
            }

            <!-- Chip lọc -->
            <div class="flex flex-wrap items-center gap-1.5">
              @for (f of subFilters; track f.key) {
                <button class="btn btn-xs rounded-full gap-1 border"
                  [class]="subFilter === f.key ? 'bg-error text-white border-error' : 'bg-base-100 border-base-200 text-base-content/60 hover:border-error/50'"
                  (click)="subFilter = f.key">
                  {{ f.label }} ({{ subFilterCount(sv, f.key) }})
                </button>
              }
            </div>

            <div class="overflow-x-auto rounded-xl border border-base-200">
              <table class="table table-zebra w-full min-w-[600px]">
                <thead>
                  <tr class="text-xs uppercase text-base-content/50">
                    <th>Học viên</th><th>Thời gian nộp</th><th>Trạng thái</th><th>Điểm tự động</th><th>Điểm cuối</th><th>Ghi chú</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (s of subsFiltered(sv); track s.id) {
                    <tr>
                      <td class="font-semibold text-sm">{{ s.studentName }}</td>
                      <td class="text-sm text-base-content/60">{{ s.submittedAt | date:'dd/MM HH:mm' }}</td>
                      <td>
                        @if (s.status === 'Graded') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/25">
                            <i class="fa-solid fa-circle-check fa-xs"></i> Đã chấm
                          </span>
                        } @else if (s.status === 'Submitted') {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/25">
                            <i class="fa-solid fa-hourglass-half fa-xs"></i> Chờ chấm
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-base-200 text-base-content/50">
                            <i class="fa-solid fa-minus fa-xs"></i> Chưa nộp
                          </span>
                        }
                      </td>
                      <td class="font-bold text-info">{{ s.autoScore }}</td>
                      <td><span [class]="s.status === 'Graded' ? 'font-extrabold text-success' : 'font-extrabold text-base-content/20'">{{ s.finalScore }}</span></td>
                      <td>
                        @if (s.noteSent) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/25">
                            <i class="fa-solid fa-check fa-xs"></i> Đã gửi
                          </span>
                        } @else {
                          <span class="text-base-content/30 text-sm">—</span>
                        }
                      </td>
                      <td class="text-right whitespace-nowrap">
                        @if (s.status === 'Doing') {
                          <button (click)="remind(sv.assignment)"
                            class="btn btn-ghost btn-xs gap-1 text-warning" title="Gửi nhắc nhở">
                            <i class="fa-solid fa-bell fa-xs"></i> Nhắc
                          </button>
                        }
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
            @if (!subsFiltered(sv).length) {
              <p class="py-8 text-center text-sm text-base-content/40">
                {{ subFilter === 'all' ? 'Chưa có ai nộp bài này.' : 'Không có học viên nào ở trạng thái này.' }}
              </p>
            }
          </div>
        </div>
      }

      <!-- ===== XEM THỬ NHƯ HỌC VIÊN ===== -->
      @if (previewOpen && detail; as d) {
        <div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" (click)="previewOpen = false">
          <div class="bg-base-100 rounded-2xl shadow-xl border border-base-200 w-full max-w-2xl max-h-[85vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="p-4 border-b border-base-200 flex items-center gap-2 sticky top-0 bg-base-100">
              <i class="fa-solid fa-user-graduate text-info"></i>
              <h3 class="font-bold">Học viên sẽ thấy — {{ d.title }}</h3>
              <span class="badge badge-ghost badge-sm">ẩn đáp án</span>
              <button class="btn btn-ghost btn-xs btn-circle ml-auto" (click)="previewOpen = false">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div class="p-4 space-y-2.5">
              @for (q of d.questions; track q.id; let i = $index) {
                <div class="rounded-xl border border-base-200 p-4">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="w-6 h-6 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">{{ i + 1 }}</span>
                    <span class="text-xs text-base-content/40">{{ q.points }} điểm</span>
                  </div>
                  <p class="hanzi text-sm font-semibold text-base-content">{{ q.prompt }}</p>
                  @if (q.options?.length) {
                    <div class="mt-2 flex flex-wrap gap-1.5">
                      @for (opt of q.options; track $index) {
                        <span class="hanzi rounded-lg px-2.5 py-1 text-xs border border-base-200 text-base-content/70">
                          {{ ['A','B','C','D'][$index] }}. {{ opt }}
                        </span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ===== SỬA BÀI TẬP ===== -->
      @if (editing; as e) {
        <div class="card bg-base-100 border border-base-200 shadow-xl rounded-2xl overflow-hidden mb-8">
          <!-- Header -->
          <div class="bg-gradient-to-r from-primary/5 via-base-100 to-indigo-500/5 p-5 sm:p-6 border-b border-base-200 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-3.5">
              <div class="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg shadow-sm border border-primary/20">
                <i class="fa-solid fa-pen-to-square"></i>
              </div>
              <div>
                <h2 class="text-base sm:text-lg font-extrabold text-base-content flex items-center gap-2">
                  Chỉnh sửa bài tập
                  <span class="badge badge-primary badge-outline text-xs font-semibold px-2 py-0.5">
                    {{ e.questions.length }} câu hỏi
                  </span>
                </h2>
                <p class="text-xs text-base-content/50">Cập nhật nội dung, hạn nộp và ngân hàng câu hỏi cho lớp</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" (click)="cancelEdit()" class="btn btn-ghost btn-sm rounded-xl">Huỷ</button>
              <button type="button" (click)="saveEdit()" [disabled]="savingEdit"
                class="btn btn-primary btn-sm rounded-xl text-white shadow-md shadow-primary/20 gap-2 px-5 font-semibold">
                <i class="fa-solid fa-floppy-disk"></i>
                {{ savingEdit ? 'Đang lưu…' : 'Lưu bài tập' }}
              </button>
            </div>
          </div>

          <div class="card-body p-5 sm:p-6 gap-6">
            <!-- Thông tin chung -->
            <div class="p-5 sm:p-6 rounded-2xl bg-base-200/30 border border-base-200 space-y-4">
              <div class="flex items-center gap-2 text-sm font-bold text-base-content/80 pb-1 border-b border-base-200/60">
                <i class="fa-solid fa-sliders text-primary"></i>
                <span>Cấu hình thông tin bài tập</span>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="form-control">
                  <span class="label-text text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                    <i class="fa-solid fa-heading text-xs text-base-content/40"></i> Tiêu đề bài tập
                  </span>
                  <input [(ngModel)]="e.title" placeholder="VD: Bài tập chữ Hán Bài 1" class="input input-bordered input-sm rounded-xl focus:border-primary w-full" />
                </label>
                <label class="form-control">
                  <span class="label-text text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                    <i class="fa-solid fa-message text-xs text-base-content/40"></i> Lời dặn / Hướng dẫn
                  </span>
                  <input [(ngModel)]="e.description" placeholder="VD: Làm bài cẩn thận, xem lại từ vựng trước khi nộp..." class="input input-bordered input-sm rounded-xl focus:border-primary w-full" />
                </label>
                <label class="form-control">
                  <span class="label-text text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                    <i class="fa-regular fa-clock text-xs text-base-content/40"></i> Hạn nộp bài
                  </span>
                  <input type="datetime-local" [(ngModel)]="e.dueAt" class="input input-bordered input-sm rounded-xl focus:border-primary w-full" />
                </label>
                <label class="form-control">
                  <span class="label-text text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                    <i class="fa-solid fa-calendar-check text-xs text-base-content/40"></i> Hẹn giờ giao (bỏ trống = giao ngay)
                  </span>
                  <input type="datetime-local" [(ngModel)]="e.publishAt" class="input input-bordered input-sm rounded-xl focus:border-primary w-full" />
                </label>
                <label class="form-control">
                  <span class="label-text text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                    <i class="fa-solid fa-stopwatch text-xs text-base-content/40"></i> Thời gian làm bài (phút)
                  </span>
                  <input type="number" min="1" [(ngModel)]="e.durationMin" placeholder="15" class="input input-bordered input-sm rounded-xl focus:border-primary w-full" />
                </label>
                <label class="form-control">
                  <span class="label-text text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                    <i class="fa-solid fa-shield-halved text-xs text-base-content/40"></i> Chính sách nộp muộn
                  </span>
                  <select [(ngModel)]="e.latePolicy" class="select select-bordered select-sm rounded-xl focus:border-primary w-full">
                    <option value="Penalty">Cho phép nộp muộn (trừ điểm)</option>
                    <option value="Block">Chặn không cho nộp sau hạn</option>
                  </select>
                </label>

                <!-- Tùy chọn hiển thị & đảo đề -->
                <div class="sm:col-span-2 grid sm:grid-cols-2 gap-3 pt-1">
                  <label class="flex cursor-pointer items-center justify-between p-3 rounded-xl bg-base-100 border border-base-200 hover:border-primary/40 transition-all">
                    <span class="text-xs font-bold text-base-content/70 flex items-center gap-2">
                      <i class="fa-regular fa-eye text-primary"></i> Hiện đáp án sau khi chấm
                    </span>
                    <input type="checkbox" [(ngModel)]="e.showAnswer" class="toggle toggle-primary toggle-sm" />
                  </label>
                  <label class="flex cursor-pointer items-center justify-between p-3 rounded-xl bg-base-100 border border-base-200 hover:border-primary/40 transition-all">
                    <span class="text-xs font-bold text-base-content/70 flex items-center gap-2">
                      <i class="fa-solid fa-shuffle text-primary"></i> Đảo thứ tự câu hỏi
                    </span>
                    <input type="checkbox" [(ngModel)]="e.shuffle" class="toggle toggle-primary toggle-sm" />
                  </label>
                </div>

                <!-- Nhận bài từ (loại/khôi phục từng học viên) -->
                <div class="sm:col-span-2 rounded-xl bg-base-100 border border-base-200 p-4 space-y-2.5">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <p class="text-xs font-bold text-base-content/70 flex items-center gap-1.5">
                      <i class="fa-solid fa-user-group text-primary"></i> Học viên nhận bài:
                      <span class="badge badge-sm badge-ghost font-semibold">
                        {{ editStudents.length - excludedIds().length }}/{{ editStudents.length }} học viên
                      </span>
                    </p>
                    <span class="text-[11px] text-base-content/40">Bấm tên để loại trừ hoặc khôi phục</span>
                  </div>
                  @if (editStudents.length) {
                    <div class="flex flex-wrap gap-2">
                      @for (s of editStudents; track s.id) {
                        <button type="button" (click)="toggleExclude(s.id)"
                          class="btn btn-xs rounded-xl gap-1.5 border transition-all font-medium"
                          [class]="isExcluded(s.id)
                            ? 'bg-base-200 border-base-200 text-base-content/30 line-through'
                            : 'bg-primary/10 border-primary/25 text-primary hover:bg-primary/20'">
                          <i class="fa-solid" [class.fa-user-xmark]="isExcluded(s.id)" [class.fa-user-check]="!isExcluded(s.id)"></i>
                          {{ s.fullName }}
                        </button>
                      }
                    </div>
                  } @else {
                    <p class="text-xs text-base-content/30 italic">Đang tải danh sách học viên lớp…</p>
                  }
                </div>
              </div>
            </div>

            <!-- Header danh sách câu hỏi -->
            <div class="flex items-center justify-between pt-2">
              <div class="flex items-center gap-2">
                <i class="fa-solid fa-layer-group text-primary"></i>
                <h3 class="font-bold text-sm uppercase tracking-wider text-base-content/80">Danh sách câu hỏi</h3>
                <span class="badge badge-sm badge-ghost font-mono font-bold">{{ e.questions.length }}</span>
              </div>
              <button type="button" (click)="addQ()" class="btn btn-primary btn-xs rounded-lg gap-1.5 shadow-sm">
                <i class="fa-solid fa-plus fa-xs"></i> Thêm câu hỏi
              </button>
            </div>

            <!-- Danh sách các câu hỏi -->
            <div class="space-y-4">
              @for (q of e.questions; track $index; let qi = $index) {
                <div class="rounded-2xl border border-base-200 bg-base-100 shadow-sm hover:shadow-md transition-all p-4 sm:p-5 relative space-y-3.5">
                  <!-- Header câu hỏi: Căn chuẩn hàng ngang -->
                  <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-base-200">
                    <!-- Bên trái: Số thứ tự, Loại câu hỏi, Điểm -->
                    <div class="flex flex-wrap items-center gap-2.5">
                      <!-- Badge Số thứ tự câu -->
                      <span class="w-8 h-8 rounded-xl bg-primary/10 text-primary font-black text-xs flex items-center justify-center border border-primary/20 shadow-xs">
                        {{ qi + 1 }}
                      </span>

                      <!-- Dropdown chọn dạng câu hỏi -->
                      <select [(ngModel)]="q.type" (ngModelChange)="onTypeChange(q)"
                        class="select select-bordered select-xs rounded-xl font-semibold text-xs focus:border-primary">
                        <option value="MultipleChoice">📝 Trắc nghiệm</option>
                        <option value="Fill">✏️ Điền từ</option>
                        <option value="Order">🔢 Sắp xếp câu</option>
                        <option value="Match">🔗 Nối từ</option>
                        <option value="Writing">📄 Viết đoạn</option>
                        <option value="Record">🎙️ Ghi âm</option>
                        <option value="Photo">📷 Nộp ảnh</option>
                      </select>

                      <!-- Ô nhập điểm số chuẩn Join (không lệch chữ đ) -->
                      <div class="join">
                        <input type="number" step="0.5" min="0.5" [(ngModel)]="q.points"
                          class="join-item input input-bordered input-xs w-16 text-center font-bold focus:border-primary text-xs" title="Điểm cho câu này" />
                        <span class="join-item px-2 bg-base-200 text-[11px] font-semibold flex items-center text-base-content/60 border border-base-300">điểm</span>
                      </div>
                    </div>

                    <!-- Bên phải: Di chuyển lên/xuống & Xóa câu -->
                    <div class="flex items-center gap-1">
                      <button type="button" (click)="moveQ(qi, -1)" [disabled]="qi === 0"
                        class="btn btn-ghost btn-xs btn-square rounded-lg disabled:opacity-20 hover:bg-base-200" title="Di chuyển lên">
                        <i class="fa-solid fa-chevron-up fa-xs"></i>
                      </button>
                      <button type="button" (click)="moveQ(qi, 1)" [disabled]="qi === e.questions.length - 1"
                        class="btn btn-ghost btn-xs btn-square rounded-lg disabled:opacity-20 hover:bg-base-200" title="Di chuyển xuống">
                        <i class="fa-solid fa-chevron-down fa-xs"></i>
                      </button>
                      <div class="w-px h-4 bg-base-200 mx-1"></div>
                      <button type="button" (click)="delQ(qi)"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-error hover:bg-error/10" title="Xoá câu hỏi này">
                        <i class="fa-solid fa-trash-can fa-xs"></i>
                      </button>
                    </div>
                  </div>

                  <!-- Nội dung câu hỏi (Đề bài) dạng Textarea 2 dòng gõ thoải mái -->
                  <div>
                    <label class="block">
                      <span class="text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                        <i class="fa-solid fa-comment-dots text-primary"></i> Đề bài / Nội dung câu hỏi
                      </span>
                      <textarea [(ngModel)]="q.prompt" rows="2"
                        placeholder="Nhập nội dung câu hỏi (VD: Chọn từ thích hợp điền vào chỗ trống: 他是我的____)..."
                        class="hanzi textarea textarea-bordered w-full rounded-xl text-sm font-medium focus:border-primary resize-y"></textarea>
                    </label>
                  </div>

                  <!-- Mảng kiến thức -->
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold text-base-content/50 shrink-0 flex items-center gap-1">
                      <i class="fa-solid fa-tag fa-xs"></i> Mảng kiến thức:
                    </span>
                    <input [(ngModel)]="q.knowledgeTag" placeholder="VD: Từ vựng Bài 1, Ngữ pháp HSK2..."
                      class="input input-bordered input-xs grow rounded-lg focus:border-primary text-xs" />
                  </div>

                  <!-- Khu vực lựa chọn hoặc đáp án tuỳ dạng câu hỏi -->
                  @if (q.type === 'MultipleChoice') {
                    <div class="mt-2 space-y-2.5 rounded-xl bg-base-200/30 p-3.5 border border-base-200">
                      <div class="flex items-center justify-between mb-1">
                        <span class="text-xs font-bold text-base-content/70 flex items-center gap-1.5">
                          <i class="fa-solid fa-list-check text-success"></i> Các phương án lựa chọn:
                        </span>
                        <span class="text-[11px] text-base-content/40">Bấm chữ cái để chọn làm đáp án đúng</span>
                      </div>
                      @for (opt of q.options; track $index; let oi = $index) {
                        <div class="flex items-center gap-2.5 p-1.5 rounded-xl transition-all"
                          [class]="isAns(q, oi) ? 'bg-success/10 border border-success/35' : 'bg-base-100 border border-base-200'">
                          <!-- Nút chọn đáp án đúng A, B, C, D... -->
                          <button type="button" (click)="setAns(q, oi)"
                            class="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
                            [class]="isAns(q, oi) ? 'bg-success text-white shadow-sm ring-2 ring-success/30' : 'bg-base-200 text-base-content/60 hover:bg-success/20 hover:text-success'"
                            title="Đánh dấu phương án này là đáp án đúng">
                            @if (isAns(q, oi)) {
                              <i class="fa-solid fa-check"></i>
                            } @else {
                              {{ ['A','B','C','D','E','F'][oi] }}
                            }
                          </button>
                          <!-- Input nội dung phương án -->
                          <input [(ngModel)]="q.options[oi]"
                            [placeholder]="'Nội dung phương án ' + ['A','B','C','D','E','F'][oi] + '...'"
                            class="hanzi input input-sm grow border-0 bg-transparent focus:ring-0 focus:outline-none text-sm font-medium" />
                          <!-- Nút xoá phương án -->
                          <button type="button" (click)="delOpt(q, oi)"
                            class="btn btn-ghost btn-xs btn-circle text-base-content/30 hover:text-error hover:bg-error/10"
                            title="Xoá phương án này">
                            <i class="fa-solid fa-xmark fa-xs"></i>
                          </button>
                        </div>
                      }
                      <button type="button" (click)="addOpt(q)"
                        class="btn btn-ghost btn-xs rounded-lg gap-1.5 text-primary hover:bg-primary/10 font-semibold mt-1">
                        <i class="fa-solid fa-plus fa-xs"></i> Thêm phương án
                      </button>
                    </div>
                  } @else if (q.type === 'Writing' || q.type === 'Record' || q.type === 'Photo') {
                    <div class="mt-2">
                      <label class="block">
                        <span class="text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                          <i class="fa-solid fa-lightbulb text-warning"></i> Gợi ý chấm / Yêu cầu nộp:
                        </span>
                        <textarea [(ngModel)]="q.sampleAnswer" rows="2"
                          class="textarea textarea-bordered w-full rounded-xl text-sm focus:border-primary resize-y"
                          placeholder="VD: Giới thiệu bản thân bằng ít nhất 5 câu chữ Hán có pinyin..."></textarea>
                      </label>
                    </div>
                  } @else {
                    <div class="mt-2">
                      <label class="block">
                        <span class="text-xs font-bold text-base-content/70 mb-1.5 flex items-center gap-1.5">
                          <i class="fa-solid fa-key text-success"></i> Đáp án đúng {{ q.type === 'Order' ? '(thứ tự các mảnh ghép, VD: 3-1-0-2)' : q.type === 'Match' ? '(các cặp nối, VD: 0-0,1-1,2-2)' : '(từ hoặc cụm từ cần điền)' }}:
                        </span>
                        <input [(ngModel)]="q.answer" class="hanzi input input-bordered input-sm w-full rounded-xl focus:border-primary font-medium"
                          placeholder="Nhập đáp án chuẩn..." />
                      </label>
                    </div>
                  }
                </div>
              }

              <!-- Nút Thêm câu hỏi to dạng Banner -->
              <button type="button" (click)="addQ()"
                class="w-full py-4 rounded-2xl border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 text-primary font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                <i class="fa-solid fa-circle-plus text-base"></i> Thêm câu hỏi mới
              </button>
            </div>

            <!-- Footer hành động -->
            <div class="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-base-200">
              <p class="text-xs text-base-content/50 flex items-center gap-1">
                <i class="fa-solid fa-circle-info text-info"></i> Nhớ bấm <b>Lưu bài tập</b> sau khi hoàn tất chỉnh sửa.
              </p>
              <div class="flex items-center gap-2">
                <button type="button" (click)="cancelEdit()" class="btn btn-ghost btn-sm rounded-xl">Huỷ bỏ</button>
                <button type="button" (click)="saveEdit()" [disabled]="savingEdit"
                  class="btn btn-primary btn-sm rounded-xl text-white shadow-md shadow-primary/20 gap-2 px-5 font-semibold">
                  <i class="fa-solid fa-floppy-disk"></i>
                  {{ savingEdit ? 'Đang lưu…' : 'Lưu bài tập' }}
                </button>
              </div>
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
  subsView: { assignment: AssignmentRow; subs: any[]; stats?: SubStats | null } | null = null;
  subFilter = 'all';
  previewOpen = false;
  editStudents: { id: string; fullName: string }[] = [];
  subFilters = [
    { key: 'all', label: 'Tất cả' },
    { key: 'pend', label: 'Chờ chấm' },
    { key: 'graded', label: 'Đã chấm' },
    { key: 'none', label: 'Chưa nộp' }
  ];
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);

  /** Số học viên theo từng trạng thái cho chip lọc (kèm cả học viên chưa nộp). */
  subFilterCount(sv: { subs: any[]; stats?: SubStats | null }, key: string): number {
    if (key === 'all') return sv.stats?.totalStudents ?? sv.subs.length;
    if (key === 'pend') return sv.stats?.pendingGrading ?? this.rawCount(sv.subs, 'Submitted');
    if (key === 'graded') {
      return sv.stats ? sv.stats.submitted - sv.stats.pendingGrading : this.rawCount(sv.subs, 'Graded');
    }
    return sv.stats?.notSubmitted ?? this.rawCount(sv.subs, 'Doing');
  }

  private rawCount(subs: any[], status: string) {
    return subs.filter(s => s.status === status).length;
  }

  subsFiltered(sv: { subs: any[] }) {
    if (this.subFilter === 'all') return sv.subs;
    if (this.subFilter === 'pend') return sv.subs.filter(s => s.status === 'Submitted');
    if (this.subFilter === 'graded') return sv.subs.filter(s => s.status === 'Graded');
    return sv.subs.filter(s => s.status !== 'Graded' && s.status !== 'Submitted');
  }

  async view(a: AssignmentRow) {
    const res = await this.http.get<any>(`/api/assignments/${a.id}`).toPromise();
    if (res?.success) { this.detail = res.data; this.subsView = null; this.editing = null; }
    else this.toast.error(res?.error ?? 'Không tải được đề.');
  }

  /** Xem thử như học viên — ẩn đáp án đúng. */
  previewAsStudent() { this.previewOpen = true; }

  /** Danh sách id bị loại (từ chuỗi comma-separated của bài tập đang sửa). */
  excludedIds(): string[] {
    const raw = this.editing?.excludedStudentIds ?? '';
    return String(raw).split(',').map(x => x.trim()).filter(Boolean);
  }

  isExcluded(id: string): boolean { return this.excludedIds().includes(id); }

  toggleExclude(id: string) {
    if (!this.editing) return;
    const cur = this.excludedIds();
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    this.editing.excludedStudentIds = next.join(',');
  }

  isAns(q: any, i: number) { return q.answer === String(i); }
  setAns(q: any, i: number) { q.answer = String(i); }

  ngOnInit() { this.loadClasses(); }

  loadClasses() {
    this.http.get<any>('/api/classes').subscribe({
      next: (res) => { if (res.success) this.classes = res.data; }
    });
  }

  load() {
    if (!this.classId) return;
    this.http.get<any>(`/api/assignments?classId=${this.classId}`).subscribe({
      next: (res) => { if (res.success) this.items = res.data; }
    });
  }

  async add() {
    if (!this.classId) {
      this.toast.error('Vui lòng chọn lớp học trước khi giao bài tập.');
      return;
    }

    const defaultDue = new Date(Date.now() + 3 * 86400000);
    const defaultDueStr = new Date(defaultDue.getTime() - defaultDue.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    const r = await this.modal.form({
      title: 'Giao bài tập mới',
      confirmText: 'Tiếp tục',
      fields: [
        { key: 'title', label: 'Tiêu đề bài tập', placeholder: 'Nhập tiêu đề bài tập (VD: Bài tập Bài 1 — 你好)' },
        { key: 'description', label: 'Lời dặn / Hướng dẫn (tuỳ chọn)', type: 'textarea', placeholder: 'Nhập hướng dẫn hoặc lời dặn cho học viên...' },
        { key: 'dueAt', label: 'Hạn nộp bài', type: 'datetime-local', value: defaultDueStr },
        { key: 'publishAt', label: 'Hẹn giờ giao bài (bỏ trống = giao ngay)', type: 'datetime-local' }
      ]
    });
    if (!r) return;
    const due = r['dueAt'] ? new Date(r['dueAt']).toISOString() : new Date(Date.now() + 3 * 86400000).toISOString();
    const publish = r['publishAt'] ? new Date(r['publishAt']).toISOString() : null;

    const src = await this.modal.form({
      title: 'Nguồn câu hỏi', confirmText: 'Tiếp tục',
      fields: [{
        key: 'src', label: 'Chọn nguồn câu hỏi', type: 'select',
        options: [['sample', '1 câu mẫu (sửa sau)'], ['bank', 'Lấy từ bài tập đã tạo'],
                  ['auto', 'Sinh tự động từ từ vựng bài học']]
      }]
    });
    if (!src) return;
    // Chọn bài học gắn với bài tập — dùng cho cả sinh tự động
    const lessonId = await this.pickLessonFromClass();
    if (lessonId === null) return;
    let questions: any[];
    if (src['src'] === 'bank') {
      const bankQs = await this.pickFromBank();
      if (!bankQs) return;
      questions = bankQs;
    } else if (src['src'] === 'auto') {
      const genQs = await this.generateFromVocab(lessonId);
      if (!genQs) return;
      questions = genQs;
    } else {
      questions = [{ type: 'MultipleChoice', prompt: '你好 nghĩa là gì?', points: 2, options: ['xin chào', 'tạm biệt', 'cảm ơn'], answer: '0', knowledgeTag: 'Từ vựng' }];
    }
    this.http.post<any>('/api/assignments', {
      title: r['title'], description: r['description'], classId: this.classId,
      lessonId: lessonId, dueAt: due, publishAt: publish,
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
      const res = await this.http.get<any>(`/api/assignments?classId=${c.id}`).toPromise();
      for (const a of res?.data ?? []) all.push([a.id, `${c.name} — ${a.title} (${a.questionCount} câu)`]);
    }
    if (!all.length) { this.toast.error('Chưa có bài tập nào để lấy câu hỏi.'); return null; }
    const pick = await this.modal.form({
      title: 'Ngân hàng câu hỏi', confirmText: 'Dùng câu hỏi này',
      fields: [{ key: 'id', label: 'Chọn bài tập nguồn', type: 'select', options: all }]
    });
    if (!pick) return null;
    const detail = await this.http.get<any>(`/api/assignments/${pick['id']}`).toPromise();
    const qs = (detail?.data?.questions ?? []).map((q: any) => ({
      type: q.type, prompt: q.prompt, points: q.points,
      options: q.options ?? [], answer: q.answer ?? '', sampleAnswer: q.sampleAnswer ?? ''
    }));
    if (!qs.length) { this.toast.error('Bài nguồn không có câu hỏi.'); return null; }
    return qs;
  }

  /** Sinh 5 câu trắc nghiệm từ từ vựng của bài học — mỗi từ 1 câu, 3 phương án. */
  private async generateFromVocab(lessonId: string): Promise<any[] | null> {
    const detail = await this.http.get<any>(`/api/lessons/${lessonId}`).toPromise();
    const vocab = (detail?.data?.vocabularies ?? []).filter((v: any) => v.hanzi && v.meaningVi);
    if (vocab.length < 3) { this.toast.error('Bài học cần ít nhất 3 từ vựng để sinh câu hỏi.'); return null; }

    const chosen = [...vocab].sort(() => Math.random() - 0.5).slice(0, 5);
    const questions = chosen.map((v: any) => {
      const wrongs = vocab.filter((x: any) => x.id !== v.id).sort(() => Math.random() - 0.5).slice(0, 2);
      const opts = [v.meaningVi, ...wrongs.map((w: any) => w.meaningVi)].sort(() => Math.random() - 0.5);
      return {
        type: 'MultipleChoice',
        prompt: `${v.hanzi} (${v.pinyin}) có nghĩa là gì?`,
        points: 1,
        options: opts,
        answer: String(opts.indexOf(v.meaningVi)),
        knowledgeTag: 'Từ vựng'
      };
    });
    this.toast.success(`Đã sinh ${questions.length} câu trắc nghiệm từ từ vựng.`);
    return questions;
  }

  /** Nhắc các học viên chưa nộp bài — server gửi thông báo cho từng em. */
  async remind(a: AssignmentRow) {
    const res = await this.http.post<any>(`/api/assignments/${a.id}/remind`, {}).toPromise();
    if (res?.success) {
      this.toast.success(res.data > 0
        ? `Đã gửi nhắc nhở tới ${res.data} học viên chưa nộp.`
        : 'Mọi học viên đều đã nộp bài.');
    } else this.toast.error(res?.error ?? 'Gửi nhắc nhở thất bại.');
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
    const res = await this.http.get<any>(`/api/assignments/${a.id}/submissions`).toPromise();
    const subs = res?.data ?? [];
    if (!subs.length) { this.toast.error('Chưa có bài nộp nào để xuất.'); return; }
    this.downloadCsv(`diem-${a.title}.csv`.replace(/[\\/:*?"<>|]/g, '_'),
      ['Học viên', 'Trạng thái', 'Thời gian nộp', 'Điểm tự động', 'Điểm cuối', 'Đã gửi ghi chú'],
      subs.map((s: any) => [s.studentName, s.status, s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi-VN') : '', s.autoScore, s.finalScore, s.noteSent ? 'Rồi' : 'Chưa']));
    this.toast.success(`Đã xuất điểm cho ${subs.length} học viên.`);
  }

  /** Chọn bài học của giáo trình lớp — dùng khi giao bài (thay vì tự lấy bài đầu). */
  private async pickLessonFromClass(): Promise<string | null> {
    const cls = this.classes.find(c => c.id === this.classId);
    if (!cls?.curriculumId) { this.toast.error('Lớp chưa gắn giáo trình.'); return null; }
    const res = await this.http.get<any>(`/api/lessons?curriculumId=${cls.curriculumId}`).toPromise();
    const lessons = res?.data ?? [];
    if (!lessons.length) { this.toast.error('Giáo trình chưa có bài học nào.'); return null; }
    const pick = await this.modal.form({
      title: 'Gắn bài tập với bài học', confirmText: 'Chọn bài',
      fields: [{
        key: 'id', label: 'Bài học', type: 'select',
        options: lessons.map((l: any) => [l.id, `Bài ${l.orderNo} — ${l.titleVi}`])
      }]
    });
    if (!pick) return null;
    return pick['id'];
  }

  private toLocalInput(iso: string): string {
    if (!iso) return '';
    const dt = new Date(iso);
    return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  async edit(a: AssignmentRow) {
    const res = await this.http.get<any>(`/api/assignments/${a.id}`).toPromise();
    const d = res?.data;
    if (!d) { this.toast.error('Không tải được bài tập.'); return; }
    this.detail = null;
    this.subsView = null;
    this.editing = JSON.parse(JSON.stringify(d));
    this.editing.questions = (this.editing.questions ?? []).map((q: any) => ({ ...q, knowledgeTag: q.knowledgeTag ?? '' }));
    this.editing.excludedStudentIds = this.editing.excludedStudentIds ?? '';
    this.editing.dueAt = this.toLocalInput(d.dueAt);
    this.editing.publishAt = this.toLocalInput(d.publishAt ?? '');
    this.loadEditStudents(d.classId);
  }

  private editStudentsClassId = '';
  private async loadEditStudents(classId: string) {
    if (this.editStudentsClassId === classId && this.editStudents.length) return;
    this.editStudentsClassId = classId;
    this.editStudents = [];
    const res = await this.http.get<any>(`/api/classes/${classId}`).toPromise();
    this.editStudents = (res?.data?.students ?? [])
      .filter((s: any) => s.status === 'Approved')
      .map((s: any) => ({ id: s.id, fullName: s.fullName }));
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
      sampleAnswer: q.sampleAnswer ?? '',
      knowledgeTag: (q.knowledgeTag ?? '').toString().trim() || null
    }));
    this.savingEdit = true;
    this.http.put<any>(`/api/assignments/${e.id}`, {
      title: e.title, description: e.description, classId: e.classId, lessonId: e.lessonId,
      dueAt: e.dueAt ? new Date(e.dueAt).toISOString() : new Date(Date.now() + 3 * 86400000).toISOString(),
      publishAt: e.publishAt ? new Date(e.publishAt).toISOString() : null,
      durationMin: Number(e.durationMin) || 15, maxAttempts: Number(e.maxAttempts) || 1,
      latePolicy: e.latePolicy, showAnswer: e.showAnswer, shuffle: e.shuffle,
      excludedStudentIds: (e.excludedStudentIds ?? '') || null,
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
    const res = await this.http.get<any>(`/api/assignments/${a.id}/submissions`).toPromise();
    const statsRes = await this.http.get<any>(`/api/assignments/${a.id}/stats`).toPromise();
    this.detail = null;
    this.editing = null;
    this.subFilter = 'all';
    this.subsView = { assignment: a, subs: res?.data ?? [], stats: statsRes?.success ? statsRes.data : null };
  }

  async del(a: AssignmentRow) {
    if (!(await this.modal.confirm(`Xoá bài tập <b>${a.title}</b>?`, 'Xoá', true))) return;
    this.http.delete<any>(`/api/assignments/${a.id}`).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã xoá.'); this.load(); } else this.toast.error(res.error!); }
    });
  }
}

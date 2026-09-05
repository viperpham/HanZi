import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../toast.service';

interface AnswerDetail {
  questionId: string;
  orderNo: number;
  questionType: string;
  prompt: string;
  points: number;
  options?: string[];
  correctAnswer?: string;
  sampleAnswer?: string;
  answerText?: string;
  autoScore?: number;
  teacherComment?: string;
  knowledgeTag?: string;
}

interface Note {
  weakTags: string[];
  comment?: string;
  todos: string[];
  sentAt?: string;
  reply?: string;
}

interface SubDetail {
  id: string;
  assignmentId?: string;
  title?: string;
  lessonId?: string;
  status: string;
  submittedAt?: string;
  autoScore: number;
  manualScore: number;
  finalScore: number;
  answers: AnswerDetail[];
  note?: Note;
}

@Component({
  selector: 'app-my-results',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="max-w-6xl mx-auto space-y-6 pb-12">

      <!-- ===== HEADER TRANG ===== -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-base-200">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-xs">
            <i class="fa-solid fa-graduation-cap"></i>
          </div>
          <div>
            <h1 class="text-2xl font-black tracking-tight text-base-content">Kết quả học tập</h1>
            <p class="text-sm text-base-content/60 mt-0.5">Chi tiết điểm số và nhận xét của giáo viên</p>
          </div>
        </div>

        @if (subs.length) {
          <div class="flex items-center gap-3 self-start sm:self-auto">
            <!-- Thống kê đã chấm -->
            <div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-base-100 border border-base-200 shadow-xs">
              <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <i class="fa-solid fa-clipboard-check text-sm"></i>
              </div>
              <div>
                <p class="text-base font-extrabold text-base-content leading-tight">{{ gradedCount }}</p>
                <p class="text-[11px] font-medium text-base-content/50 uppercase tracking-wider">Đã chấm</p>
              </div>
            </div>

            <!-- Thống kê điểm trung bình -->
            <div class="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-base-100 border border-base-200 shadow-xs">
              <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <i class="fa-solid fa-star-half-stroke text-sm"></i>
              </div>
              <div>
                <p class="text-base font-extrabold leading-tight" [class]="avgScore >= 8 ? 'text-emerald-600' : avgScore >= 5 ? 'text-amber-600' : 'text-rose-600'">
                  {{ avgScore.toFixed(1) }} <span class="text-xs font-normal text-base-content/40">/10</span>
                </p>
                <p class="text-[11px] font-medium text-base-content/50 uppercase tracking-wider">Điểm TB</p>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- ===== DANH SÁCH BÀI NỘP ===== -->
      @for (s of subs; track s.id) {
        <div class="card bg-base-100 border border-base-200 shadow-xs overflow-hidden transition-all duration-200">

          <!-- Card Header / Summary bar (Click để đóng/mở) -->
          <div (click)="toggle(s)"
            class="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-base-200/40 transition-colors select-none">

            <!-- Bên trái: Icon & Tiêu đề -->
            <div class="flex items-center gap-4 min-w-0">
              <!-- Icon trạng thái bài nộp -->
              @if (s.status === 'Graded') {
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-200/80 shadow-xs">
                  <i class="fa-solid fa-circle-check text-xl"></i>
                </div>
              } @else if (s.status === 'Submitted') {
                <div class="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/80 shadow-xs">
                  <i class="fa-solid fa-clock text-xl"></i>
                </div>
              } @else {
                <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                  <i class="fa-solid fa-file-pen text-xl"></i>
                </div>
              }

              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h2 class="font-bold text-base sm:text-lg text-base-content truncate">
                    {{ s.title || 'Bài tập thực hành' }}
                  </h2>
                </div>

                <div class="flex flex-wrap items-center gap-2 mt-1.5">
                  @if (s.status === 'Graded') {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <i class="fa-solid fa-check fa-xs"></i> Đã chấm điểm
                    </span>
                  } @else if (s.status === 'Submitted') {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <i class="fa-solid fa-hourglass-half fa-xs"></i> Chờ giáo viên chấm
                    </span>
                  } @else {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                      <i class="fa-solid fa-pen-ruler fa-xs"></i> Bản nháp
                    </span>
                  }

                  @if (s.note?.sentAt) {
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <i class="fa-solid fa-comment-dots fa-xs"></i> Có nhận xét GV
                    </span>
                  }

                  @if (s.submittedAt) {
                    <span class="text-xs text-base-content/40 flex items-center gap-1 ml-1">
                      <i class="fa-regular fa-calendar fa-xs"></i>
                      {{ formatTime(s.submittedAt) }}
                    </span>
                  }
                </div>
              </div>
            </div>

            <!-- Bên phải: Điểm số & Nút toggle -->
            <div class="flex items-center gap-4 shrink-0 ml-auto" (click)="$event.stopPropagation()">
              @if (s.status === 'Graded') {
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border"
                  [class]="s.finalScore >= 8 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : s.finalScore >= 5 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-rose-50 border-rose-200 text-rose-700'">
                  <i class="fa-solid fa-award text-sm"></i>
                  <span class="text-lg font-black leading-none">{{ s.finalScore }}</span>
                  <span class="text-xs opacity-60 leading-none">/ 10</span>
                </div>
              } @else {
                <div class="px-3 py-1.5 rounded-xl bg-base-200 text-base-content/50 text-xs font-semibold">
                  Chưa có điểm
                </div>
              }

              <button (click)="toggle(s)"
                class="btn btn-sm btn-outline gap-1.5 rounded-xl font-medium"
                [class.btn-primary]="openId === s.id">
                @if (openId === s.id) {
                  <span>Thu gọn</span>
                  <i class="fa-solid fa-chevron-up fa-xs"></i>
                } @else {
                  <span>Chi tiết</span>
                  <i class="fa-solid fa-chevron-down fa-xs"></i>
                }
              </button>
            </div>
          </div>

          <!-- ===== NỘI DUNG CHI TIẾT MỞ RỘNG ===== -->
          @if (openId === s.id) {
            <div class="p-5 lg:p-6 border-t border-base-200 bg-base-200/20 animate-fadeIn">
              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                <!-- CỘT CHÍNH (8/12): Danh sách câu trả lời & chấm câu -->
                <div class="lg:col-span-7 xl:col-span-8 space-y-4">
                  <div class="flex items-center justify-between pb-2 border-b border-base-200">
                    <h3 class="font-bold text-sm text-base-content/80 uppercase tracking-wider flex items-center gap-2">
                      <i class="fa-solid fa-list-check text-primary"></i>
                      Chi tiết bài làm ({{ s.answers.length }} câu hỏi)
                    </h3>
                  </div>

                  @for (ans of s.answers; track ans.questionId; let i = $index) {
                    <div class="rounded-xl bg-base-100 border p-4 shadow-2xs space-y-3 transition-colors"
                      [class]="ans.autoScore !== null && ans.autoScore !== undefined
                        ? (ans.autoScore > 0 ? 'border-emerald-200' : 'border-rose-200')
                        : 'border-base-200'">

                      <!-- Header câu hỏi: Số câu, mảng kiến thức, điểm -->
                      <div class="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-base-200/60">
                        <div class="flex items-center gap-2">
                          <span class="w-6 h-6 rounded-lg bg-base-200 text-base-content/70 flex items-center justify-center text-xs font-extrabold">
                            {{ i + 1 }}
                          </span>
                          @if (ans.knowledgeTag) {
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-base-200 text-base-content/70">
                              <i class="fa-solid fa-tag fa-xs text-base-content/40"></i>
                              {{ ans.knowledgeTag }}
                            </span>
                          }
                        </div>

                        <!-- Badge chấm điểm câu -->
                        <div>
                          @if (ans.autoScore !== null && ans.autoScore !== undefined) {
                            @if (ans.autoScore > 0) {
                              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <i class="fa-solid fa-circle-check fa-xs"></i> Đúng · +{{ ans.autoScore }}/{{ ans.points }}đ
                              </span>
                            } @else {
                              <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <i class="fa-solid fa-circle-xmark fa-xs"></i> Sai · 0/{{ ans.points }}đ
                              </span>
                            }
                          } @else {
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <i class="fa-solid fa-pen-nib fa-xs"></i> Chấm tay
                            </span>
                          }
                        </div>
                      </div>

                      <!-- Nội dung câu hỏi tiếng Trung -->
                      <p class="hanzi font-semibold text-base text-base-content leading-relaxed">
                        {{ ans.prompt }}
                      </p>

                      <!-- Câu trả lời của học viên -->
                      <div class="rounded-lg bg-base-200/50 p-3 text-sm">
                        <span class="text-xs font-bold text-base-content/50 uppercase tracking-wider block mb-1">
                          Câu trả lời của bạn:
                        </span>
                        <p class="hanzi font-medium text-base-content">
                          {{ ans.answerText || '(Học viên không điền câu trả lời)' }}
                        </p>
                      </div>

                      <!-- Đáp án gợi ý / Đáp án đúng (nếu có) -->
                      @if (ans.correctAnswer || ans.sampleAnswer) {
                        <div class="rounded-lg bg-emerald-50/70 border border-emerald-200/80 p-3 text-sm text-emerald-950">
                          <span class="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <i class="fa-solid fa-lightbulb fa-xs"></i> Đáp án chính xác:
                          </span>
                          <p class="hanzi font-semibold text-emerald-900">
                            {{ ans.correctAnswer || ans.sampleAnswer }}
                          </p>
                        </div>
                      }

                      <!-- Nhận xét của giáo viên cho câu này -->
                      @if (ans.teacherComment) {
                        <div class="rounded-lg bg-blue-50/70 border border-blue-200/80 p-3 text-sm text-blue-950">
                          <span class="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                            <i class="fa-solid fa-comment-dots fa-xs"></i> Nhận xét của giáo viên:
                          </span>
                          <p class="text-blue-900 font-medium">
                            {{ ans.teacherComment }}
                          </p>
                        </div>
                      }

                    </div>
                  }
                </div>

                <!-- CỘT PHỤ (4/12): Điểm số tổng hợp & Ghi chú từ GV -->
                <div class="lg:col-span-5 xl:col-span-4 space-y-4">

                  <!-- Card Tổng kết điểm -->
                  @if (s.status === 'Graded') {
                    <div class="rounded-2xl bg-base-100 border border-base-200 p-5 shadow-xs space-y-4">
                      <h3 class="font-bold text-sm text-base-content/80 uppercase tracking-wider flex items-center gap-2">
                        <i class="fa-solid fa-chart-pie text-primary"></i>
                        Tổng kết điểm số
                      </h3>

                      <!-- 3 Khối điểm số -->
                      <div class="grid grid-cols-3 gap-2 text-center">
                        <div class="rounded-xl bg-blue-50/60 border border-blue-200/60 p-2.5">
                          <p class="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Tự động</p>
                          <p class="text-xl font-black text-blue-800 mt-1">{{ s.autoScore }}</p>
                        </div>
                        <div class="rounded-xl bg-amber-50/60 border border-amber-200/60 p-2.5">
                          <p class="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Chấm tay</p>
                          <p class="text-xl font-black text-amber-800 mt-1">{{ s.manualScore }}</p>
                        </div>
                        <div class="rounded-xl p-2.5 border"
                          [class]="s.finalScore >= 8 ? 'bg-emerald-50/60 border-emerald-200/80 text-emerald-800' : s.finalScore >= 5 ? 'bg-amber-50/60 border-amber-200/80 text-amber-800' : 'bg-rose-50/60 border-rose-200/80 text-rose-800'">
                          <p class="text-[11px] font-bold uppercase tracking-wider opacity-80">Tổng điểm</p>
                          <p class="text-xl font-black mt-1">{{ s.finalScore }}</p>
                        </div>
                      </div>

                      <!-- Điểm theo từng mảng kiến thức -->
                      @if (tagStats(s).length) {
                        <div class="pt-3 border-t border-base-200 space-y-3">
                          <p class="text-xs font-bold text-base-content/60 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fa-solid fa-layer-group fa-xs"></i> Đánh giá theo kỹ năng
                          </p>
                          <div class="space-y-3">
                            @for (t of tagStats(s); track t.tag) {
                              <div class="space-y-1">
                                <div class="flex items-center justify-between text-xs">
                                  <span class="font-semibold text-base-content/80">{{ t.tag }}</span>
                                  <span class="font-bold text-base-content/60">{{ t.got }}/{{ t.max }}đ ({{ t.pct }}%)</span>
                                </div>
                                <div class="w-full bg-base-200 rounded-full h-2 overflow-hidden">
                                  <div class="h-2 rounded-full transition-all duration-300"
                                    [class]="t.pct >= 80 ? 'bg-emerald-500' : t.pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'"
                                    [style.width.%]="t.pct"></div>
                                </div>
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }

                  <!-- Card Ghi chú & Nhận xét của giáo viên -->
                  @if (s.note?.sentAt) {
                    <div class="rounded-2xl bg-base-100 border-2 border-primary/30 p-5 shadow-xs space-y-4">
                      <div class="flex items-center gap-2 pb-2 border-b border-base-200">
                        <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-sm">
                          <i class="fa-solid fa-chalkboard-user"></i>
                        </div>
                        <div>
                          <h3 class="font-bold text-sm text-primary uppercase tracking-wider">
                            Ghi chú từ giáo viên
                          </h3>
                          <p class="text-[11px] text-base-content/50">
                            {{ formatTime(s.note?.sentAt) }}
                          </p>
                        </div>
                      </div>

                      <!-- Phần cần cải thiện (Weak tags) -->
                      @if (s.note!.weakTags.length) {
                        <div class="space-y-2">
                          <span class="text-xs font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                            <i class="fa-solid fa-triangle-exclamation fa-xs"></i> Cần ôn tập & cải thiện:
                          </span>
                          <div class="flex flex-wrap gap-1.5">
                            @for (t of s.note!.weakTags; track t) {
                              <a [routerLink]="s.lessonId ? ['/learn', s.lessonId] : '/results'"
                                [queryParams]="s.lessonId ? { part: weakTagToPart(t) } : null"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-colors"
                                title="Bấm để mở thẳng bài học ôn lại">
                                <i class="fa-solid fa-book-open fa-xs"></i>
                                <span>{{ t }}</span>
                                <i class="fa-solid fa-arrow-up-right-from-square fa-xs ml-0.5 opacity-60"></i>
                              </a>
                            }
                          </div>
                          @if (s.lessonId) {
                            <p class="text-[11px] text-base-content/50 italic">
                              <i class="fa-solid fa-hand-pointer fa-xs mr-1"></i>Bấm vào kỹ năng để mở mục cần học lại trong bài.
                            </p>
                          }
                        </div>
                      }

                      <!-- Nhận xét chung -->
                      @if (s.note!.comment) {
                        <div class="rounded-xl bg-primary/5 border border-primary/15 p-3.5 space-y-1">
                          <span class="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fa-solid fa-quote-left fa-xs"></i> Lời nhận xét:
                          </span>
                          <p class="text-sm font-medium text-base-content/85 leading-relaxed">
                            {{ s.note!.comment }}
                          </p>
                        </div>
                      }

                      <!-- Việc cần làm (Todos) -->
                      @if (s.note!.todos.length) {
                        <div class="space-y-2">
                          <span class="text-xs font-bold text-base-content/60 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="fa-solid fa-list-check fa-xs text-primary"></i> Việc cần làm:
                          </span>
                          <div class="space-y-1.5">
                            @for (t of s.note!.todos; track t) {
                              <div class="flex items-start gap-2 text-xs font-medium text-base-content/80 p-2 rounded-lg bg-base-200/60">
                                <i class="fa-solid fa-circle-check text-primary text-sm mt-0.5 shrink-0"></i>
                                <span class="leading-snug">{{ t }}</span>
                              </div>
                            }
                          </div>
                        </div>
                      }

                      <!-- Khu vực phản hồi -->
                      <div class="pt-3 border-t border-base-200">
                        @if (s.note!.reply) {
                          <div class="rounded-xl bg-base-200/60 p-3 space-y-1">
                            <span class="text-xs font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-1.5">
                              <i class="fa-solid fa-reply fa-xs text-primary"></i> Phản hồi của bạn:
                            </span>
                            <p class="text-xs font-medium text-base-content/80 leading-relaxed">
                              {{ s.note!.reply }}
                            </p>
                          </div>
                        } @else {
                          <div class="space-y-2">
                            <label class="text-xs font-bold text-base-content/60 uppercase tracking-wider block">
                              Gửi phản hồi cho giáo viên:
                            </label>
                            <div class="flex gap-2">
                              <input [(ngModel)]="replies[s.id]"
                                placeholder="Nhắn lại cho giáo viên..."
                                class="input input-sm input-bordered flex-1 text-xs rounded-xl focus:outline-primary" />
                              <button (click)="reply(s)"
                                class="btn btn-primary btn-sm rounded-xl text-white gap-1 font-semibold">
                                <i class="fa-solid fa-paper-plane fa-xs"></i> Gửi
                              </button>
                            </div>
                          </div>
                        }
                      </div>

                    </div>
                  }

                </div>

              </div>
            </div>
          }

        </div>
      }

      <!-- ===== TRẠNG THÁI TRỐNG ===== -->
      @if (!subs.length) {
        <div class="card bg-base-100 border border-dashed border-base-300 rounded-2xl">
          <div class="card-body py-16 items-center text-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-base-200 text-base-content/25 flex items-center justify-center text-3xl">
              <i class="fa-solid fa-graduation-cap"></i>
            </div>
            <div class="space-y-1">
              <h3 class="font-bold text-lg text-base-content/70">Chưa có kết quả học tập nào</h3>
              <p class="text-sm text-base-content/50 max-w-sm">
                Hãy hoàn thành bài tập trong các bài học để xem chi tiết điểm số và nhận xét từ giáo viên tại đây.
              </p>
            </div>
            <a routerLink="/assignments" class="btn btn-primary btn-sm rounded-xl text-white gap-2 mt-2">
              <i class="fa-solid fa-book-open fa-xs"></i> Đến danh sách bài tập
            </a>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .hanzi { font-family: "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  `]
})
export class MyResultsComponent implements OnInit {
  subs: SubDetail[] = [];
  openId = '';
  replies: Record<string, string> = {};
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  get gradedCount() {
    return this.subs.filter(s => s.status === 'Graded').length;
  }

  get avgScore() {
    const graded = this.subs.filter(s => s.status === 'Graded');
    if (!graded.length) return 0;
    return +(graded.reduce((sum, s) => sum + s.finalScore, 0) / graded.length).toFixed(1);
  }

  formatTime(iso?: string) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      });
    } catch {
      return iso;
    }
  }

  /** Gộp điểm theo mảng kiến thức (KnowledgeTag) của từng câu hỏi. */
  tagStats(s: SubDetail) {
    const byTag = new Map<string, { got: number; max: number }>();
    for (const a of s.answers) {
      const tag = (a.knowledgeTag ?? '').trim();
      if (!tag) continue;
      const cur = byTag.get(tag) ?? { got: 0, max: 0 };
      cur.max += a.points;
      cur.got += a.autoScore ?? 0;
      byTag.set(tag, cur);
    }
    return [...byTag.entries()].map(([tag, v]) => ({
      tag,
      got: +v.got.toFixed(1),
      max: +v.max.toFixed(1),
      pct: v.max > 0 ? Math.round((v.got / v.max) * 100) : 0
    }));
  }

  /** Phần bài học cần học lại — suy từ tên mảng kiến thức. */
  weakTagToPart(tag: string): number {
    const t = tag.toLowerCase();
    if (/ôn tập|ghép|sắp xếp/.test(t)) return 3;
    if (/ngữ pháp|trật tự/.test(t)) return 4;
    if (/hội thoại|đọc|phát âm|ghi âm/.test(t)) return 5;
    return 2; // Từ vựng / điền từ / mặc định
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.http.get<any>('/api/submissions/mine').subscribe({
      next: (res) => {
        if (res.success) {
          this.subs = res.data;
          // Tự động mở bài đầu tiên nếu có để học viên xem ngay kết quả
          if (this.subs.length > 0 && !this.openId) {
            this.openId = this.subs[0].id;
          }
        }
      }
    });
  }

  toggle(s: SubDetail) {
    this.openId = this.openId === s.id ? '' : s.id;
  }

  reply(s: SubDetail) {
    const text = this.replies[s.id]?.trim();
    if (!text) return;
    this.http.post<any>(`/api/submissions/${s.id}/reply`, JSON.stringify(text), {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Đã gửi cho giáo viên.');
          this.load();
        } else {
          this.toast.error(res.error!);
        }
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Gửi thất bại')
    });
  }
}

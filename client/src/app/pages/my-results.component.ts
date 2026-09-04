import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast.service';

interface AnswerDetail {
  questionId: string; orderNo: number; questionType: string; prompt: string; points: number;
  options?: string[]; correctAnswer?: string; sampleAnswer?: string;
  answerText?: string; autoScore?: number; teacherComment?: string;
}
interface Note { weakTags: string[]; comment?: string; todos: string[]; sentAt?: string; reply?: string; }
interface SubDetail {
  id: string; title?: string; status: string; autoScore: number; manualScore: number; finalScore: number;
  answers: AnswerDetail[]; note?: Note;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 8) return 'text-success';
  if (score >= 5) return 'text-warning';
  return 'text-error';
};

@Component({
  selector: 'app-my-results',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">

      <!-- ===== HEADER ===== -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Kết quả học tập</h1>
          <p class="text-sm text-base-content/50 mt-0.5">Chi tiết điểm số và nhận xét của giáo viên</p>
        </div>
        @if (subs.length) {
          <div class="flex items-center gap-3">
            <div class="text-center">
              <p class="text-lg font-extrabold text-success">{{ gradedCount }}</p>
              <p class="text-xs text-base-content/40">Đã chấm</p>
            </div>
            <div class="w-px h-8 bg-base-200"></div>
            <div class="text-center">
              <p class="text-lg font-extrabold" [class]="avgScore >= 8 ? 'text-success' : avgScore >= 5 ? 'text-warning' : 'text-error'">
                {{ avgScore.toFixed(1) }}
              </p>
              <p class="text-xs text-base-content/40">Điểm TB</p>
            </div>
          </div>
        }
      </div>

      <!-- ===== DANH SÁCH KẾT QUẢ ===== -->
      @for (s of subs; track s.id) {
        <div class="card bg-base-100 shadow-sm transition-shadow hover:shadow-md"
          [class]="s.status === 'Graded' ? 'border border-base-200' : 'border border-dashed border-base-300'">
          <div class="card-body p-5">

            <!-- Summary row -->
            <div class="flex flex-wrap items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <!-- Status Icon -->
                @if (s.status === 'Graded') {
                  <div class="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center shrink-0 border border-success/20">
                    <i class="fa-solid fa-circle-check text-2xl text-success"></i>
                  </div>
                } @else if (s.status === 'Submitted') {
                  <div class="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center shrink-0 border border-warning/20">
                    <i class="fa-solid fa-hourglass-half text-2xl text-warning"></i>
                  </div>
                } @else {
                  <div class="w-12 h-12 rounded-2xl bg-base-200 flex items-center justify-center shrink-0">
                    <i class="fa-solid fa-file-lines text-2xl text-base-content/30"></i>
                  </div>
                }

                <div>
                  <p class="font-bold text-base text-base-content">{{ s.title ?? 'Bài nộp' }}</p>
                  <div class="flex items-center gap-2 mt-1">
                    @if (s.status === 'Graded') {
                      <span class="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <i class="fa-solid fa-check fa-xs"></i> Đã chấm điểm
                      </span>
                    } @else if (s.status === 'Submitted') {
                      <span class="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                        <i class="fa-solid fa-clock fa-xs"></i> Chờ giáo viên chấm
                      </span>
                    } @else {
                      <span class="text-xs text-base-content/40">Bản nháp</span>
                    }
                    @if (s.note?.sentAt) {
                      <span class="inline-flex items-center gap-1 text-xs font-semibold text-info">
                        <i class="fa-solid fa-comment fa-xs"></i> Có nhận xét GV
                      </span>
                    }
                  </div>
                </div>
              </div>

              <!-- Điểm + Toggle -->
              <div class="flex items-center gap-5">
                @if (s.status === 'Graded') {
                  <!-- Score ring -->
                  <div class="relative flex items-center justify-center">
                    <svg class="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor"
                        class="text-base-200" stroke-width="4"/>
                      <circle cx="24" cy="24" r="20" fill="none"
                        [attr.stroke]="s.finalScore >= 8 ? '#16a34a' : s.finalScore >= 5 ? '#d97706' : '#dc2626'"
                        stroke-width="4" stroke-linecap="round"
                        [attr.stroke-dasharray]="'125.6'"
                        [attr.stroke-dashoffset]="125.6 - (s.finalScore / 10) * 125.6"/>
                    </svg>
                    <div class="absolute text-center">
                      <p class="text-base font-extrabold leading-none" [class]="scoreColor(s.finalScore)">{{ s.finalScore }}</p>
                      <p class="text-[9px] text-base-content/40 leading-none">/10</p>
                    </div>
                  </div>
                } @else {
                  <div class="w-14 h-14 flex items-center justify-center">
                    <span class="text-2xl font-extrabold text-base-content/15">—</span>
                  </div>
                }

                <button (click)="toggle(s)"
                  class="btn btn-sm gap-2"
                  [class]="openId === s.id ? 'btn-error text-white' : 'btn-outline'">
                  @if (openId === s.id) {
                    <i class="fa-solid fa-chevron-up fa-xs"></i> Ẩn
                  } @else {
                    <i class="fa-solid fa-chevron-down fa-xs"></i> Chi tiết
                  }
                </button>
              </div>
            </div>

            <!-- ===== Chi tiết ===== -->
            @if (openId === s.id) {
              <div class="mt-5 pt-5 border-t border-base-200 space-y-4 animate-fadeIn">

                <!-- Score breakdown -->
                @if (s.status === 'Graded') {
                  <div class="grid grid-cols-3 gap-3">
                    <div class="rounded-xl bg-info/5 border border-info/20 p-3 text-center">
                      <p class="text-xs font-semibold text-info/70 uppercase tracking-wide mb-1">Tự động</p>
                      <p class="text-2xl font-extrabold text-info">{{ s.autoScore }}</p>
                    </div>
                    <div class="rounded-xl bg-warning/5 border border-warning/20 p-3 text-center">
                      <p class="text-xs font-semibold text-warning/70 uppercase tracking-wide mb-1">Chấm tay</p>
                      <p class="text-2xl font-extrabold text-warning">{{ s.manualScore }}</p>
                    </div>
                    <div class="rounded-xl p-3 text-center border"
                      [class]="s.finalScore >= 8 ? 'bg-success/5 border-success/20' : s.finalScore >= 5 ? 'bg-warning/5 border-warning/20' : 'bg-error/5 border-error/20'">
                      <p class="text-xs font-semibold uppercase tracking-wide mb-1"
                        [class]="s.finalScore >= 8 ? 'text-success/70' : s.finalScore >= 5 ? 'text-warning/70' : 'text-error/70'">Điểm cuối</p>
                      <p class="text-2xl font-extrabold" [class]="scoreColor(s.finalScore)">{{ s.finalScore }}</p>
                    </div>
                  </div>
                }

                <!-- Từng câu trả lời -->
                @for (ans of s.answers; track ans.questionId; let i = $index) {
                  <div class="rounded-xl border p-4"
                    [class]="ans.autoScore !== null && ans.autoScore !== undefined
                      ? (ans.autoScore > 0 ? 'border-success/25 bg-success/3' : 'border-error/20 bg-error/3')
                      : 'border-warning/25 bg-warning/3'">

                    <div class="flex items-center gap-2 mb-2.5">
                      <!-- Số thứ tự -->
                      <div class="w-6 h-6 rounded-md bg-base-200 flex items-center justify-center text-xs font-bold text-base-content/60 shrink-0">
                        {{ i + 1 }}
                      </div>

                      <!-- Trạng thái câu -->
                      @if (ans.autoScore !== null && ans.autoScore !== undefined) {
                        @if (ans.autoScore > 0) {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                                       bg-success/10 text-success border border-success/20">
                            <i class="fa-solid fa-check fa-xs"></i> Đúng · {{ ans.autoScore }}/{{ ans.points }}đ
                          </span>
                        } @else {
                          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                                       bg-error/10 text-error border border-error/20">
                            <i class="fa-solid fa-xmark fa-xs"></i> Sai · 0/{{ ans.points }}đ
                          </span>
                        }
                      } @else {
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
                                     bg-warning/10 text-warning border border-warning/20">
                          <i class="fa-solid fa-pen-nib fa-xs"></i> Chấm tay
                        </span>
                      }
                    </div>

                    <p class="hanzi font-semibold text-sm text-base-content mb-1.5">{{ ans.prompt }}</p>
                    <p class="hanzi text-sm text-base-content/60">
                      Bạn trả lời: <span class="font-semibold text-base-content">{{ ans.answerText || '(bỏ trống)' }}</span>
                    </p>

                    @if (s.note?.sentAt && (ans.correctAnswer || ans.sampleAnswer)) {
                      <p class="hanzi text-sm text-success mt-1.5 flex items-center gap-1.5">
                        <i class="fa-solid fa-lightbulb fa-xs"></i>
                        Đáp án: {{ ans.correctAnswer || ans.sampleAnswer }}
                      </p>
                    }

                    @if (ans.teacherComment) {
                      <div class="mt-2.5 flex items-start gap-2 rounded-lg bg-info/8 border border-info/20 px-3 py-2">
                        <i class="fa-solid fa-comment text-info fa-sm mt-0.5 shrink-0"></i>
                        <p class="text-sm text-info/90">{{ ans.teacherComment }}</p>
                      </div>
                    }
                  </div>
                }

                <!-- Nhận xét của GV -->
                @if (s.note?.sentAt) {
                  <div class="rounded-xl border-2 border-dashed border-primary/25 bg-primary/4 p-5">
                    <p class="text-xs font-bold uppercase tracking-wider text-primary mb-4 flex items-center gap-2">
                      <i class="fa-solid fa-lock fa-sm"></i> Ghi chú riêng của giáo viên
                    </p>

                    @if (s.note!.weakTags.length) {
                      <div class="flex flex-wrap gap-2 mb-4">
                        <span class="text-xs font-semibold text-base-content/50 self-center">Cần cải thiện:</span>
                        @for (t of s.note!.weakTags; track t) {
                          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
                                       bg-error/10 text-error border border-error/20">
                            <i class="fa-solid fa-circle-xmark fa-xs"></i>{{ t }}
                          </span>
                        }
                      </div>
                    }

                    @if (s.note!.comment) {
                      <div class="rounded-lg bg-base-100 border border-base-200 px-4 py-3 mb-4">
                        <p class="text-xs font-semibold text-base-content/40 mb-1">Nhận xét chung</p>
                        <p class="text-sm text-base-content/80">{{ s.note!.comment }}</p>
                      </div>
                    }

                    @if (s.note!.todos.length) {
                      <div class="mb-4">
                        <p class="text-xs font-semibold text-base-content/40 mb-2">Việc cần làm</p>
                        <ul class="space-y-1.5">
                          @for (t of s.note!.todos; track t) {
                            <li class="flex items-start gap-2 text-sm text-base-content/70">
                              <i class="fa-solid fa-circle-arrow-right text-primary fa-sm mt-0.5 shrink-0"></i>
                              {{ t }}
                            </li>
                          }
                        </ul>
                      </div>
                    }

                    <!-- Reply -->
                    @if (s.note!.reply) {
                      <div class="flex items-start gap-2.5 rounded-lg bg-base-100 border border-base-200 px-4 py-3">
                        <i class="fa-solid fa-reply text-base-content/30 mt-0.5 shrink-0"></i>
                        <div>
                          <p class="text-xs font-semibold text-base-content/40 mb-1">Phản hồi của bạn</p>
                          <p class="text-sm text-base-content/70">{{ s.note!.reply }}</p>
                        </div>
                      </div>
                    } @else {
                      <div class="flex gap-2 pt-4 border-t border-primary/15 mt-4">
                        <label class="input input-sm flex-1 flex items-center gap-2">
                          <i class="fa-solid fa-pen text-base-content/25 fa-xs"></i>
                          <input [(ngModel)]="replies[s.id]"
                            placeholder="Nhắn lại cho giáo viên…" class="grow text-sm" />
                        </label>
                        <button (click)="reply(s)" class="btn btn-info btn-sm text-white gap-2">
                          <i class="fa-solid fa-paper-plane fa-xs"></i> Gửi
                        </button>
                      </div>
                    }
                  </div>
                }

              </div>
            }
          </div>
        </div>
      }

      <!-- Empty state -->
      @if (!subs.length) {
        <div class="card bg-base-100 border border-dashed border-base-300">
          <div class="card-body py-20 items-center text-center gap-4">
            <div class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center">
              <i class="fa-solid fa-star text-3xl text-base-content/15"></i>
            </div>
            <div>
              <p class="font-semibold text-base-content/40">Chưa có kết quả nào</p>
              <p class="text-sm text-base-content/30 mt-1">Hoàn thành bài tập để xem kết quả</p>
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    .hanzi { font-family: "Noto Sans SC", sans-serif; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
    .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
  `]
})
export class MyResultsComponent implements OnInit {
  subs: SubDetail[] = [];
  openId = '';
  replies: Record<string, string> = {};
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  get gradedCount() { return this.subs.filter(s => s.status === 'Graded').length; }
  get avgScore() {
    const graded = this.subs.filter(s => s.status === 'Graded');
    if (!graded.length) return 0;
    return +(graded.reduce((sum, s) => sum + s.finalScore, 0) / graded.length).toFixed(1);
  }

  scoreColor(score: number) { return SCORE_COLOR(score); }

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('http://localhost:5000/api/submissions/mine').subscribe({
      next: (res) => { if (res.success) this.subs = res.data; }
    });
  }

  toggle(s: SubDetail) { this.openId = this.openId === s.id ? '' : s.id; }

  reply(s: SubDetail) {
    const text = this.replies[s.id]?.trim();
    if (!text) return;
    this.http.post<any>(`http://localhost:5000/api/submissions/${s.id}/reply`, JSON.stringify(text), {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã gửi cho giáo viên.'); this.load(); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Gửi thất bại')
    });
  }
}

import { Component, OnDestroy, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../toast.service';

interface Question { id: string; orderNo: number; type: string; prompt: string; points: number; options?: string[]; sampleAnswer?: string; }
interface AssignmentDetail { id: string; title: string; description?: string; dueAt: string; durationMin: number; questions: Question[]; }

@Component({
  selector: 'app-do-assignment',
  standalone: true,
  template: `
    @if (a; as x) {
      <div class="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div class="space-y-5">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-900">{{ x.title }}</h1>
            <p class="mt-1 text-sm text-slate-500">{{ x.description }} · Hạn: {{ x.dueAt | date:'dd/MM HH:mm' }}</p>
          </div>

          @for (q of x.questions; track q.id; let i = $index) {
            <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm scroll-mt-24" [id]="'q-' + i">
              <div class="mb-2 flex items-center gap-2">
                <span class="grid h-7 w-7 place-items-center rounded-lg text-sm font-bold"
                  [class]="isAnswered(q) ? 'bg-success/15 text-success' : 'bg-red-50 text-red-700'">{{ i + 1 }}</span>
                <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-500">{{ typeLabel(q.type) }}</span>
                <span class="text-xs font-semibold text-slate-400">{{ q.points }} điểm</span>
              </div>
              <p class="hanzi mb-3 font-semibold text-slate-800">{{ q.prompt }}</p>

              @if (q.type === 'MultipleChoice') {
                <div class="space-y-2">
                  @for (opt of q.options; track $index; let oi = $index) {
                    <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4 py-2.5 hover:bg-slate-50">
                      <input type="radio" [name]="q.id" [value]="oi" [(ngModel)]="answers[q.id]" class="h-4 w-4 accent-red-600"/>
                      <span class="hanzi font-semibold">{{ opt }}</span>
                    </label>
                  }
                </div>
              } @else if (q.type === 'Writing' || q.type === 'Record' || q.type === 'Photo') {
                @if (q.sampleAnswer) {
                  <p class="mb-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Gợi ý: {{ q.sampleAnswer }}</p>
                }
                <textarea [(ngModel)]="answers[q.id]" rows="4" [placeholder]="placeholderFor(q.type)"
                  class="hanzi textarea textarea-bordered w-full"></textarea>
              } @else {
                <input [(ngModel)]="answers[q.id]" [placeholder]="placeholderFor(q.type)"
                  class="hanzi input w-full"/>
              }
            </div>
          }
        </div>

        <aside class="space-y-4 lg:sticky lg:top-20 lg:self-start">
          @if (timeLeft !== null) {
            <div class="card border p-5 text-center shadow-sm"
              [class]="timeLeft <= 60 ? 'border-error bg-error/5' : 'bg-base-100 border-base-200'">
              <p class="text-xs font-bold uppercase tracking-wide text-base-content/50">
                <i class="fa-regular fa-clock mr-1"></i>Thời gian còn lại
              </p>
              <p class="text-3xl font-extrabold mt-1" [class.text-error]="timeLeft <= 60">{{ timeText() }}</p>
            </div>
          }
          <div class="card bg-base-100 border border-base-200 p-5 text-center shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wide text-base-content/50">Tiến độ</p>
            <p class="text-3xl font-extrabold text-success mt-1">{{ answered() }}/{{ x.questions.length }}</p>
            <p class="mt-1 text-xs text-base-content/40">
              <i class="fa-solid fa-floppy-disk mr-1"></i>Tự lưu nháp mỗi 30 giây
            </p>
            @if (draftSavedAt) {
              <p class="text-xs text-success mt-1">Đã lưu {{ draftSavedAt | date:'HH:mm:ss' }}</p>
            }
          </div>
          <!-- Bảng câu hỏi — bấm nhảy tới câu, xanh = đã làm -->
          <div class="card bg-base-100 border border-base-200 p-4 shadow-sm">
            <p class="text-xs font-bold uppercase tracking-wide text-base-content/50 mb-2">
              <i class="fa-solid fa-table-list mr-1"></i>Bảng câu hỏi
            </p>
            <div class="flex flex-wrap gap-1.5">
              @for (q of x.questions; track q.id; let i = $index) {
                <button (click)="jumpTo(i)"
                  class="h-8 w-8 rounded-lg text-xs font-bold border transition-colors"
                  [class]="isAnswered(q)
                    ? 'bg-success text-white border-success'
                    : 'bg-base-100 text-base-content/50 border-base-200 hover:border-error/50'"
                  [title]="typeLabel(q.type)">{{ i + 1 }}</button>
              }
            </div>
            <div class="mt-2 flex items-center gap-3 text-[10px] text-base-content/40">
              <span class="flex items-center gap-1"><span class="h-2 w-2 rounded bg-success inline-block"></span>Đã làm</span>
              <span class="flex items-center gap-1"><span class="h-2 w-2 rounded bg-base-200 inline-block"></span>Chưa làm</span>
            </div>
          </div>
          <button (click)="submit()" [disabled]="submitting"
            class="btn btn-error text-white w-full gap-2 disabled:opacity-50">
            @if (submitting) {
              <i class="fa-solid fa-spinner fa-spin"></i> Đang nộp…
            } @else {
              <i class="fa-solid fa-paper-plane"></i> Nộp bài
            }
          </button>
          <p class="text-center text-xs text-base-content/40">Câu nào bỏ trống sẽ tính 0 điểm.</p>
        </aside>
      </div>
    }`,
  imports: [FormsModule, DatePipe],
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`]
})
export class DoAssignmentComponent implements OnInit, OnDestroy {
  a: AssignmentDetail | null = null;
  answers: Record<string, string> = {};
  submitting = false;
  assignmentId = '';
  timeLeft: number | null = null;
  draftSavedAt: Date | null = null;
  private draftTimer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toast = inject(ToastService);

  ngOnInit() {
    this.assignmentId = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<any>(`http://localhost:5000/api/assignments/${this.assignmentId}`).subscribe({
      next: (res) => {
        if (!res.success) return;
        this.a = res.data;
        this.timeLeft = (res.data.durationMin ?? 15) * 60;
        this.clockTimer = setInterval(() => this.tick(), 1000);
        this.restoreDraft();
      }
    });
    // tự lưu nháp định kỳ — mất mạng không mất bài
    this.draftTimer = setInterval(() => this.saveDraft(), 30000);
  }

  ngOnDestroy() {
    if (this.draftTimer) clearInterval(this.draftTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
  }

  timeText(): string {
    const t = this.timeLeft ?? 0;
    return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  }

  private tick() {
    if (this.timeLeft === null) return;
    this.timeLeft--;
    if (this.timeLeft <= 0) {
      if (this.clockTimer) clearInterval(this.clockTimer);
      if (this.answered() > 0 && !this.submitting) {
        this.toast.error('Hết giờ! Tự động nộp bài.');
        this.submit();
      } else {
        this.toast.error('Đã hết giờ làm bài.');
      }
      this.timeLeft = 0;
    }
  }

  private restoreDraft() {
    this.http.get<any>('http://localhost:5000/api/submissions/mine').subscribe({
      next: (res) => {
        if (!res.success) return;
        const draft = (res.data ?? []).find((s: any) => s.assignmentId === this.assignmentId && s.status === 'Doing');
        if (!draft) return;
        let restored = 0;
        for (const ans of draft.answers ?? []) {
          if (ans.answerText) { this.answers[ans.questionId] = ans.answerText; restored++; }
        }
        if (restored > 0) {
          this.toast.info(`Đã khôi phục nháp với ${restored} câu trả lời.`);
        }
      }
    });
  }

  private saveDraft() {
    if (!this.a || this.submitting || this.answered() === 0) return;
    this.http.post<any>(`http://localhost:5000/api/submissions/assignments/${this.assignmentId}/draft`, {
      answers: this.a.questions.map((q) => ({ questionId: q.id, answerText: this.answers[q.id] ?? null }))
    }).subscribe({
      next: (res) => { if (res.success) this.draftSavedAt = new Date(); }
    });
  }

  typeLabel(t: string) {
    return ({ MultipleChoice: 'Trắc nghiệm', Fill: 'Điền từ', Order: 'Sắp xếp câu', Match: 'Nối từ', Writing: 'Viết đoạn', Record: 'Ghi âm', Photo: 'Nộp ảnh' } as any)[t] ?? t;
  }
  placeholderFor(t: string) {
    if (t === 'Fill') return 'Điền chữ Hán… VD: 是';
    if (t === 'Order') return 'Thứ tự, VD: 3-1-0-2';
    if (t === 'Match') return 'Cặp nối, VD: 0-0,1-1,2-2';
    if (t === 'Writing') return 'Viết đoạn văn (có thể viết bằng chữ Hán hoặc chú thích pinyin)…';
    if (t === 'Record') return 'Mô tả nội dung bài ghi âm của bạn (bản ghi âm nộp trực tiếp trên lớp)…';
    if (t === 'Photo') return 'Mô tả nội dung ảnh bài làm của bạn (ảnh nộp trực tiếp trên lớp)…';
    return 'Nhập câu trả lời…';
  }

  answered() { return Object.values(this.answers).filter((v) => v && v.trim()).length; }

  isAnswered(q: Question): boolean {
    const v = this.answers[q.id];
    return !!v && !!v.trim();
  }

  /** Nhảy tới câu hỏi tương ứng. */
  jumpTo(i: number) {
    document.getElementById('q-' + i)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  submit() {
    if (!this.a) return;
    const missing = this.a.questions.length - this.answered();
    if (missing > 0 && !confirm(`Bạn còn ${missing} câu chưa làm. Nộp bài luôn?`)) return;
    this.submitting = true;
    this.http.post<any>(`http://localhost:5000/api/submissions/assignments/${this.assignmentId}/submit`, {
      answers: this.a.questions.map((q) => ({ questionId: q.id, answerText: this.answers[q.id] ?? null }))
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(`Đã nộp bài! Điểm tự động: ${res.data.autoScore}/10`);
          this.router.navigate(['/results']);
        } else { this.toast.error(res.error!); this.submitting = false; }
      },
      error: (e) => { this.toast.error(e.error?.error ?? 'Nộp bài thất bại'); this.submitting = false; }
    });
  }
}

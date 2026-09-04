import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { ToastService } from '../toast.service';
import { TtsService } from '../tts.service';

interface Vocab { id: string; orderNo: number; hanzi: string; pinyin: string; hanviet?: string; meaningVi: string; emoji?: string; exampleZh?: string; examplePinyin?: string; exampleVi?: string; audioUrl?: string; inWarmup: boolean; }
interface Drill { id: string; orderNo: number; question: string; options: string[]; answerIndex: number; }
interface Grammar { id: string; orderNo: number; title: string; formula?: string; explanation?: string; examples: any[]; mistakes: any[]; drills: Drill[]; }
interface Dialogue { id: string; orderNo: number; speaker: string; zh: string; pinyin?: string; vi: string; audioUrl?: string; }
interface Puzzle { id: string; orderNo: number; sentence: string; pinyin?: string; meaningVi: string; }
interface LessonFull { id: string; titleVi: string; titleZh: string; description?: string; vocabularies: Vocab[]; grammarPoints: Grammar[]; dialogueLines: Dialogue[]; sentencePuzzles: Puzzle[]; }

const PART_NAMES = ['Khởi động', 'Từ mới', 'Ôn tập từ mới', 'Ngữ pháp', 'Hội thoại'];

@Component({
  selector: 'app-student-lesson',
  standalone: true,
  template: `
    @if (lesson; as l) {
      <div class="space-y-5">
        <div>
          <h1 class="hanzi text-2xl font-extrabold text-base-content">{{ l.titleZh }} &middot; {{ l.titleVi }}</h1>
          <p class="text-sm text-base-content/50 mt-0.5">{{ l.description }}</p>
        </div>

        <div class="sticky top-14 z-30 flex gap-1 overflow-x-auto rounded-2xl border border-base-200 bg-base-100 p-1.5 shadow-sm">
          @for (name of partNames; track $index; let i = $index) {
            <button (click)="go(i)" class="whitespace-nowrap btn btn-sm gap-2"
              [class.btn-error]="part === i"
              [class.text-white]="part === i"
              [class.btn-ghost]="part !== i">
              <span>{{ i + 1 }}. {{ name }}</span>
            </button>
          }
        </div>

        <!-- PHẦN 1: KHỞI ĐỘNG — thẻ lật -->
        @if (part === 0) {
          <div class="flex flex-wrap items-center gap-3">
            <div class="alert alert-info py-2.5 text-sm grow">
              <i class="fa-solid fa-clone shrink-0"></i>
              <span>Thẻ lật hai mặt &mdash; chạm để lật, nghe phát âm &middot; Đã lật {{ flippedCount }}/{{ warmup.length }} thẻ</span>
            </div>
            <button (click)="flipAll()" class="btn btn-outline btn-sm gap-2">
              <i class="fa-solid fa-clone"></i> Lật tất cả
            </button>
            <button (click)="slowMode = !slowMode" class="btn btn-outline btn-sm gap-2"
              [class.btn-success]="slowMode" [class.text-white]="slowMode">
              <i class="fa-solid" [class.fa-tortoise]="slowMode" [class.fa-gauge-high]="!slowMode"></i>
              {{ slowMode ? 'Đọc chậm' : 'Đọc thường' }}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            @for (w of warmup; track w.id) {
              <div (click)="flip(w.id)" class="cursor-pointer select-none">
                @if (flipped[w.id]) {
                  <div class="card border-2 border-error/30 bg-error/5 p-6 text-center shadow-sm">
                    <p class="text-lg font-bold text-error">{{ w.pinyin }}</p>
                    <p class="text-sm text-error/80">{{ w.hanviet }}</p>
                    <p class="mt-1 font-semibold text-base-content">{{ w.meaningVi }}</p>
                    <button (click)="speak(w.hanzi, $event, w.audioUrl)" class="btn btn-circle btn-sm btn-ghost bg-base-100 shadow-sm mt-3 mx-auto">
                      <i class="fa-solid fa-volume-high text-error"></i>
                    </button>
                  </div>
                } @else {
                  <div class="card border-2 border-base-200 bg-base-100 p-6 text-center shadow-sm hover:border-error/30 transition-colors">
                    <p class="hanzi text-4xl font-black text-base-content">{{ w.hanzi }}</p>
                    <p class="mt-2 text-xs text-base-content/40 flex items-center justify-center gap-1">
                      <i class="fa-solid fa-hand-pointer fa-xs"></i> Chạm để lật
                    </p>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- PHẦN 2: TỪ MỚI -->
        @if (part === 1) {
          <div class="card bg-base-100 border border-base-200 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-base-content/70">
              <span class="flex items-center gap-2">
                <i class="fa-solid fa-book text-error"></i> {{ l.vocabularies.length }} từ mới
              </span>
              <div class="flex gap-2">
                <button (click)="slowMode = !slowMode" class="btn btn-outline btn-sm gap-2"
                  [class.btn-success]="slowMode" [class.text-white]="slowMode">
                  <i class="fa-solid" [class.fa-tortoise]="slowMode" [class.fa-gauge-high]="!slowMode"></i>
                  {{ slowMode ? 'Đọc chậm' : 'Đọc thường' }}
                </button>
                <button (click)="playAll()" class="btn btn-error btn-sm text-white gap-2">
                  <i class="fa-solid fa-play"></i> Nghe cả bài
                </button>
                <button (click)="toggleHideVi()" class="btn btn-outline btn-sm gap-2">
                  <i class="fa-solid" [class.fa-eye]="hideVi" [class.fa-eye-slash]="!hideVi"></i>
                  {{ hideVi ? 'Hiện nghĩa' : 'Ẩn nghĩa (tự kiểm tra)' }}
                </button>
              </div>
            </div>
          </div>
          <div class="space-y-3">
            @for (v of l.vocabularies; track v.id; let i = $index) {
              <div class="card bg-base-100 border border-base-200 shadow-sm">
                <div class="card-body p-5 flex-row items-start gap-4">
                  <div class="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0 font-extrabold text-error">
                    {{ i + 1 }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="hanzi text-2xl font-bold text-base-content">{{ v.hanzi }} @if (v.emoji) { <span class="text-base font-normal ml-1">{{ v.emoji }}</span> }</p>
                    <p class="text-sm font-semibold text-error mt-0.5">{{ v.pinyin }} <span class="font-normal text-base-content/40">({{ v.hanviet }})</span></p>
                    <p class="mt-1 text-sm text-base-content/80" [class.opacity-0]="hideVi">{{ v.meaningVi }}</p>
                    @if (v.exampleZh) {
                      <div class="mt-2 rounded-lg bg-base-200/50 p-3 text-sm">
                        <p class="hanzi font-medium">{{ v.exampleZh }}</p>
                        <p class="text-xs text-base-content/50 mt-0.5">{{ v.examplePinyin }}</p>
                        <p class="text-sm text-base-content/70 mt-0.5" [class.opacity-0]="hideVi">&rarr; {{ v.exampleVi }}</p>
                      </div>
                    }
                  </div>
                  <button (click)="speak(v.hanzi + '。' + (v.exampleZh ?? ''), $event, v.audioUrl)" class="btn btn-ghost btn-circle btn-sm text-error">
                    <i class="fa-solid fa-volume-high text-base"></i>
                  </button>
                </div>
              </div>
            }
          </div>
        }

        <!-- PHẦN 3: ÔN TẬP — ghép từ + sắp xếp câu -->
        @if (part === 2) {
          <div class="card bg-base-100 border border-base-200 shadow-sm">
            <div class="card-body p-6">
              <h3 class="font-bold text-base-content flex items-center gap-2">
                <i class="fa-solid fa-gamepad text-error"></i> Trò 1 &mdash; Ghép từ: chọn nghĩa đúng
              </h3>
              <p class="mt-1 font-bold text-success text-sm flex items-center gap-1.5">
                <i class="fa-solid fa-circle-check"></i> Đúng: {{ matchScore }}/{{ quiz.length }} cặp
              </p>
              <div class="mt-4 space-y-3">
                @for (q of quiz; track q.hanzi) {
                  <div class="flex flex-wrap items-center gap-3">
                    <span class="hanzi w-20 shrink-0 text-2xl font-bold text-base-content">{{ q.hanzi }}</span>
                    <div class="flex flex-wrap gap-2">
                      @for (o of q.options; track o) {
                        <button (click)="pickMatch(q, o, $event.target)" class="btn btn-outline btn-sm">
                          {{ o }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>

          <!-- Trò 2 — Sắp xếp câu -->
          @if (puzzles.length) {
            <div class="card bg-base-100 border border-base-200 shadow-sm">
              <div class="card-body p-6">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-bold text-base-content flex items-center gap-2">
                    <i class="fa-solid fa-shuffle text-error"></i> Trò 2 &mdash; Sắp xếp câu
                  </h3>
                  <span class="badge badge-warning badge-sm text-white ml-auto">Câu {{ pIdx + 1 }}/{{ puzzles.length }}</span>
                </div>
                @if (sbCurrent; as p) {
                  <div class="mt-3 rounded-xl bg-base-200/60 p-4">
                    <p class="text-xs text-base-content/50">Dịch câu sau sang tiếng Trung:</p>
                    <p class="mt-1 font-bold text-base-content">{{ p.meaningVi }}</p>
                  </div>

                  <!-- Dòng trả lời -->
                  <div class="mt-3 min-h-[56px] rounded-xl border-2 border-dashed p-3 flex flex-wrap items-center gap-2"
                    [class]="sbFb === 'ok' ? 'border-success bg-success/5' : sbFb === 'no' ? 'border-error bg-error/5' : 'border-base-300'">
                    @if (sbPicked.length) {
                      @for (w of sbPicked; track $index) {
                        <button (click)="unpickWord($index)" class="hanzi btn btn-sm bg-base-100 border border-base-200 font-bold"
                          title="Bấm để bỏ từ này">{{ w }}</button>
                      }
                    } @else {
                      <span class="text-sm text-base-content/40">Bấm các thẻ từ bên dưới để xếp câu…</span>
                    }
                  </div>

                  <!-- Kho thẻ từ -->
                  <div class="mt-3 flex flex-wrap gap-2">
                    @for (w of sbPool; track $index) {
                      <button (click)="pickWord($index)" class="hanzi btn btn-outline btn-sm font-bold">{{ w }}</button>
                    }
                  </div>

                  <div class="mt-4 flex flex-wrap gap-2">
                    <button (click)="checkSb()" class="btn btn-success btn-sm text-white gap-1.5">
                      <i class="fa-solid fa-check"></i> Kiểm tra
                    </button>
                    <button (click)="nextSb()" class="btn btn-outline btn-sm gap-1.5">
                      <i class="fa-solid fa-forward"></i> Câu tiếp
                    </button>
                    <button (click)="speak(p.sentence)" class="btn btn-ghost btn-sm gap-1.5 text-error">
                      <i class="fa-solid fa-volume-high"></i> Nghe đáp án
                    </button>
                    <button (click)="resetPuzzle()" class="btn btn-ghost btn-sm gap-1.5 text-base-content/50">
                      <i class="fa-solid fa-rotate-left"></i> Chơi lại
                    </button>
                  </div>

                  @if (sbFb === 'ok') {
                    <div class="alert alert-success py-2.5 text-sm mt-3">
                      <i class="fa-solid fa-circle-check"></i>
                      <span>Chính xác! <span class="hanzi font-bold">{{ p.sentence }}</span>
                        @if (p.pinyin) { — {{ p.pinyin }} }</span>
                    </div>
                  } @else if (sbFb === 'no') {
                    <div class="alert alert-error py-2.5 text-sm mt-3">
                      <i class="fa-solid fa-circle-exclamation"></i>
                      <span>Chưa đúng — thử đổi lại trật tự từ nhé.</span>
                    </div>
                  }
                }
              </div>
            </div>
          }
        }

        <!-- PHẦN 4: NGỮ PHÁP -->
        @if (part === 3) {
          @for (g of l.grammarPoints; track g.id) {
            <div class="card bg-base-100 border border-base-200 shadow-sm">
              <div class="card-body p-6 space-y-4">
                <h3 class="text-lg font-bold text-base-content">{{ g.title }}</h3>
                @if (g.formula) {
                  <p class="hanzi rounded-xl bg-error/10 border border-error/20 p-4 text-center text-xl font-bold text-error">
                    {{ g.formula }}
                  </p>
                }
                @if (g.explanation) {
                  <p class="text-sm text-base-content/70 leading-relaxed">{{ g.explanation }}</p>
                }

                @for (e of g.examples; track e.id) {
                  <div class="flex items-center justify-between rounded-xl bg-base-200/50 p-3">
                    <div>
                      <p class="hanzi font-bold text-base-content">{{ e.zh }}</p>
                      <p class="text-xs text-base-content/50 mt-0.5">{{ e.pinyin }} &middot; {{ e.vi }}</p>
                    </div>
                    <button (click)="speak(e.zh, $event, e.audioUrl)" class="btn btn-ghost btn-circle btn-sm text-error">
                      <i class="fa-solid fa-volume-high"></i>
                    </button>
                  </div>
                }

                @for (m of g.mistakes; track m.id) {
                  <div class="rounded-xl border border-error/30 overflow-hidden text-sm">
                    <div class="bg-error/10 px-3 py-2 font-bold text-error flex items-center gap-1.5">
                      <i class="fa-solid fa-circle-xmark"></i> Lỗi hay mắc
                    </div>
                    <div class="hanzi px-3 py-2 text-error line-through bg-base-100">{{ m.wrongText }}</div>
                    <div class="hanzi border-t border-base-200 px-3 py-2 text-success bg-base-100 font-medium">
                      <i class="fa-solid fa-check mr-1"></i> {{ m.rightText }}
                      @if (m.note) { <span class="text-xs font-normal text-base-content/50 ml-1">({{ m.note }})</span> }
                    </div>
                  </div>
                }

                @for (d of g.drills; track d.id) {
                  <div class="pt-2">
                    <p class="hanzi mb-2 text-sm font-bold text-base-content flex items-center gap-1.5">
                      <i class="fa-solid fa-bolt text-warning"></i> {{ d.question }}
                    </p>
                    <div class="flex flex-wrap gap-2">
                      @for (o of d.options; track $index; let oi = $index) {
                        <button (click)="pickDrill(d, oi, $event.target)" class="hanzi btn btn-outline btn-sm">
                          {{ o }}
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        <!-- PHẦN 5: HỘI THOẠI -->
        @if (part === 4) {
          <div class="card bg-base-100 border border-base-200 p-4">
            <div class="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-base-content/70">
              <span class="flex items-center gap-2">
                <i class="fa-solid fa-comments text-error"></i> Hội thoại phân vai A/B
              </span>
              <button (click)="slowMode = !slowMode" class="btn btn-outline btn-sm gap-2"
                [class.btn-success]="slowMode" [class.text-white]="slowMode">
                <i class="fa-solid" [class.fa-tortoise]="slowMode" [class.fa-gauge-high]="!slowMode"></i>
                {{ slowMode ? 'Đọc chậm' : 'Đọc thường' }}
              </button>
              <button (click)="togglePinyin()" class="btn btn-outline btn-sm gap-2">
                <i class="fa-solid" [class.fa-eye]="hidePinyin" [class.fa-eye-slash]="!hidePinyin"></i>
                {{ hidePinyin ? 'Hiện phiên âm' : 'Ẩn phiên âm' }}
              </button>
            </div>
          </div>
          <div class="space-y-3">
            @for (d of l.dialogueLines; track d.id) {
              <div class="flex" [class.justify-end]="d.speaker === 'B'">
                <div class="card max-w-md bg-base-100 border border-base-200 shadow-sm">
                  <div class="card-body p-4 space-y-1">
                    <p class="text-xs font-bold" [class.text-error]="d.speaker === 'A'" [class.text-info]="d.speaker === 'B'">
                      Vai {{ d.speaker }}
                    </p>
                    <p class="hanzi text-lg font-bold text-base-content">{{ d.zh }}</p>
                    <p class="text-xs text-error font-medium" [class.opacity-0]="hidePinyin">{{ d.pinyin }}</p>
                    <p class="text-sm text-base-content/70">{{ d.vi }}</p>
                    <button (click)="speak(d.zh, $event, d.audioUrl)" class="btn btn-ghost btn-xs gap-1 self-start text-error mt-1 p-0 h-auto">
                      <i class="fa-solid fa-volume-high"></i> Nghe
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- Pagination Footer -->
        <div class="flex items-center justify-between pt-3">
          <button (click)="go(part - 1)" [disabled]="part === 0" class="btn btn-outline btn-sm gap-2">
            <i class="fa-solid fa-arrow-left"></i> Phần trước
          </button>
          <span class="text-sm font-semibold text-base-content/50">Phần {{ part + 1 }}/5 &middot; {{ partNames[part] }}</span>
          <button (click)="go(part + 1)" [disabled]="part === 4" class="btn btn-error btn-sm text-white gap-2">
            Phần tiếp theo <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
      </div>
    }
  `,
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`]
})
export class StudentLessonComponent implements OnInit {
  lesson: LessonFull | null = null;
  partNames = PART_NAMES;
  part = 0;
  flipped: Record<string, boolean> = {};
  flippedCount = 0;
  hideVi = false;
  hidePinyin = false;
  slowMode = false;
  matchScore = 0;
  quiz: { hanzi: string; meaning: string; options: string[] }[] = [];
  lessonId = '';

  puzzles: Puzzle[] = [];
  pIdx = 0;
  sbPicked: string[] = [];
  sbPool: string[] = [];
  sbFb: '' | 'ok' | 'no' = '';

  get sbCurrent(): Puzzle | null { return this.puzzles[this.pIdx] ?? null; }

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private tts = inject(TtsService);

  get warmup(): Vocab[] {
    const all = this.lesson?.vocabularies ?? [];
    if (!all.length) return [];
    // Ưu tiên từ được giáo viên đánh dấu ★; không có thì dùng 5 từ đầu
    const marked = all.filter((v) => v.inWarmup);
    return (marked.length ? marked : all).slice(0, 5);
  }

  ngOnInit() {
    this.slowMode = localStorage.getItem('hz_setting_slowtts') === '1';
    this.lessonId = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<any>(`http://localhost:5000/api/lessons/${this.lessonId}`).subscribe({
      next: (res) => {
        if (!res.success) return;
        this.lesson = res.data;
        this.buildQuiz();
      }
    });
    // Deep-link "học lại mục": /learn/:id?part=N — nhảy thẳng phần cần ôn
    const qpPart = Number(this.route.snapshot.queryParamMap.get('part') ?? '0');
    if (qpPart >= 1 && qpPart <= 5) this.part = qpPart - 1;
    this.http.get<any>('http://localhost:5000/api/progress/mine').subscribe({
      next: (res) => {
        const p = (res.data ?? []).find((x: any) => x.lessonId === this.lessonId);
        if (p && qpPart < 1) this.part = Math.min(4, p.currentPart - 1);
      }
    });
  }

  private buildQuiz() {
    const vocab = this.lesson?.vocabularies ?? [];
    this.quiz = [...vocab].sort(() => Math.random() - 0.5).slice(0, 6).map((v) => ({
      hanzi: v.hanzi, meaning: v.meaningVi,
      options: [v.meaningVi, ...vocab.filter((x) => x.id !== v.id).sort(() => Math.random() - 0.5).slice(0, 2).map((x) => x.meaningVi)]
        .sort(() => Math.random() - 0.5)
    }));
    this.puzzles = this.lesson?.sentencePuzzles ?? [];
    if (this.puzzles.length) this.resetPuzzle();
  }

  /** ----- Trò 2: sắp xếp câu ----- */
  resetPuzzle() {
    const p = this.sbCurrent;
    if (!p) return;
    this.sbPool = p.sentence.trim().split(/\s+/).sort(() => Math.random() - 0.5);
    this.sbPicked = [];
    this.sbFb = '';
  }

  pickWord(i: number) {
    const w = this.sbPool[i];
    if (w === undefined) return;
    this.sbPool.splice(i, 1);
    this.sbPicked.push(w);
    this.sbFb = '';
  }

  unpickWord(i: number) {
    const w = this.sbPicked[i];
    if (w === undefined) return;
    this.sbPicked.splice(i, 1);
    this.sbPool.push(w);
    this.sbFb = '';
  }

  checkSb() {
    const p = this.sbCurrent;
    if (!p) return;
    const got = this.sbPicked.join('');
    if (!got) { this.sbFb = 'no'; return; }
    this.sbFb = got === p.sentence.replace(/\s+/g, '') ? 'ok' : 'no';
    if (this.sbFb === 'ok') this.tts.speakUrl(undefined, p.sentence, this.slowMode);
  }

  nextSb() {
    if (!this.puzzles.length) return;
    this.pIdx = (this.pIdx + 1) % this.puzzles.length;
    this.resetPuzzle();
  }

  speak(text: string, ev?: Event, audioUrl?: string) {
    ev?.stopPropagation();
    this.tts.speakUrl(audioUrl, text, this.slowMode);
  }

  playAll() {
    if (!this.lesson) return;
    let i = 0;
    const next = () => {
      if (i >= this.lesson!.vocabularies.length) return;
      const v = this.lesson!.vocabularies[i++];
      this.speak(`${v.hanzi}。${v.exampleZh ?? ''}`, undefined, v.audioUrl);
      setTimeout(next, 2600);
    };
    next();
  }

  flip(id: string) {
    if (!this.flipped[id]) { this.flipped[id] = true; this.flippedCount++; }
    else this.flipped[id] = !this.flipped[id];
  }

  /** Lật/bỏ lật toàn bộ thẻ khởi động. */
  flipAll() {
    const anyDown = this.warmup.some(w => !this.flipped[w.id]);
    for (const w of this.warmup) this.flipped[w.id] = anyDown;
    this.flippedCount = anyDown ? this.warmup.length : 0;
  }

  toggleHideVi() { this.hideVi = !this.hideVi; }
  togglePinyin() { this.hidePinyin = !this.hidePinyin; }

  pickMatch(q: any, option: string, target: any) {
    const btn = target as HTMLButtonElement;
    if (option === q.meaning) {
      btn.className = 'btn btn-success btn-sm text-white';
      this.matchScore++;
    } else {
      btn.className = 'btn btn-error btn-sm text-white';
    }
    btn.disabled = true;
  }

  pickDrill(d: Drill, oi: number, target: any) {
    const btn = target as HTMLButtonElement;
    const ok = oi === d.answerIndex;
    btn.className = ok
      ? 'hanzi btn btn-success btn-sm text-white'
      : 'hanzi btn btn-error btn-sm text-white';
    if (ok) this.toast.success('Chính xác!');
  }

  go(i: number) {
    this.part = Math.max(0, Math.min(4, i));
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.http.post<any>('http://localhost:5000/api/progress/upsert', {
      lessonId: this.lessonId, currentPart: this.part + 1, flippedCount: this.flippedCount
    }).subscribe();
  }
}

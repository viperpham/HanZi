import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';
import { pinyin } from 'pinyin-pro';

interface Vocab { id: string; orderNo: number; hanzi: string; pinyin: string; meaningVi: string; emoji?: string; inWarmup: boolean; }
interface Grammar { id: string; orderNo: number; title: string; formula?: string; explanation?: string; examples: any[]; mistakes: any[]; drills: any[]; }
interface Dialogue { id: string; orderNo: number; speaker: string; zh: string; pinyin?: string; vi: string; }
interface LessonFull { id: string; curriculumId: string; titleVi: string; titleZh: string; description?: string; vocabularies: Vocab[]; grammarPoints: Grammar[]; dialogueLines: Dialogue[]; }

@Component({
  selector: 'app-lesson-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    @if (lesson; as l) {
      <div class="space-y-6">

        <!-- Header -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="hanzi text-2xl font-extrabold text-base-content">{{ l.titleZh }} &middot; {{ l.titleVi }}</h1>
            <p class="text-sm text-base-content/50 mt-1">{{ l.description || 'Chi tiết bài học và quản lý nội dung' }}</p>
          </div>
          <a routerLink="/present/{{ l.id }}" class="btn btn-neutral btn-sm gap-2">
            <i class="fa-solid fa-desktop"></i> Trình chiếu
          </a>
        </div>

        <!-- Section 1 & 2: Từ mới -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 pb-3">
              <h2 class="font-bold text-base text-base-content flex items-center gap-2">
                <i class="fa-solid fa-book text-error"></i>
                Từ mới <span class="badge badge-ghost badge-sm font-bold">{{ l.vocabularies.length }}</span>
              </h2>
              <div class="flex gap-2">
                <button (click)="importVocab()" class="btn btn-outline btn-sm gap-1.5">
                  <i class="fa-solid fa-file-import"></i> Nhập CSV
                </button>
                <button (click)="addVocab()" class="btn btn-error btn-sm text-white gap-1.5">
                  <i class="fa-solid fa-plus"></i> Thêm từ
                </button>
              </div>
            </div>

            <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              @for (v of l.vocabularies; track v.id) {
                <div class="card bg-base-100 border border-base-200 p-4 relative group">
                  <div class="flex items-start justify-between">
                    <div>
                      <p class="hanzi text-xl font-bold text-base-content">{{ v.hanzi }} @if(v.emoji){<span class="text-base font-normal ml-1">{{ v.emoji }}</span>}</p>
                      <p class="text-sm font-semibold text-error mt-0.5">{{ v.pinyin }}</p>
                      <p class="text-sm text-base-content/70 mt-1">{{ v.meaningVi }}</p>
                    </div>
                    <div class="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button (click)="toggleWarmup(v)" [title]="v.inWarmup ? 'Bỏ khỏi phần Khởi động' : 'Dùng cho thẻ lật phần Khởi động'"
                        class="btn btn-ghost btn-xs btn-square"
                        [class]="v.inWarmup ? 'text-warning' : 'text-base-content/30 hover:text-warning'">
                        <i class="fa-star" [class.fa-solid]="v.inWarmup" [class.fa-regular]="!v.inWarmup"></i>
                      </button>
                      <button (click)="editVocab(v)" title="Sửa từ"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content">
                        <i class="fa-solid fa-pencil"></i>
                      </button>
                      <button (click)="delVocab(v)" title="Xoá từ"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Section 3: Ngữ pháp -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <div class="flex items-center justify-between border-b border-base-200 pb-3">
              <h2 class="font-bold text-base text-base-content flex items-center gap-2">
                <i class="fa-solid fa-feather text-error"></i>
                Ngữ pháp <span class="badge badge-ghost badge-sm font-bold">{{ l.grammarPoints.length }}</span>
              </h2>
              <button (click)="addGrammar()" class="btn btn-error btn-sm text-white gap-1.5">
                <i class="fa-solid fa-plus"></i> Thêm ngữ pháp
              </button>
            </div>

            @for (g of l.grammarPoints; track g.id) {
              <div class="mt-4 rounded-xl border border-base-200 p-4 space-y-3">
                <div class="flex items-center justify-between">
                  <p class="font-bold text-base-content text-base">{{ g.title }}</p>
                  <div class="flex gap-1">
                    <button (click)="editGrammar(g)" title="Sửa"
                      class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content">
                      <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button (click)="delGrammar(g)" title="Xoá"
                      class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </div>
                @if (g.formula) {
                  <p class="hanzi rounded-lg bg-error/10 border border-error/20 px-3 py-2 text-center font-bold text-error text-sm">
                    {{ g.formula }}
                  </p>
                }
                @if (g.explanation) {
                  <p class="text-sm text-base-content/70">{{ g.explanation }}</p>
                }

                <!-- Ví dụ -->
                <div class="pt-2 border-t border-base-200">
                  <div class="flex items-center justify-between mb-1.5">
                    <p class="text-xs font-bold uppercase tracking-wide text-base-content/40">Ví dụ</p>
                    <button (click)="addExample(g)" class="btn btn-ghost btn-xs text-error gap-1">
                      <i class="fa-solid fa-plus fa-xs"></i> Thêm ví dụ
                    </button>
                  </div>
                  @for (e of g.examples; track $index) {
                    <div class="flex items-center justify-between text-sm py-1 border-b border-base-200/50 last:border-0">
                      <p class="hanzi">
                        &bull; {{ e.zh }}
                        @if (e.pinyin) { <span class="font-semibold text-error ml-1">{{ e.pinyin }}</span> }
                        <span class="text-base-content/60 ml-1">&mdash; {{ e.vi }}</span>
                      </p>
                      <button (click)="delExample(g, e)" class="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  } @empty {
                    <p class="text-xs text-base-content/40 italic">Chưa có ví dụ.</p>
                  }
                </div>

                <!-- Lỗi hay mắc -->
                <div class="pt-2 border-t border-base-200">
                  <div class="flex items-center justify-between mb-1.5">
                    <p class="text-xs font-bold uppercase tracking-wide text-base-content/40">Lỗi hay mắc</p>
                    <button (click)="addMistake(g)" class="btn btn-ghost btn-xs text-error gap-1">
                      <i class="fa-solid fa-plus fa-xs"></i> Thêm lỗi
                    </button>
                  </div>
                  @for (m of g.mistakes; track $index) {
                    <div class="flex items-center justify-between text-sm py-1 border-b border-base-200/50 last:border-0">
                      <p class="hanzi">
                        <span class="text-error line-through mr-1">{{ m.wrongText }}</span>
                        <i class="fa-solid fa-arrow-right fa-xs text-base-content/40 mx-1"></i>
                        <span class="font-bold text-success">{{ m.rightText }}</span>
                        @if (m.note) { <span class="text-base-content/50 text-xs ml-1">({{ m.note }})</span> }
                      </p>
                      <button (click)="delMistake(g, m)" class="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  } @empty {
                    <p class="text-xs text-base-content/40 italic">Chưa có lỗi nào.</p>
                  }
                </div>

                <!-- Bài luyện nhanh -->
                <div class="pt-2 border-t border-base-200">
                  <div class="flex items-center justify-between mb-1.5">
                    <p class="text-xs font-bold uppercase tracking-wide text-base-content/40">Bài luyện nhanh</p>
                    <button (click)="addDrill(g)" class="btn btn-ghost btn-xs text-error gap-1">
                      <i class="fa-solid fa-plus fa-xs"></i> Thêm câu luyện
                    </button>
                  </div>
                  @for (d of g.drills; track $index) {
                    <div class="rounded-lg bg-base-200/50 p-3 text-sm space-y-1 mb-2">
                      <p class="hanzi font-semibold text-base-content">{{ d.question }}</p>
                      @for (o of drillOptions(d); track $index) {
                        <p class="hanzi ml-3 text-xs" [class.font-bold]="$index === d.answerIndex" [class.text-success]="$index === d.answerIndex">
                          {{ ['A','B','C','D'][$index] }}. {{ o }}
                          @if ($index === d.answerIndex) { <i class="fa-solid fa-check text-xs ml-1"></i> }
                        </p>
                      }
                      <button (click)="delDrill(g, d)" class="btn btn-ghost btn-xs text-error gap-1 mt-1 p-0 h-auto min-h-0">
                        <i class="fa-solid fa-xmark"></i> Xoá câu này
                      </button>
                    </div>
                  } @empty {
                    <p class="text-xs text-base-content/40 italic">Chưa có câu luyện.</p>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Section 4: Hội thoại -->
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-5">
            <div class="flex items-center justify-between border-b border-base-200 pb-3">
              <h2 class="font-bold text-base text-base-content flex items-center gap-2">
                <i class="fa-solid fa-comments text-error"></i>
                Hội thoại <span class="badge badge-ghost badge-sm font-bold">{{ l.dialogueLines.length }}</span>
              </h2>
              <button (click)="addDialogue()" class="btn btn-error btn-sm text-white gap-1.5">
                <i class="fa-solid fa-plus"></i> Thêm câu
              </button>
            </div>

            <div class="space-y-2 mt-4">
              @for (d of l.dialogueLines; track d.id) {
                <div class="flex items-center gap-3 rounded-xl border border-base-200 px-4 py-2.5 hover:bg-base-200/50 transition-colors">
                  <span class="badge badge-sm font-bold" [class.badge-error]="d.speaker === 'A'" [class.badge-info]="d.speaker === 'B'">
                    {{ d.speaker }}
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="hanzi font-semibold text-base-content text-sm inline mr-2">{{ d.zh }}</p>
                    @if (d.pinyin) { <span class="text-xs text-error font-medium mr-2">{{ d.pinyin }}</span> }
                    <span class="text-xs text-base-content/50">&mdash; {{ d.vi }}</span>
                  </div>
                  <div class="flex items-center gap-0.5">
                    <button (click)="editDialogue(d)" title="Sửa"
                      class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content">
                      <i class="fa-solid fa-pencil"></i>
                    </button>
                    <button (click)="delDialogue(d)" title="Xoá"
                      class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error">
                      <i class="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>

      </div>
    }
  `,
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`]
})
export class LessonDetailComponent implements OnInit {
  lesson: LessonFull | null = null;
  lessonId = '';
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private modal = inject(ModalService);

  ngOnInit() {
    this.lessonId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load() {
    this.http.get<any>(`http://localhost:5000/api/lessons/${this.lessonId}`).subscribe({
      next: (res) => { if (res.success) this.lesson = res.data; }
    });
  }

  drillOptions(d: any): string[] {
    return (d.options ?? []).map((o: any) => (typeof o === 'string' ? o : o?.text ?? ''));
  }

  private saveChildren(payload: any, done: () => void) {
    const l = this.lesson!;
    this.http.put<any>(`http://localhost:5000/api/lessons/${l.id}`, {
      curriculumId: l.curriculumId,
      orderNo: 1, titleVi: l.titleVi, titleZh: l.titleZh, description: l.description,
      vocabularies: l.vocabularies.map((v, i) => ({ orderNo: i + 1, hanzi: v.hanzi, pinyin: v.pinyin, meaningVi: v.meaningVi, emoji: v.emoji, inWarmup: v.inWarmup })),
      grammarPoints: l.grammarPoints.map((g, i) => ({
        orderNo: i + 1, title: g.title, formula: g.formula, explanation: g.explanation,
        examples: g.examples.map((e: any, ei: number) => ({ orderNo: ei + 1, zh: e.zh, pinyin: e.pinyin, vi: e.vi })),
        mistakes: g.mistakes.map((m: any) => ({ wrongText: m.wrongText, rightText: m.rightText, note: m.note })),
        drills: (g.drills ?? []).map((d: any, di: number) => ({ orderNo: di + 1, question: d.question, options: (d.options ?? []).map((o: any) => o.text ?? o), answerIndex: d.answerIndex }))
      })),
      dialogueLines: l.dialogueLines.map((d, i) => ({ orderNo: i + 1, speaker: d.speaker, zh: d.zh, pinyin: d.pinyin, vi: d.vi })),
      ...payload
    }).subscribe({
      next: (res) => { if (res.success) { done(); this.load(); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Lưu thất bại')
    });
  }

  async addVocab() {
    const r = await this.modal.form({
      title: 'Thêm từ mới (bỏ trống phiên âm sẽ tự điền)', confirmText: 'Thêm',
      fields: [
        { key: 'hanzi', label: 'Chữ Hán', placeholder: 'VD: 你好' },
        { key: 'pinyin', label: 'Phiên âm', placeholder: 'Để trống để tự điền' },
        { key: 'meaningVi', label: 'Nghĩa tiếng Việt', placeholder: 'VD: xin chào' },
        { key: 'emoji', label: 'Emoji (tùy chọn)', placeholder: 'VD: 👋' }
      ]
    });
    if (!r || !this.lesson) return;
    const hanzi = r['hanzi'].trim();
    if (!hanzi) { this.toast.error('Cần nhập chữ Hán.'); return; }
    const pinyinAuto = r['pinyin'].trim() || pinyin(hanzi, { type: 'array' }).join(' ');
    this.lesson.vocabularies.push({
      id: '', orderNo: this.lesson.vocabularies.length + 1,
      hanzi, pinyin: pinyinAuto, meaningVi: r['meaningVi'], emoji: r['emoji'], inWarmup: false
    });
    this.saveChildren({}, () => {});
  }

  async importVocab() {
    const r = await this.modal.form({
      title: 'Nhập từ vựng (Excel/CSV)', confirmText: 'Nhập',
      fields: [{
        key: 'csv', label: 'Dán dữ liệu — mỗi dòng: chữ Hán, phiên âm, nghĩa, emoji',
        type: 'textarea',
        placeholder: '你好, nǐ hǎo, xin chào, 👋\n谢谢, xièxie, cảm ơn, 🙏'
      }],
    });
    if (!r || !this.lesson) return;
    const rows = r['csv'].split('\n').map((line) => line.split(',').map((s) => s.trim())).filter((cols) => cols[0]);
    let added = 0;
    for (const cols of rows) {
      const [hanzi, p, vi, emoji] = cols;
      this.lesson.vocabularies.push({
        id: '', orderNo: this.lesson.vocabularies.length + 1,
        hanzi,
        pinyin: p || pinyin(hanzi, { type: 'array' }).join(' '),
        meaningVi: vi ?? '', emoji: emoji ?? '', inWarmup: false
      });
      added++;
    }
    if (added) {
      this.saveChildren({}, () => {});
      this.toast.success(`Đã nhập ${added} từ.`);
    }
  }

  /** Bật/tắt từ này xuất hiện trong thẻ lật phần Khởi động của học viên. */
  toggleWarmup(v: Vocab) {
    v.inWarmup = !v.inWarmup;
    this.saveChildren({}, () => {});
  }

  async editVocab(v: Vocab) {
    const r = await this.modal.form({
      title: 'Sửa từ mới', confirmText: 'Lưu',
      fields: [
        { key: 'hanzi', label: 'Chữ Hán', value: v.hanzi },
        { key: 'pinyin', label: 'Phiên âm (bỏ trống sẽ tự điền lại)', value: v.pinyin },
        { key: 'meaningVi', label: 'Nghĩa tiếng Việt', value: v.meaningVi },
        { key: 'emoji', label: 'Emoji (tùy chọn)', value: v.emoji ?? '' }
      ]
    });
    if (!r) return;
    const hanzi = r['hanzi'].trim();
    if (!hanzi) { this.toast.error('Cần nhập chữ Hán.'); return; }
    v.hanzi = hanzi;
    v.pinyin = r['pinyin'].trim() || pinyin(hanzi, { type: 'array' }).join(' ');
    v.meaningVi = r['meaningVi'];
    v.emoji = r['emoji'];
    this.saveChildren({}, () => {});
  }

  async delVocab(v: Vocab) {
    if (!this.lesson) return;
    this.lesson.vocabularies = this.lesson.vocabularies.filter((x) => x !== v);
    this.saveChildren({}, () => {});
  }

  async addGrammar() {
    const r = await this.modal.form({
      title: 'Thêm điểm ngữ pháp', confirmText: 'Thêm',
      fields: [
        { key: 'title', label: 'Tên điểm ngữ pháp', placeholder: 'VD: Câu hỏi với 做什么' },
        { key: 'formula', label: 'Công thức', placeholder: 'VD: A + 是 + B' },
        { key: 'explanation', label: 'Giải thích', type: 'textarea' }
      ]
    });
    if (!r || !this.lesson) return;
    this.lesson.grammarPoints.push({
      id: '', orderNo: this.lesson.grammarPoints.length + 1,
      title: r['title'], formula: r['formula'], explanation: r['explanation'],
      examples: [], mistakes: [], drills: []
    });
    this.saveChildren({}, () => {});
  }

  async editGrammar(g: Grammar) {
    const r = await this.modal.form({
      title: 'Sửa điểm ngữ pháp', confirmText: 'Lưu',
      fields: [
        { key: 'title', label: 'Tên điểm ngữ pháp', value: g.title },
        { key: 'formula', label: 'Công thức', value: g.formula ?? '' },
        { key: 'explanation', label: 'Giải thích', type: 'textarea', value: g.explanation ?? '' }
      ]
    });
    if (!r) return;
    g.title = r['title']; g.formula = r['formula']; g.explanation = r['explanation'];
    this.saveChildren({}, () => {});
  }

  async delGrammar(g: Grammar) {
    if (!this.lesson) return;
    this.lesson.grammarPoints = this.lesson.grammarPoints.filter((x) => x !== g);
    this.saveChildren({}, () => {});
  }

  async addExample(g: Grammar) {
    const r = await this.modal.form({
      title: 'Thêm ví dụ', confirmText: 'Thêm',
      fields: [
        { key: 'zh', label: 'Câu tiếng Trung', placeholder: 'VD: 你做什么工作？' },
        { key: 'pinyin', label: 'Phiên âm', placeholder: 'VD: nǐ zuò shénme gōngzuò?' },
        { key: 'vi', label: 'Nghĩa tiếng Việt', placeholder: 'VD: Bạn làm nghề gì?' }
      ]
    });
    if (!r) return;
    g.examples.push({ id: '', orderNo: g.examples.length + 1, zh: r['zh'], pinyin: r['pinyin'], vi: r['vi'] });
    this.saveChildren({}, () => {});
  }

  async delExample(g: Grammar, e: any) {
    g.examples = g.examples.filter((x) => x !== e);
    this.saveChildren({}, () => {});
  }

  async addMistake(g: Grammar) {
    const r = await this.modal.form({
      title: 'Thêm lỗi hay mắc', confirmText: 'Thêm',
      fields: [
        { key: 'wrongText', label: 'Câu sai (người Việt hay viết)', placeholder: 'VD: 你做什么工作吗？' },
        { key: 'rightText', label: 'Câu đúng', placeholder: 'VD: 你做什么工作？' },
        { key: 'note', label: 'Ghi chú', placeholder: 'VD: Có 做 就 không dùng 吗' }
      ]
    });
    if (!r) return;
    g.mistakes.push({ id: '', orderNo: g.mistakes.length + 1, wrongText: r['wrongText'], rightText: r['rightText'], note: r['note'] });
    this.saveChildren({}, () => {});
  }

  async delMistake(g: Grammar, m: any) {
    g.mistakes = g.mistakes.filter((x) => x !== m);
    this.saveChildren({}, () => {});
  }

  async addDrill(g: Grammar) {
    const r = await this.modal.form({
      title: 'Thêm câu luyện nhanh', confirmText: 'Thêm',
      fields: [
        { key: 'question', label: 'Câu hỏi', placeholder: 'VD: Chọn cách hỏi đúng' },
        { key: 'options', label: 'Các lựa chọn (cách nhau bằng dấu phẩy)', placeholder: 'VD: 你做什么工作吗, 你做什么工作' },
        { key: 'correct', label: 'Lựa chọn đúng (gõ đúng nội dung 1 lựa chọn)', placeholder: 'VD: 你做什么工作' }
      ]
    });
    if (!r) return;
    const options = (r['options'] ?? '').split(',').map((s: string) => s.trim()).filter(Boolean);
    if (!options.length) { this.toast.error('Cần ít nhất 1 lựa chọn.'); return; }
    const answerIndex = options.indexOf(r['correct']);
    if (answerIndex < 0) {
      this.toast.error('Lựa chọn đúng phải trùng 1 trong các lựa chọn.');
      return;
    }
    g.drills.push({ id: '', orderNo: g.drills.length + 1, question: r['question'], options, answerIndex });
    this.saveChildren({}, () => {});
  }

  async delDrill(g: Grammar, d: any) {
    g.drills = g.drills.filter((x) => x !== d);
    this.saveChildren({}, () => {});
  }

  async addDialogue() {
    const r = await this.modal.form({
      title: 'Thêm câu hội thoại', confirmText: 'Thêm',
      fields: [
        { key: 'speaker', label: 'Vai', type: 'select', options: [['A', 'Vai A'], ['B', 'Vai B']] },
        { key: 'zh', label: 'Câu (chữ Hán)', placeholder: 'VD: 你好！' },
        { key: 'pinyin', label: 'Phiên âm', placeholder: 'VD: nǐ hǎo!' },
        { key: 'vi', label: 'Nghĩa tiếng Việt', placeholder: 'VD: Xin chào!' }
      ]
    });
    if (!r || !this.lesson) return;
    this.lesson.dialogueLines.push({
      id: '', orderNo: this.lesson.dialogueLines.length + 1,
      speaker: r['speaker'] || 'A', zh: r['zh'], pinyin: r['pinyin'], vi: r['vi']
    });
    this.saveChildren({}, () => {});
  }

  async editDialogue(d: Dialogue) {
    const r = await this.modal.form({
      title: 'Sửa câu hội thoại', confirmText: 'Lưu',
      fields: [
        { key: 'speaker', label: 'Vai', type: 'select', value: d.speaker, options: [['A', 'Vai A'], ['B', 'Vai B']] },
        { key: 'zh', label: 'Câu (chữ Hán)', value: d.zh },
        { key: 'pinyin', label: 'Phiên âm', value: d.pinyin ?? '' },
        { key: 'vi', label: 'Nghĩa tiếng Việt', value: d.vi }
      ]
    });
    if (!r) return;
    d.speaker = r['speaker'] || 'A';
    d.zh = r['zh'];
    d.pinyin = r['pinyin'];
    d.vi = r['vi'];
    this.saveChildren({}, () => {});
  }

  async delDialogue(d: Dialogue) {
    if (!this.lesson) return;
    this.lesson.dialogueLines = this.lesson.dialogueLines.filter((x) => x !== d);
    this.saveChildren({}, () => {});
  }
}

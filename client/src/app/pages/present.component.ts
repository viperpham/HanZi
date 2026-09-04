import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TtsService } from '../tts.service';

interface Vocab { id: string; hanzi: string; pinyin: string; meaningVi: string; emoji?: string; hantu?: string; }
interface LessonFull { id: string; titleZh: string; titleVi: string; vocabularies: Vocab[]; dialogueLines: any[]; }

interface Slide {
  kind: 'cover' | 'vocab';
  hanzi: string;
  pinyin: string;
  vi: string;
  hantu?: string;
  emoji?: string;
  audioUrl?: string;
}

@Component({
  selector: 'app-present',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (lesson) {
      <div class="flex min-h-screen flex-col bg-slate-950 text-slate-100">
        <div class="flex items-center justify-between px-6 py-3 border-b border-slate-800">
          <p class="hanzi text-sm font-bold text-slate-400">{{ lesson.titleZh }} &middot; {{ lesson.titleVi }}</p>
          <div class="flex items-center gap-3 text-sm text-slate-400">
            <span class="badge badge-ghost font-mono">{{ idx() + 1 }}/{{ slides.length }}</span>
            <button (click)="slow = !slow" class="btn btn-ghost btn-xs gap-1" [class.bg-slate-800]="slow">
              <i class="fa-solid fa-gauge"></i> {{ slow ? 'Đọc chậm' : 'Bình thường' }}
            </button>
            <button (click)="toggleHide()" class="btn btn-ghost btn-xs gap-1">
              <i class="fa-solid" [class.fa-eye]="!hideMeaning()" [class.fa-eye-slash]="hideMeaning()"></i>
              {{ hideMeaning() ? 'Hiện nghĩa' : 'Ẩn nghĩa' }}
            </button>
            <button (click)="fullscreen()" class="btn btn-ghost btn-xs gap-1">
              <i class="fa-solid fa-expand"></i> Fullscreen
            </button>
            <button (click)="router.navigate(['/lessons', lessonId])" class="btn btn-ghost btn-xs text-error gap-1">
              <i class="fa-solid fa-xmark"></i> Thoát
            </button>
          </div>
        </div>

        <div class="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center cursor-pointer" (click)="next()">
          @if (slides[idx()]; as s) {
            <p class="hanzi font-black text-slate-100 drop-shadow-lg" [class]="s.kind === 'vocab' ? 'text-8xl' : 'text-5xl'">
              {{ s.hanzi }} @if (s.emoji) { <span class="text-6xl font-normal ml-2">{{ s.emoji }}</span> }
            </p>
            @if (!hideMeaning()) {
              <p class="hanzi font-bold text-amber-400" [class]="s.kind === 'vocab' ? 'text-4xl' : 'text-2xl'">{{ s.pinyin }}</p>
              @if (s.hantu) { <p class="hanzi text-xl text-slate-300">Hán Việt: {{ s.hantu }}</p> }
              <p class="text-slate-200" [class]="s.kind === 'vocab' ? 'text-3xl' : 'text-xl'">{{ s.vi }}</p>
            } @else {
              <p class="text-sm text-slate-500 italic">(Nghĩa đang ẩn - nhấn để chuyển slide tiếp theo)</p>
            }
          }
          <p class="mt-8 text-xs text-slate-500">
            <i class="fa-solid fa-keyboard mr-1"></i>Phím mũi tên chuyển slide &middot; Space để phát âm &middot; N mở ghi chú
          </p>
        </div>

        @if (noteOpen()) {
          <div class="fixed bottom-20 left-1/2 w-[560px] -translate-x-1/2 card bg-slate-900 border border-slate-700 p-4 shadow-2xl z-50">
            <p class="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400 flex items-center gap-1.5">
              <i class="fa-solid fa-pen text-amber-400"></i> Ghi chú giảng dạy (slide {{ idx() + 1 }})
            </p>
            <textarea [(ngModel)]="notes()[idx()]" (ngModelChange)="notes()[idx()] = $event" rows="2"
              class="textarea bg-slate-800 text-slate-100 w-full text-sm"></textarea>
          </div>
        }

        <!-- Dải slide thu nhỏ -->
        <div class="flex gap-2 overflow-x-auto border-t border-slate-800 px-6 py-3 bg-slate-900/50">
          @for (s of slides; track $index) {
            <button (click)="idx.set($index)" class="hanzi min-w-20 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              [class]="idx() === $index ? 'bg-error text-white font-bold' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'">
              {{ s.hanzi }}
              @if (notes()[$index]) { <i class="fa-solid fa-pen text-xs text-amber-400 ml-1"></i> }
            </button>
          }
        </div>
      </div>
    }
  `,
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`]
})
export class PresentComponent implements OnInit {
  lesson: LessonFull | null = null;
  lessonId = '';
  idx = signal(0);
  hideMeaning = signal(false);
  noteOpen = signal(false);
  notes = signal<Record<number, string>>({});
  slow = false;
  slides: Slide[] = [];

  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private tts = inject(TtsService);
  router = inject(Router);

  ngOnInit() {
    this.lessonId = this.route.snapshot.paramMap.get('id') ?? '';
    this.http.get<any>(`/api/lessons/${this.lessonId}`).subscribe({
      next: (res) => {
        if (!res.success) return;
        this.lesson = res.data;
        this.slides = [
          { kind: 'cover', hanzi: this.lesson!.titleZh, pinyin: this.lesson!.titleVi, vi: 'Bắt đầu buổi học' },
          ...this.lesson!.vocabularies.map((v) => ({
            kind: 'vocab' as const, hanzi: v.hanzi, pinyin: v.pinyin,
            vi: v.meaningVi, hantu: (v as any).hantu, emoji: v.emoji, audioUrl: (v as any).audioUrl
          }))
        ];
      }
    });
  }

  toggleHide() { this.hideMeaning.update((v) => !v); }

  next() { this.idx.update((i) => Math.min(i + 1, this.slides.length - 1)); }
  prev() { this.idx.update((i) => Math.max(i - 1, 0)); }

  speak() {
    const s = this.slides[this.idx()];
    if (!s) return;
    this.tts.speakUrl(s.audioUrl, s.hanzi, this.slow);
  }

  fullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') this.next();
    else if (e.key === 'ArrowLeft') this.prev();
    else if (e.key === ' ') { e.preventDefault(); this.speak(); }
    else if (e.key.toLowerCase() === 'n') this.noteOpen.update((v) => !v);
    else if (e.key === 'Escape') this.router.navigate(['/lessons', this.lessonId]);
  }
}

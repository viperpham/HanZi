import { Injectable } from '@angular/core';

/**
 * Đọc tiếng Trung: ưu tiên giọng zh-CN cài sẵn trong máy (Web Speech API).
 * Máy không có giọng Trung → fallback TTS online (Google Translate) qua <audio>.
 */
@Injectable({ providedIn: 'root' })
export class TtsService {
  private audio: HTMLAudioElement | null = null;
  private zhVoice: SpeechSynthesisVoice | null = null;
  private triedOnline = false;

  constructor() {
    if ('speechSynthesis' in window) {
      const pick = () => {
        const voices = speechSynthesis.getVoices();
        this.zhVoice =
          voices.find((v) => v.lang === 'zh-CN') ??
          voices.find((v) => v.lang === 'zh_TW' || v.lang === 'zh-HK') ??
          voices.find((v) => v.lang.toLowerCase().startsWith('zh')) ??
          null;
      };
      pick();
      speechSynthesis.onvoiceschanged = pick;
    }
  }

  /** Đọc văn bản tiếng Trung. slow = chế độ đọc chậm. */
  speak(text: string, slow = false) {
    const clean = text.replace(/[^\u4e00-\u9fff，。？！、：；\s]/g, '').trim();
    if (!clean) return;

    if ('speechSynthesis' in window && this.zhVoice) {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(clean);
      u.voice = this.zhVoice;
      u.lang = this.zhVoice.lang;
      u.rate = slow ? 0.5 : 0.85;
      speechSynthesis.speak(u);
      return;
    }

    this.speakOnline(clean, slow);
  }

  /**
   * Phát file mp3 đã sinh sẵn (ưu tiên) — không có file thì fallback đọc TTS.
   * url là đường dẫn tương đối "/audio/xxx.mp3" (dev đi qua proxy → server).
   */
  speakUrl(url: string | null | undefined, text: string, slow = false) {
    if (url) {
      this.stop();
      this.audio = new Audio(url);
      this.audio.play().catch(() => this.speak(text, slow));
      return;
    }
    this.speak(text, slow);
  }

  private speakOnline(text: string, slow: boolean) {
    this.stop();
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=zh-CN&ttsspeed=${slow ? 0.5 : 1}&q=${encodeURIComponent(text.slice(0, 200))}`;
    this.audio = new Audio(url);
    this.audio.play().catch(() => {
      // offline hoặc bị chặn → thử lại đúng 1 lần rồi thôi, tránh spam
      if (!this.triedOnline) {
        this.triedOnline = true;
      }
    });
  }

  stop() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }
}

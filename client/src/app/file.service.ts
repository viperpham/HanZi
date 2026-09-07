import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';


export interface FileAsset {
  id: string;
  fileName: string;
  storedName: string;
  url: string;
  kind: 'Image' | 'Document' | 'Audio' | 'Other';
  sizeBytes: number;
  contentType?: string | null;
  createdAt: string;
}

/** Kết nối tới Thư viện tệp phía server (upload / list / xoá / gắn vào bài học). */
@Injectable({ providedIn: 'root' })
export class FileService {
  private http = inject(HttpClient);

  /** Upload 1 file, báo tiến trình 0..100 qua onProgress (nếu cung cấp).
   * Không ném lỗi — trả { ok, asset, error } để tải nhiều tệp không bị đứt vòng lặp. */
  upload(file: File, onProgress?: (pct: number) => void): Promise<{ ok: boolean; asset?: FileAsset; error?: string }> {
    const form = new FormData();
    form.append('file', file);
    return new Promise((resolve) => {
      this.http.post<any>('/api/files', form, { reportProgress: true, observe: 'events' }).subscribe({
        next: (ev) => {
          if (ev.type === HttpEventType.UploadProgress && onProgress && ev.total) {
            onProgress(Math.round(100 * ev.loaded / ev.total));
          }
          if (ev.type === HttpEventType.Response) {
            resolve(ev.body?.success
              ? { ok: true, asset: ev.body.data as FileAsset }
              : { ok: false, error: ev.body?.error ?? 'Tệp không hợp lệ.' });
          }
        },
        error: (e) => resolve({
          ok: false,
          error: e?.status === 0
            ? 'Kết nối bị ngắt — tệp có thể quá lớn hoặc máy chủ đang khởi động lại.'
            : (e?.error?.error ?? 'Tải lên thất bại.'),
        }),
      });
    });
  }

  /** Danh sách tệp của mình — hỗ trợ tìm kiếm/lọc/sắp xếp phía server. */
  mine(params: { search?: string; kind?: string; sort?: string } = {}): Promise<FileAsset[]> {
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    if (params.kind) qs.set('kind', params.kind);
    if (params.sort) qs.set('sort', params.sort);
    const q = qs.toString();
    return firstValueFrom(this.http.get<any>(`/api/files/mine${q ? `?${q}` : ''}`))
      .then((res) => res.success ? res.data : []);
  }

  forLesson(lessonId: string): Promise<FileAsset[]> {
    return firstValueFrom(this.http.get<any>(`/api/files/lesson/${lessonId}`))
      .then((res) => res.success ? res.data : []);
  }

  /** Gắn tệp vào bài học. Trả về số tệp đã gắn thật sự, -1 nếu lỗi
   * (server bỏ qua tệp không sở hữu hoặc đã gắn bài học khác). */
  attachLesson(lessonId: string, fileIds: string[]): Promise<number> {
    return firstValueFrom(this.http.post<any>('/api/files/attach-lesson', { lessonId, fileIds }))
      .then((res) => res.success ? (res.data?.length ?? 0) : -1);
  }

  detachLesson(id: string): Promise<boolean> {
    return firstValueFrom(this.http.post<any>('/api/files/detach-lesson', { id }))
      .then((res) => !!res.success);
  }

  remove(id: string): Promise<boolean> {
    return firstValueFrom(this.http.delete<any>(`/api/files/${id}`))
      .then((res) => !!res.success);
  }

  /** URL xem file — thẻ <img> không gửi được header nên phải kèm token trên query. */
  static viewUrl(f: FileAsset): string {
    return `${f.url}?access_token=${localStorage.getItem('hz_token') ?? ''}`;
  }

  /** Icon / màu / nhãn hiển thị theo loại tệp — dùng chung mọi component. */
  static fileMeta(f: FileAsset): { icon: string; color: string; label: string } {
    if (f.kind === 'Image') return { icon: 'fa-file-image', color: 'text-indigo-500', label: 'Hình ảnh' };
    const ext = f.fileName.slice(f.fileName.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf') return { icon: 'fa-file-pdf', color: 'text-rose-500', label: 'PDF' };
    if (['.doc', '.docx'].includes(ext)) return { icon: 'fa-file-word', color: 'text-blue-500', label: 'Word' };
    if (['.xls', '.xlsx'].includes(ext)) return { icon: 'fa-file-excel', color: 'text-emerald-500', label: 'Excel' };
    if (['.ppt', '.pptx'].includes(ext)) return { icon: 'fa-file-powerpoint', color: 'text-amber-500', label: 'PowerPoint' };
    if (['.zip', '.rar', '.7z'].includes(ext)) return { icon: 'fa-file-zipper', color: 'text-purple-500', label: 'Tệp nén' };
    if (['.mp3', '.wav', '.m4a'].includes(ext)) return { icon: 'fa-file-audio', color: 'text-teal-500', label: 'Âm thanh' };
    return { icon: 'fa-file-lines', color: 'text-base-content/50', label: 'Tài liệu' };
  }

  /** "1.2 MB" */
  static humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}

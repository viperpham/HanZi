import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';

interface Curriculum {
  id: string; code: string; nameVi: string; nameZh: string; level: string; status: string;
  coverEmoji: string; coverColor?: string; description?: string; teacherName?: string; lessonCount: number;
}

const EMOJI_OPTIONS: [string, string][] = [
  ['📕', '📕 Sách đỏ'], ['📖', '📖 Sách mở'], ['📗', '📗 Sách xanh'], ['📘', '📘 Sách xanh dương'],
  ['🏮', '🏮 Đèn lồng'], ['🐉', '🐉 Rồng'], ['🐼', '🐼 Gấu trúc'], ['🥢', '🥢 Đũa'],
  ['✏️', '✏️ Bút chì'], ['🎓', '🎓 Tốt nghiệp'], ['🗣️', '🗣️ Hội thoại'], ['📚', '📚 Thư viện']
];

const COLOR_OPTIONS: [string, string][] = [
  ['#dc2626', 'Đỏ HanZi'], ['#ea580c', 'Cam'], ['#16a34a', 'Xanh lá'],
  ['#2563eb', 'Xanh dương'], ['#7c3aed', 'Tím'], ['#db2777', 'Hồng'], ['#475569', 'Xám']
];

const STATUS_OPTIONS: [string, string][] = [
  ['Published', 'Đang dùng (học viên thấy)'],
  ['Draft', 'Bản nháp (học viên không thấy)'],
  ['Archived', 'Lưu trữ']
];

@Component({
  selector: 'app-curriculums',
  standalone: true,
  template: `
    <div class="space-y-5">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Giáo trình</h1>
          <p class="text-sm text-base-content/50 mt-0.5">{{ items.length }} giáo trình đang quản lý</p>
        </div>
        <button (click)="add()" class="btn btn-error btn-sm text-white gap-2">
          <i class="fa-solid fa-plus"></i> Tạo giáo trình
        </button>
      </div>

      <!-- Table -->
      <div class="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full min-w-[680px]">
            <thead>
              <tr class="text-xs uppercase tracking-wide text-base-content/50">
                <th>Giáo trình</th>
                <th>Cấp độ</th>
                <th>Số bài</th>
                <th>Phụ trách</th>
                <th>Trạng thái</th>
                <th class="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              @for (c of items; track c.id) {
                <tr class="hover">
                  <td>
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-xl shrink-0">
                        {{ c.coverEmoji || '📖' }}
                      </div>
                      <div>
                        <p class="font-semibold text-sm">{{ c.nameVi }}</p>
                        <p class="hanzi text-xs text-base-content/40">{{ c.nameZh }}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-outline badge-sm font-mono">{{ c.level }}</span>
                  </td>
                  <td>
                    <span class="flex items-center gap-1.5 text-sm">
                      <i class="fa-solid fa-book-open text-base-content/40 fa-sm"></i>
                      {{ c.lessonCount }} bài
                    </span>
                  </td>
                  <td>
                    <span class="text-sm text-base-content/60">{{ c.teacherName || '—' }}</span>
                  </td>
                  <td>
                    @if (c.status === 'Published') {
                      <span class="badge badge-success badge-sm gap-1">
                        <i class="fa-solid fa-circle-check fa-xs"></i> Đang dùng
                      </span>
                    } @else if (c.status === 'Archived') {
                      <span class="badge badge-error badge-soft badge-sm gap-1">
                        <i class="fa-solid fa-box-archive fa-xs"></i> Lưu trữ
                      </span>
                    } @else {
                      <span class="badge badge-ghost badge-sm">Bản nháp</span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-0.5">
                      <button (click)="openLessons(c)" title="Xem bài học"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-info">
                        <i class="fa-solid fa-list-ul"></i>
                      </button>
                      <button (click)="edit(c)" title="Sửa giáo trình"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content">
                        <i class="fa-solid fa-pencil"></i>
                      </button>
                      <button (click)="del(c)" title="Xoá giáo trình"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (!items.length) {
            <div class="py-16 text-center">
              <i class="fa-solid fa-book-open text-4xl text-base-content/15"></i>
              <p class="text-sm text-base-content/40 mt-3">Chưa có giáo trình nào.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`]
})
export class CurriculumsComponent implements OnInit {
  items: Curriculum[] = [];
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);
  private router = inject(Router);

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('/api/curriculums').subscribe({
      next: (res) => { if (res.success) this.items = res.data.items; },
      error: (e) => this.toast.error(e.error?.error ?? 'Không tải được')
    });
  }

  async add() {
    const teachers = await this.loadTeachers();
    const r = await this.modal.form({
      title: 'Tạo giáo trình mới', confirmText: 'Tạo',
      fields: [
        { key: 'code', label: 'Mã giáo trình', placeholder: 'VD: GT-HSK2' },
        { key: 'nameVi', label: 'Tên tiếng Việt', placeholder: 'VD: Tiếng Trung sơ cấp 2' },
        { key: 'nameZh', label: 'Tên tiếng Trung', placeholder: 'VD: 汉语教程 第二册' },
        { key: 'level', label: 'Cấp độ', type: 'select', options: ['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6'].map((x) => [x, x] as [string, string]) },
        { key: 'description', label: 'Mô tả', type: 'textarea', placeholder: 'Mô tả ngắn về giáo trình…' },
        { key: 'coverEmoji', label: 'Ảnh bìa (emoji)', type: 'select', options: EMOJI_OPTIONS },
        { key: 'coverColor', label: 'Màu chủ đề', type: 'select', options: COLOR_OPTIONS },
        { key: 'teacherId', label: 'Giáo viên phụ trách', type: 'select', options: teachers },
        { key: 'status', label: 'Trạng thái', type: 'select', options: STATUS_OPTIONS }
      ]
    });
    if (!r) return;
    this.http.post<any>('/api/curriculums', this.toBody(r)).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã tạo giáo trình.'); this.load(); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  private toBody(r: Record<string, string>) {
    return {
      code: r['code'], nameVi: r['nameVi'], nameZh: r['nameZh'], level: r['level'],
      description: r['description'] || null,
      coverEmoji: r['coverEmoji'] || null,
      coverColor: r['coverColor'] || null,
      teacherId: r['teacherId'] || null,
      status: r['status'] || null
    };
  }

  private async loadTeachers(): Promise<[string, string][]> {
    const res = await this.http.get<any>('/api/users?role=Teacher').toPromise();
    const list: [string, string][] = (res?.data ?? []).map((t: any) => [t.id, t.fullName] as [string, string]);
    return [['', '— chưa gán —'], ...list];
  }

  async edit(c: Curriculum) {
    const teachers = await this.loadTeachers();
    const teacherId = await this.currentTeacherId(c.id);
    const r = await this.modal.form({
      title: `Sửa — ${c.nameVi}`, confirmText: 'Lưu',
      fields: [
        { key: 'code', label: 'Mã giáo trình', value: c.code },
        { key: 'nameVi', label: 'Tên tiếng Việt', value: c.nameVi },
        { key: 'nameZh', label: 'Tên tiếng Trung', value: c.nameZh },
        { key: 'level', label: 'Cấp độ', type: 'select', value: c.level, options: ['HSK1','HSK2','HSK3','HSK4','HSK5','HSK6'].map((x) => [x, x] as [string, string]) },
        { key: 'description', label: 'Mô tả', type: 'textarea', value: c.description ?? '' },
        { key: 'coverEmoji', label: 'Ảnh bìa (emoji)', type: 'select', value: c.coverEmoji ?? '📕', options: EMOJI_OPTIONS },
        { key: 'coverColor', label: 'Màu chủ đề', type: 'select', value: c.coverColor ?? '#dc2626', options: COLOR_OPTIONS },
        { key: 'teacherId', label: 'Giáo viên phụ trách', type: 'select', value: teacherId, options: teachers },
        { key: 'status', label: 'Trạng thái', type: 'select', value: c.status, options: STATUS_OPTIONS }
      ]
    });
    if (!r) return;
    this.http.put<any>(`/api/curriculums/${c.id}`, this.toBody(r)).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã cập nhật.'); this.load(); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  /** Lấy teacherId hiện tại từ detail (list DTO không trả TeacherId). */
  private async currentTeacherId(id: string): Promise<string> {
    const res = await this.http.get<any>(`/api/curriculums/${id}`).toPromise();
    return res?.data?.teacherId ?? '';
  }

  async del(c: Curriculum) {
    if (!(await this.modal.confirm(`Xoá giáo trình <b>${c.nameVi}</b>? Dữ liệu còn trong DB, khôi phục được.`, 'Xoá', true))) return;
    this.http.delete<any>(`/api/curriculums/${c.id}`).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã xoá.'); this.load(); } else this.toast.error(res.error!); }
    });
  }

  openLessons(c: Curriculum) { this.router.navigate(['/curriculums', c.id, 'lessons']); }
}

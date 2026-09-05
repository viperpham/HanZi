import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';

interface LessonBrief { id: string; orderNo: number; titleVi: string; titleZh: string; status: string; vocabCount: number; }

@Component({
  selector: 'app-lessons',
  standalone: true,
  template: `
    <div class="space-y-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Bài học</h1>
          <p class="text-sm text-base-content/50 mt-0.5">{{ items.length }} bài học trong giáo trình</p>
        </div>
        <button (click)="add()" class="btn btn-error btn-sm text-white gap-2">
          <i class="fa-solid fa-plus"></i> Thêm bài học
        </button>
      </div>

      <div class="space-y-3">
        @for (l of items; track l.id) {
          <div class="card bg-base-100 border border-base-200 shadow-sm hover:shadow-md transition-shadow">
            <div class="card-body p-4 flex-row flex-wrap items-center gap-4">
              <div class="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center shrink-0 font-extrabold text-error">
                {{ l.orderNo }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="hanzi font-bold text-base-content truncate text-lg">{{ l.titleZh }} · {{ l.titleVi }}</p>
                <p class="text-sm text-base-content/50 mt-0.5">
                  <i class="fa-solid fa-book fa-xs mr-1"></i>{{ l.vocabCount }} từ mới
                  &nbsp;&middot;&nbsp;
                  @if (l.status === 'Published') {
                    <span class="text-success font-medium">Đã xuất bản</span>
                  } @else {
                    <span class="text-base-content/40">Nháp</span>
                  }
                </p>
              </div>
              <div class="flex items-center gap-1">
                <button (click)="open(l)" class="btn btn-outline btn-sm gap-2">
                  <i class="fa-solid fa-list-ul"></i> Xem nội dung
                </button>
                <button (click)="del(l)" title="Xoá bài học"
                  class="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-error">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      @if (!items.length) {
        <div class="card bg-base-100 border border-base-200 shadow-sm">
          <div class="card-body p-12 items-center text-center">
            <i class="fa-solid fa-book-open text-4xl text-base-content/15 mb-3"></i>
            <p class="text-sm text-base-content/40">Chưa có bài học nào.</p>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`.hanzi { font-family: "Noto Sans SC", sans-serif; }`]
})
export class LessonsComponent implements OnInit {
  items: LessonBrief[] = [];
  curriculumId = '';
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private toast = inject(ToastService);
  private modal = inject(ModalService);
  private router = inject(Router);

  ngOnInit() {
    this.curriculumId = this.route.snapshot.paramMap.get('id') ?? '';
    this.load();
  }

  load() {
    this.http.get<any>(`/api/lessons?curriculumId=${this.curriculumId}`).subscribe({
      next: (res) => { if (res.success) this.items = res.data; }
    });
  }

  async add() {
    const r = await this.modal.form({
      title: 'Thêm bài học', confirmText: 'Tạo bài',
      fields: [
        { key: 'orderNo', label: 'Số thứ tự', value: String(this.items.length + 1) },
        { key: 'titleVi', label: 'Tên bài (tiếng Việt)', placeholder: 'VD: Bài 3: Hỏi tuổi' },
        { key: 'titleZh', label: 'Tên bài (chữ Hán)', placeholder: 'VD: 你多大' },
        { key: 'description', label: 'Mô tả', type: 'textarea' }
      ]
    });
    if (!r) return;
    this.http.post<any>('/api/lessons', {
      curriculumId: this.curriculumId, orderNo: Number(r['orderNo']) || 1,
      titleVi: r['titleVi'], titleZh: r['titleZh'] || r['titleVi'], description: r['description']
    }).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã tạo bài học.'); this.load(); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  async del(l: LessonBrief) {
    if (!(await this.modal.confirm(`Xoá bài <b>${l.titleVi}</b>?`, 'Xoá', true))) return;
    this.http.delete<any>(`/api/lessons/${l.id}`).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã xoá.'); this.load(); } else this.toast.error(res.error!); }
    });
  }

  open(l: LessonBrief) { this.router.navigate(['/lessons', l.id]); }
}

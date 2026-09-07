import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService, FileAsset } from '../file.service';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';

/** Định dạng tệp chấp nhận tải lên. */
const ACCEPT_ALL = '.jpg,.jpeg,.jfif,.png,.webp,.gif,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar';

@Component({
  selector: 'app-files',
  standalone: true,
  template: `
    <div class="space-y-6">

      <!-- Tiêu đề trang & Thao tác chính -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl sm:text-2xl font-black text-base-content flex items-center gap-3">
            <span class="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shadow-xs border border-primary/20">
              <i class="fa-solid fa-folder-tree"></i>
            </span>
            Kho tài liệu & Quản lý tệp
          </h1>
          <p class="text-xs sm:text-sm text-base-content/50 mt-1">
            Quản lý tập trung các tài liệu học tập, giáo trình, bài tập, slide bài giảng và hình ảnh
          </p>
        </div>

        <div class="flex items-center gap-2.5">
          <label class="btn btn-primary btn-sm rounded-xl text-white shadow-md shadow-primary/20 gap-2 px-4 font-semibold cursor-pointer"
                 [class.pointer-events-none]="uploading()">
            <input type="file" class="hidden" [attr.accept]="ACCEPT_ALL" multiple (change)="onFilesChosen($event)" />
            @if (!uploading()) {
              <i class="fa-solid fa-cloud-arrow-up"></i>
              <span>Tải lên tệp mới</span>
            } @else {
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>Đang tải ({{ progress() }}%)…</span>
            }
          </label>
        </div>
      </div>

      <!-- Thẻ Thống kê kho tài liệu -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div class="card bg-base-100 border border-base-200 shadow-sm p-4 sm:p-5 rounded-2xl flex flex-row items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-folder-open"></i>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-base-content/50 uppercase tracking-wider">Tổng số tệp</p>
            <p class="text-xl sm:text-2xl font-black text-base-content mt-0.5">{{ items().length }}</p>
          </div>
        </div>

        <div class="card bg-base-100 border border-base-200 shadow-sm p-4 sm:p-5 rounded-2xl flex flex-row items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-image"></i>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-base-content/50 uppercase tracking-wider">Hình ảnh</p>
            <p class="text-xl sm:text-2xl font-black text-base-content mt-0.5">{{ imageCount() }}</p>
          </div>
        </div>

        <div class="card bg-base-100 border border-base-200 shadow-sm p-4 sm:p-5 rounded-2xl flex flex-row items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-file-pdf"></i>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-base-content/50 uppercase tracking-wider">Tài liệu văn bản</p>
            <p class="text-xl sm:text-2xl font-black text-base-content mt-0.5">{{ docCount() }}</p>
          </div>
        </div>

        <div class="card bg-base-100 border border-base-200 shadow-sm p-4 sm:p-5 rounded-2xl flex flex-row items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl shrink-0">
            <i class="fa-solid fa-hard-drive"></i>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-base-content/50 uppercase tracking-wider">Dung lượng sử dụng</p>
            <p class="text-lg sm:text-xl font-black text-base-content mt-0.5">{{ totalSize() }}</p>
          </div>
        </div>
      </div>

      <!-- Khu vực Kéo thả Upload nhanh -->
      <div class="card bg-base-100 border-2 border-dashed border-primary/25 hover:border-primary/60 hover:bg-primary/5 transition-all rounded-3xl p-6 text-center cursor-pointer relative"
           [class.pointer-events-none]="uploading()">
        <input type="file" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
               [attr.accept]="ACCEPT_ALL" multiple (change)="onFilesChosen($event)" />
        <div class="flex flex-col items-center justify-center py-2">
          <div class="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-2xl mb-2">
            <i class="fa-solid fa-cloud-arrow-up"></i>
          </div>
          <p class="text-sm font-bold text-base-content">Kéo thả tệp bất kỳ vào đây để tải nhanh lên kho tài liệu</p>
          <p class="text-xs text-base-content/40 mt-1">Ảnh (JPG, PNG, WebP ≤ 10MB) · Tài liệu (PDF, Word, Excel, PowerPoint, Zip ≤ 25MB)</p>
          @if (uploading()) {
            <div class="w-full max-w-xs mt-3">
              <div class="w-full bg-base-200 rounded-full h-2 overflow-hidden">
                <div class="bg-primary h-2 rounded-full transition-all" [style.width.%]="progress()"></div>
              </div>
              <p class="text-xs font-semibold text-primary mt-1">Đang tải {{ progress() }}%</p>
            </div>
          }
        </div>
      </div>

      <!-- Thanh Tìm kiếm, Bộ lọc & Tuỳ chọn chế độ xem -->
      <div class="card bg-base-100 border border-base-200 shadow-sm rounded-2xl p-4 sm:p-5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <!-- Ô tìm kiếm -->
          <div class="relative w-full sm:w-72">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-base-content/40"></i>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Tìm tệp theo tên…"
              class="input input-bordered input-sm rounded-xl pl-9 pr-3 text-xs w-full focus:border-primary" />
          </div>

          <!-- Bộ lọc loại tệp -->
          <div class="flex flex-wrap items-center gap-1.5 grow sm:grow-0">
            <button (click)="kindFilter = 'all'"
              class="btn btn-xs rounded-xl font-semibold border"
              [class]="kindFilter === 'all' ? 'btn-primary text-white' : 'btn-ghost text-base-content/60'">
              Tất cả ({{ items().length }})
            </button>
            <button (click)="kindFilter = 'Image'"
              class="btn btn-xs rounded-xl font-semibold border"
              [class]="kindFilter === 'Image' ? 'btn-primary text-white' : 'btn-ghost text-base-content/60'">
              🖼️ Ảnh ({{ imageCount() }})
            </button>
            <button (click)="kindFilter = 'Document'"
              class="btn btn-xs rounded-xl font-semibold border"
              [class]="kindFilter === 'Document' ? 'btn-primary text-white' : 'btn-ghost text-base-content/60'">
              📄 Tài liệu ({{ docCount() }})
            </button>
            <button (click)="kindFilter = 'Other'"
              class="btn btn-xs rounded-xl font-semibold border"
              [class]="kindFilter === 'Other' ? 'btn-primary text-white' : 'btn-ghost text-base-content/60'">
              📦 Khác
            </button>
          </div>

          <!-- Chế độ xem Lưới / Danh sách -->
          <div class="join bg-base-200/60 p-0.5 rounded-xl border border-base-200 ml-auto">
            <button (click)="viewMode = 'grid'" class="join-item btn btn-xs btn-square"
              [class]="viewMode === 'grid' ? 'btn-primary text-white' : 'btn-ghost text-base-content/50'"
              title="Xem dạng thẻ lưới">
              <i class="fa-solid fa-grip"></i>
            </button>
            <button (click)="viewMode = 'list'" class="join-item btn btn-xs btn-square"
              [class]="viewMode === 'list' ? 'btn-primary text-white' : 'btn-ghost text-base-content/50'"
              title="Xem dạng danh sách">
              <i class="fa-solid fa-list"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Danh sách tệp -->
      @if (loading()) {
        <div class="py-20 text-center">
          <i class="fa-solid fa-spinner fa-spin text-3xl text-primary"></i>
          <p class="text-sm font-semibold text-base-content/50 mt-3">Đang tải danh sách tài liệu…</p>
        </div>
      } @else if (filteredItems().length === 0) {
        <div class="card bg-base-100 border border-base-200 rounded-3xl p-16 text-center shadow-xs">
          <div class="w-16 h-16 mx-auto rounded-3xl bg-base-200/80 text-base-content/30 flex items-center justify-center text-3xl mb-3">
            <i class="fa-regular fa-folder-open"></i>
          </div>
          <p class="text-base font-bold text-base-content/70">
            {{ items().length === 0 ? 'Kho tài liệu chưa có tệp nào' : 'Không tìm thấy tệp nào phù hợp' }}
          </p>
          <p class="text-xs text-base-content/40 mt-1 max-w-sm mx-auto">
            {{ items().length === 0 ? 'Hãy kéo thả hoặc bấm nút "Tải lên tệp mới" phía trên để đưa tài liệu vào hệ thống.' : 'Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc bấm Tất cả để xem lại toàn bộ kho tệp.' }}
          </p>
        </div>
      } @else {
        <!-- Dạng Lưới (Grid View) -->
        @if (viewMode === 'grid') {
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            @for (f of filteredItems(); track f.id) {
              <div class="card bg-base-100 rounded-2xl border border-base-200 hover:border-primary/40 hover:shadow-lg transition-all overflow-hidden group">
                <!-- Khung Preview -->
                <div class="h-36 w-full bg-base-200/50 relative flex items-center justify-center overflow-hidden">
                  @if (f.kind === 'Image') {
                    <img [src]="FileService.viewUrl(f)" [alt]="f.fileName"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  } @else {
                    <div class="flex flex-col items-center gap-2 p-2 text-center">
                      <i [class]="'fa-solid ' + fileMeta(f).icon + ' text-4xl ' + fileMeta(f).color"></i>
                      <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-base-200 text-base-content/60">
                        {{ fileMeta(f).label }}
                      </span>
                    </div>
                  }

                  <!-- Nút thao tác khi hover -->
                  <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <a [href]="FileService.viewUrl(f)" target="_blank" rel="noopener"
                      class="btn btn-circle btn-sm bg-white/90 hover:bg-white text-base-content shadow-md"
                      title="Xem tệp gốc / Tải xuống">
                      <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                    </a>
                    <button type="button" (click)="remove(f)"
                      class="btn btn-circle btn-sm bg-white/90 hover:bg-white text-error shadow-md"
                      title="Xoá tệp">
                      <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                  </div>
                </div>

                <!-- Thông tin tệp -->
                <div class="p-3 space-y-1">
                  <p class="text-xs font-bold text-base-content truncate" [title]="f.fileName">
                    {{ f.fileName }}
                  </p>
                  <div class="flex items-center justify-between text-[11px] text-base-content/40">
                    <span class="font-mono">{{ FileService.humanSize(f.sizeBytes) }}</span>
                    <span>{{ f.createdAt | date:'dd/MM/yyyy' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>
        } @else {
          <!-- Dạng Danh sách (List View) -->
          <div class="card bg-base-100 rounded-2xl border border-base-200 overflow-hidden shadow-sm">
            <div class="overflow-x-auto">
              <table class="table table-sm w-full">
                <thead>
                  <tr class="text-xs uppercase text-base-content/50 bg-base-200/40">
                    <th>Tên tệp</th>
                    <th>Định dạng</th>
                    <th>Dung lượng</th>
                    <th>Ngày tải lên</th>
                    <th class="text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  @for (f of filteredItems(); track f.id) {
                    <tr class="hover:bg-base-200/40 transition-colors">
                      <td>
                        <div class="flex items-center gap-3">
                          @if (f.kind === 'Image') {
                            <img [src]="FileService.viewUrl(f)" class="w-10 h-10 rounded-xl object-cover border border-base-200 shrink-0" alt="" />
                          } @else {
                            <div class="w-10 h-10 rounded-xl bg-base-200 flex items-center justify-center shrink-0">
                              <i [class]="'fa-solid ' + fileMeta(f).icon + ' text-lg ' + fileMeta(f).color"></i>
                            </div>
                          }
                          <span class="font-semibold text-sm text-base-content truncate max-w-sm sm:max-w-md">
                            {{ f.fileName }}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span class="badge badge-sm badge-ghost font-mono text-xs">
                          {{ fileMeta(f).label }}
                        </span>
                      </td>
                      <td class="text-xs text-base-content/70 font-mono">{{ FileService.humanSize(f.sizeBytes) }}</td>
                      <td class="text-xs text-base-content/50">{{ f.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                      <td class="text-right whitespace-nowrap">
                        <a [href]="FileService.viewUrl(f)" target="_blank" rel="noopener"
                          class="btn btn-ghost btn-xs btn-square text-base-content/60 hover:text-primary mr-1"
                          title="Xem tệp gốc / Tải xuống">
                          <i class="fa-solid fa-arrow-up-right-from-square"></i>
                        </a>
                        <button type="button" (click)="remove(f)"
                          class="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10"
                          title="Xoá tệp">
                          <i class="fa-solid fa-trash-can"></i>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }
      }

    </div>
  `,
  imports: [DatePipe, FormsModule]
})
export class FilesComponent implements OnInit {
  ACCEPT_ALL = ACCEPT_ALL;
  FileService = FileService;

  private files = inject(FileService);
  private toast = inject(ToastService);
  private modal = inject(ModalService);

  items = signal<FileAsset[]>([]);
  loading = signal(false);
  uploading = signal(false);
  progress = signal(0);

  searchQuery = '';
  kindFilter = 'all';
  viewMode: 'grid' | 'list' = 'grid';

  imageCount = computed(() => this.items().filter(f => f.kind === 'Image').length);
  docCount = computed(() => this.items().filter(f => f.kind === 'Document').length);
  totalSize = computed(() => {
    const totalBytes = this.items().reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
    return FileService.humanSize(totalBytes);
  });

  filteredItems = computed(() => {
    let list = this.items();
    if (this.kindFilter !== 'all') {
      list = list.filter(f => f.kind === this.kindFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(f => f.fileName.toLowerCase().includes(q));
    }
    return list;
  });

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      this.items.set(await this.files.mine());
    } finally {
      this.loading.set(false);
    }
  }

  fileMeta(f: FileAsset): { icon: string; color: string; label: string } {
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

  async onFilesChosen(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const list = Array.from(input.files ?? []);
    if (!list.length) return;

    this.uploading.set(true);
    this.progress.set(0);
    const uploadedAssets: FileAsset[] = [];
    const errors: string[] = [];

    for (const f of list) {
      const res = await this.files.upload(f, (p) => this.progress.set(p));
      if (res.ok && res.asset) {
        uploadedAssets.push(res.asset);
      } else {
        errors.push(`${f.name}: ${res.error}`);
      }
      this.progress.set(0);
    }

    this.uploading.set(false);
    input.value = '';

    if (uploadedAssets.length) {
      this.items.update(xs => [...uploadedAssets, ...xs]);
      this.toast.success(`Đã tải lên ${uploadedAssets.length} tệp thành công.`);
    }
    if (errors.length) {
      this.toast.error(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} tệp lỗi)` : ''));
    }
  }

  async remove(f: FileAsset) {
    if (!(await this.modal.confirm(`Xoá vĩnh viễn tệp <b>${f.fileName}</b> khỏi kho tài liệu?`, 'Xoá tệp', true))) return;
    if (await this.files.remove(f.id)) {
      this.items.update(xs => xs.filter(x => x.id !== f.id));
      this.toast.success('Đã xoá tệp thành công.');
    } else {
      this.toast.error('Xoá tệp thất bại.');
    }
  }
}

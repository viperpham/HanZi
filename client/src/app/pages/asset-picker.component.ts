import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssetPickerService } from '../asset-picker.service';
import { FileService, FileAsset } from '../file.service';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';

/** Định dạng tệp chấp nhận theo tuỳ chọn accept của picker. */
const ACCEPT_MAP: Record<string, string> = {
  image: '.jpg,.jpeg,.jfif,.png,.webp,.gif,.bmp',
  doc: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar',
  any: '.jpg,.jpeg,.jfif,.png,.webp,.gif,.bmp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar',
};

/** Giới hạn dung lượng (byte) theo phần mở rộng — chặn ngay phía trình duyệt. */
const SIZE_LIMITS: { exts: string[]; max: number; label: string }[] = [
  { exts: ['.jpg', '.jpeg', '.jfif', '.png', '.webp', '.gif', '.bmp'], max: 10 * 1024 * 1024, label: 'ảnh (≤ 10MB)' },
  { exts: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar'], max: 25 * 1024 * 1024, label: 'tài liệu (≤ 25MB)' },
];

function precheckSize(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const rule = SIZE_LIMITS.find((r) => r.exts.includes(ext));
  if (!rule) return `${file.name}: định dạng không hỗ trợ`;
  if (file.size > rule.max) {
    return `${file.name}: quá lớn (${FileService.humanSize(file.size)}) — giới hạn ${rule.label}`;
  }
  return null;
}

/** Modal "Thư viện tài liệu & Quản lý tệp" — Không gian rộng rãi, hỗ trợ tìm kiếm, lọc tệp, xem lưới & danh sách. */
@Component({
  selector: 'asset-picker',
  standalone: true,
  template: `
    @if (picker.state(); as st) {
      <div class="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
           (click)="picker.close(null)">
        <div class="card bg-base-100 w-full max-w-5xl max-h-[90vh] flex flex-col rounded-3xl shadow-2xl border border-base-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
             (click)="$event.stopPropagation()">

          <!-- Header -->
          <div class="bg-gradient-to-r from-primary/10 via-base-100 to-indigo-500/10 px-6 py-4.5 border-b border-base-200 flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center text-lg shadow-sm border border-primary/25">
                <i class="fa-solid fa-folder-open"></i>
              </div>
              <div>
                <h3 class="font-extrabold text-base sm:text-lg text-base-content flex items-center gap-2">
                  {{ title() }}
                  <span class="badge badge-primary badge-outline text-xs font-semibold px-2">
                    {{ multiple() ? 'Chọn nhiều tệp' : 'Chọn 1 tệp' }}
                  </span>
                </h3>
                <p class="text-xs text-base-content/50">Tải lên tệp mới hoặc chọn từ kho tài liệu đã lưu</p>
              </div>
            </div>
            <button (click)="picker.close(null)" class="btn btn-ghost btn-sm btn-circle rounded-xl" title="Đóng">
              <i class="fa-solid fa-xmark text-base"></i>
            </button>
          </div>

          <!-- Thanh Tabs & Công cụ -->
          <div class="px-6 pt-4 pb-3 border-b border-base-200/80 bg-base-50/50 flex flex-wrap items-center justify-between gap-3">
            <!-- Tabs -->
            <div class="join bg-base-200/80 p-1 rounded-2xl">
              <button (click)="setTab('library')"
                class="join-item btn btn-sm rounded-xl border-0 transition-all font-semibold"
                [class]="tab() === 'library' ? 'bg-base-100 text-primary shadow-sm' : 'btn-ghost text-base-content/60'">
                <i class="fa-solid fa-folder-tree mr-1"></i> Kho tài liệu ({{ library().length }})
              </button>
              <button (click)="setTab('upload')"
                class="join-item btn btn-sm rounded-xl border-0 transition-all font-semibold"
                [class]="tab() === 'upload' ? 'bg-base-100 text-primary shadow-sm' : 'btn-ghost text-base-content/60'">
                <i class="fa-solid fa-cloud-arrow-up mr-1"></i> Tải lên mới
              </button>
            </div>

            <!-- Toolbar (khi ở tab Thư viện) -->
            @if (tab() === 'library') {
              <div class="flex flex-wrap items-center gap-2 grow sm:grow-0 justify-end">
                <!-- Ô tìm kiếm -->
                <div class="relative w-full sm:w-56">
                  <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-base-content/40"></i>
                  <input type="text" [(ngModel)]="searchQuery" placeholder="Tìm kiếm tên tệp…"
                    class="input input-bordered input-sm rounded-xl pl-8 pr-3 text-xs w-full focus:border-primary" />
                </div>

                <!-- Lọc loại tệp -->
                <select [(ngModel)]="kindFilter" class="select select-bordered select-sm rounded-xl text-xs focus:border-primary font-medium">
                  <option value="all">📂 Tất cả định dạng</option>
                  <option value="Image">🖼️ Hình ảnh</option>
                  <option value="Document">📄 Tài liệu (PDF/Doc/Excel)</option>
                  <option value="Other">📦 Khác</option>
                </select>

                <!-- Chuyển chế độ xem Lưới / Bảng -->
                <div class="join bg-base-200/60 p-0.5 rounded-xl border border-base-200">
                  <button (click)="viewMode.set('grid')" class="join-item btn btn-xs btn-square"
                    [class]="viewMode() === 'grid' ? 'btn-primary text-white' : 'btn-ghost text-base-content/50'"
                    title="Chế độ lưới">
                    <i class="fa-solid fa-grip"></i>
                  </button>
                  <button (click)="viewMode.set('list')" class="join-item btn btn-xs btn-square"
                    [class]="viewMode() === 'list' ? 'btn-primary text-white' : 'btn-ghost text-base-content/50'"
                    title="Chế độ danh sách">
                    <i class="fa-solid fa-list"></i>
                  </button>
                </div>
              </div>
            }
          </div>

          <!-- Nội dung Modal -->
          <div class="p-6 overflow-y-auto min-h-[380px] max-h-[58vh] flex-1">
            @if (tab() === 'upload') {
              <!-- Khu vực Upload tệp rộng rãi -->
              <div class="max-w-2xl mx-auto space-y-4 py-4">
                <label class="block border-2 border-dashed border-primary/35 rounded-3xl p-10 sm:p-14 text-center cursor-pointer
                              hover:border-primary hover:bg-primary/5 transition-all group bg-base-200/20 shadow-xs"
                       [class.pointer-events-none]="uploading()">
                  <input type="file" class="hidden" [attr.accept]="acceptFilter()"
                         [attr.multiple]="multiple() ? '' : null" (change)="onFilesChosen($event)" />

                  @if (!uploading()) {
                    <div class="w-16 h-16 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-xs">
                      <i class="fa-solid fa-cloud-arrow-up"></i>
                    </div>
                    <p class="text-base font-bold text-base-content mt-4">Kéo thả tệp vào đây hoặc <span class="text-primary underline">bấm để chọn</span></p>
                    <p class="text-xs text-base-content/50 mt-1.5">
                      Hỗ trợ tải nhiều tệp cùng lúc · Ảnh ≤ 10MB · Tài liệu văn bản ≤ 25MB
                    </p>
                  } @else {
                    <div class="max-w-md mx-auto py-4">
                      <i class="fa-solid fa-spinner fa-spin text-4xl text-primary mb-3"></i>
                      <p class="text-sm font-bold text-base-content">Đang tải tệp lên máy chủ…</p>
                      <div class="w-full bg-base-200 rounded-full h-3 mt-4 overflow-hidden shadow-inner">
                        <div class="bg-gradient-to-r from-primary to-indigo-600 h-3 rounded-full transition-all duration-200" [style.width.%]="progress()"></div>
                      </div>
                      <p class="text-xs font-semibold text-primary mt-2">{{ progress() }}%</p>
                    </div>
                  }
                </label>

                @if (uploaded().length) {
                  <div class="rounded-2xl bg-success/10 border border-success/30 p-4 space-y-2">
                    <div class="flex items-center justify-between text-xs font-bold text-success">
                      <span><i class="fa-solid fa-circle-check mr-1"></i> Đã tải lên {{ uploaded().length }} tệp thành công</span>
                      <button (click)="setTab('library')" class="btn btn-ghost btn-xs text-success hover:bg-success/20">
                        Xem trong kho tệp →
                      </button>
                    </div>
                    <div class="flex flex-wrap gap-2 pt-1">
                      @for (u of uploaded(); track u.id) {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-base-100 border border-success/30 text-base-content/80">
                          <i class="fa-solid fa-file-check text-success"></i> {{ u.fileName }}
                        </span>
                      }
                    </div>
                  </div>
                }

                <div class="flex items-center justify-center gap-6 text-xs text-base-content/40 pt-2">
                  <span class="flex items-center gap-1.5"><i class="fa-solid fa-shield-halved text-success"></i> Lưu trữ an toàn</span>
                  <span class="flex items-center gap-1.5"><i class="fa-solid fa-bolt text-warning"></i> Sẵn sàng sử dụng ngay</span>
                  <span class="flex items-center gap-1.5"><i class="fa-solid fa-rotate-left text-info"></i> Tái sử dụng mọi nơi</span>
                </div>
              </div>
            } @else {
              <!-- Tab Thư viện (Library) -->
              @if (loading()) {
                <div class="py-20 text-center">
                  <i class="fa-solid fa-spinner fa-spin text-3xl text-primary"></i>
                  <p class="text-sm font-semibold text-base-content/50 mt-3">Đang tải kho tài liệu…</p>
                </div>
              } @else if (filteredLibrary().length === 0) {
                <div class="py-16 text-center max-w-sm mx-auto">
                  <div class="w-16 h-16 mx-auto rounded-3xl bg-base-200/80 text-base-content/30 flex items-center justify-center text-3xl mb-3">
                    <i class="fa-regular fa-folder-open"></i>
                  </div>
                  <p class="text-base font-bold text-base-content/70">
                    {{ library().length === 0 ? 'Kho tài liệu hiện đang trống' : 'Không tìm thấy tệp phù hợp' }}
                  </p>
                  <p class="text-xs text-base-content/40 mt-1">
                    {{ library().length === 0 ? 'Hãy chuyển sang tab Tải lên để thêm tệp mới vào kho lưu trữ.' : 'Thử đổi từ khoá tìm kiếm hoặc chọn tất cả định dạng.' }}
                  </p>
                  @if (library().length === 0) {
                    <button (click)="setTab('upload')" class="btn btn-primary btn-sm rounded-xl text-white gap-2 mt-4 shadow-sm">
                      <i class="fa-solid fa-cloud-arrow-up"></i> Tải tệp ngay
                    </button>
                  }
                </div>
              } @else {
                <!-- Hiển thị Dạng Lưới (Grid View) -->
                @if (viewMode() === 'grid') {
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                    @for (f of filteredLibrary(); track f.id) {
                      <div (click)="toggle(f)"
                        class="card bg-base-100 rounded-2xl border transition-all cursor-pointer relative group overflow-hidden select-none"
                        [class]="isSelected(f)
                          ? 'border-primary ring-2 ring-primary/30 shadow-md bg-primary/5'
                          : 'border-base-200 hover:border-primary/40 hover:shadow-md'">

                        <!-- Khung hình ảnh preview / icon tài liệu -->
                        <div class="h-32 w-full bg-base-200/40 relative flex items-center justify-center overflow-hidden">
                          @if (f.kind === 'Image') {
                            <img [src]="FileService.viewUrl(f)" [alt]="f.fileName"
                              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          } @else {
                            <div class="flex flex-col items-center gap-1.5 p-2 text-center">
                              <i [class]="'fa-solid ' + FileService.fileMeta(f).icon + ' text-4xl ' + FileService.fileMeta(f).color"></i>
                              <span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-base-200 text-base-content/60">
                                {{ FileService.fileMeta(f).label }}
                              </span>
                            </div>
                          }

                          <!-- Nút checkbox tròn chọn tệp (góc trên trái) -->
                          <div class="absolute top-2 left-2 z-10">
                            <div class="w-6 h-6 rounded-lg flex items-center justify-center border transition-all text-xs font-bold"
                              [class]="isSelected(f)
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-base-100/90 border-base-300 text-transparent group-hover:text-base-content/30'">
                              <i class="fa-solid fa-check"></i>
                            </div>
                          </div>

                          <!-- Action buttons (góc trên phải) -->
                          <div class="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a [href]="FileService.viewUrl(f)" target="_blank" rel="noopener"
                              (click)="$event.stopPropagation()"
                              class="btn btn-ghost btn-xs btn-square bg-base-100/90 rounded-lg text-base-content/60 hover:text-primary shadow-xs"
                              title="Xem tệp gốc / Tải xuống">
                              <i class="fa-solid fa-up-right-from-square fa-xs"></i>
                            </a>
                            <button type="button" (click)="remove($event, f)"
                              class="btn btn-ghost btn-xs btn-square bg-base-100/90 rounded-lg text-error hover:bg-error/15 shadow-xs"
                              title="Xoá khỏi thư viện">
                              <i class="fa-solid fa-trash-can fa-xs"></i>
                            </button>
                          </div>
                        </div>

                        <!-- Thông tin tệp -->
                        <div class="p-2.5 space-y-1">
                          <p class="text-xs font-bold text-base-content truncate" [title]="f.fileName">
                            {{ f.fileName }}
                          </p>
                          <div class="flex items-center justify-between text-[11px] text-base-content/40">
                            <span>{{ FileService.humanSize(f.sizeBytes) }}</span>
                            <span>{{ f.createdAt | date:'dd/MM' }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <!-- Hiển thị Dạng Danh sách (List View) -->
                  <div class="overflow-x-auto rounded-2xl border border-base-200">
                    <table class="table table-sm w-full">
                      <thead>
                        <tr class="text-xs uppercase text-base-content/50 bg-base-200/40">
                          <th class="w-10"></th>
                          <th>Tên tệp</th>
                          <th>Định dạng</th>
                          <th>Dung lượng</th>
                          <th>Thời gian tải</th>
                          <th class="text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (f of filteredLibrary(); track f.id) {
                          <tr (click)="toggle(f)"
                            [class]="isSelected(f) ? 'cursor-pointer transition-colors bg-primary/10' : 'cursor-pointer transition-colors hover:bg-base-200/50'">
                            <td>
                              <div class="w-5 h-5 rounded-md flex items-center justify-center border transition-all text-xs"
                                [class]="isSelected(f) ? 'bg-primary text-white border-primary' : 'bg-base-100 border-base-300'">
                                @if (isSelected(f)) { <i class="fa-solid fa-check fa-xs"></i> }
                              </div>
                            </td>
                            <td>
                              <div class="flex items-center gap-3">
                                @if (f.kind === 'Image') {
                                  <img [src]="FileService.viewUrl(f)" class="w-9 h-9 rounded-lg object-cover border border-base-200 shrink-0" alt="" />
                                } @else {
                                  <div class="w-9 h-9 rounded-lg bg-base-200 flex items-center justify-center shrink-0">
                                    <i [class]="'fa-solid ' + FileService.fileMeta(f).icon + ' ' + FileService.fileMeta(f).color"></i>
                                  </div>
                                }
                                <span class="font-semibold text-xs sm:text-sm text-base-content truncate max-w-xs sm:max-w-md">
                                  {{ f.fileName }}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span class="badge badge-sm badge-ghost font-mono text-[11px]">
                                {{ FileService.fileMeta(f).label }}
                              </span>
                            </td>
                            <td class="text-xs text-base-content/60 font-mono">{{ FileService.humanSize(f.sizeBytes) }}</td>
                            <td class="text-xs text-base-content/40">{{ f.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                            <td class="text-right whitespace-nowrap">
                              <a [href]="FileService.viewUrl(f)" target="_blank" rel="noopener"
                                (click)="$event.stopPropagation()"
                                class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-primary mr-1"
                                title="Mở xem">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i>
                              </a>
                              <button type="button" (click)="remove($event, f)"
                                class="btn btn-ghost btn-xs btn-square text-error hover:bg-error/10"
                                title="Xoá">
                                <i class="fa-solid fa-trash-can"></i>
                              </button>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              }
            }
          </div>

          <!-- Chân trang (Footer) -->
          <div class="px-6 py-4 border-t border-base-200 bg-base-50/50 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-base-content/60">
                @if (selected().length) {
                  Đã chọn <b class="text-primary font-bold text-sm">{{ selected().length }}</b> tệp
                } @else {
                  Chưa chọn tệp nào
                }
              </span>
              @if (selected().length > 0) {
                <button type="button" (click)="selected.set([])" class="btn btn-ghost btn-xs text-base-content/40 hover:text-error">
                  Bỏ chọn tất cả
                </button>
              }
            </div>

            <div class="flex items-center gap-2.5 ml-auto">
              <button type="button" (click)="picker.close(null)" class="btn btn-ghost btn-sm rounded-xl">
                Huỷ bỏ
              </button>
              <button type="button" (click)="confirm()" class="btn btn-primary btn-sm rounded-xl text-white shadow-md shadow-primary/20 gap-2 px-5 font-semibold"
                [disabled]="selected().length === 0 && uploaded().length === 0">
                <i class="fa-solid fa-check"></i> Xác nhận chọn {{ (selected().length + uploaded().length) > 0 ? '(' + (selected().length + uploaded().length) + ' tệp)' : '' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `,
  imports: [DatePipe, FormsModule]
})
export class AssetPickerComponent {
  picker = inject(AssetPickerService);
  files = inject(FileService);
  toast = inject(ToastService);
  private modal = inject(ModalService);

  FileService = FileService;
  tab = signal<'upload' | 'library'>('library');
  viewMode = signal<'grid' | 'list'>('grid');
  uploading = signal(false);
  progress = signal(0);
  loading = signal(false);

  searchQuery = '';
  kindFilter = 'all';

  uploaded = signal<FileAsset[]>([]);
  library = signal<FileAsset[]>([]);
  selected = signal<FileAsset[]>([]);

  title = computed(() => this.picker.state()?.opts.title ?? 'Thư viện tài liệu & Tệp');
  multiple = computed(() => !!this.picker.state()?.opts.multiple);
  acceptFilter = computed(() => ACCEPT_MAP[this.picker.state()?.opts.accept ?? 'any']);

  filteredLibrary = computed(() => {
    let list = this.library();
    if (this.kindFilter !== 'all') {
      list = list.filter((f) => f.kind === this.kindFilter);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter((f) => f.fileName.toLowerCase().includes(q));
    }
    return list;
  });

  setTab(t: 'upload' | 'library') {
    this.tab.set(t);
    if (t === 'library') this.loadLibrary();
  }

  async onFilesChosen(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const list = Array.from(input.files ?? []);
    if (!list.length) return;
    this.uploading.set(true);
    this.progress.set(0);
    const errors: string[] = [];

    const toUpload: File[] = [];
    for (const f of list) {
      const err = precheckSize(f);
      if (err) errors.push(err);
      else toUpload.push(f);
    }

    for (const f of toUpload) {
      const res = await this.files.upload(f, (p) => this.progress.set(p));
      if (res.ok && res.asset) {
        this.uploaded.update((xs) => [...xs, res.asset!]);
        this.library.update((xs) => [res.asset!, ...xs]);
        // Tự động chọn tệp vừa tải nếu người dùng mong muốn
        this.toggle(res.asset!);
      } else {
        errors.push(`${f.name}: ${res.error}`);
      }
      this.progress.set(0);
    }

    this.uploading.set(false);
    input.value = '';
    if (errors.length) {
      this.toast.error(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} tệp khác lỗi)` : ''));
    }
    if (this.uploaded().length && !errors.length) {
      this.toast.success(`Đã tải thành công ${this.uploaded().length} tệp vào kho.`);
    }
  }

  async loadLibrary() {
    this.loading.set(true);
    try {
      this.library.set(await this.files.mine());
    } finally {
      this.loading.set(false);
    }
  }

  isSelected(f: FileAsset) {
    return this.selected().some((x) => x.id === f.id);
  }

  toggle(f: FileAsset) {
    this.selected.update((cur) => {
      if (cur.some((x) => x.id === f.id)) return cur.filter((x) => x.id !== f.id);
      return this.multiple() ? [...cur, f] : [f];
    });
  }

  async remove(ev: MouseEvent, f: FileAsset) {
    ev.preventDefault();
    ev.stopPropagation();
    if (!(await this.modal.confirm(`Xoá tệp <b>${f.fileName}</b> khỏi kho tài liệu?`, 'Xoá tệp', true))) return;
    if (await this.files.remove(f.id)) {
      this.library.update((xs) => xs.filter((x) => x.id !== f.id));
      this.selected.update((xs) => xs.filter((x) => x.id !== f.id));
      this.toast.success('Đã xoá tệp.');
    } else {
      this.toast.error('Không xoá được tệp.');
    }
  }

  /** Trả kết quả (upload mới + chọn từ thư viện, gộp và khử trùng lặp). */
  confirm() {
    const all = [...this.uploaded(), ...this.selected()];
    const seen = new Set<string>();
    const result = all.filter((f) => !seen.has(f.id) && seen.add(f.id));
    this.picker.close(result);
  }
}

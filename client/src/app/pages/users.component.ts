import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';
import { AuthService } from '../auth.service';

interface UserRow {
  id: string; username: string; fullName: string; email: string; phone?: string; role: string; locked: boolean; lastLoginAt: string | null;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-4 sm:space-y-6">

      <!-- Header Section -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-xl sm:text-2xl font-black text-base-content tracking-tight">Quản lý người dùng</h1>
            <span class="badge badge-sm font-bold bg-error/10 text-error border-error/20">
              {{ users.length }}
            </span>
          </div>
          <p class="text-xs sm:text-sm text-base-content/50 mt-0.5">
            Danh sách tài khoản và phân quyền người dùng trong hệ thống
          </p>
        </div>

        <div class="flex items-center gap-2">
          <button (click)="exportCsv()" class="btn btn-outline btn-sm rounded-xl gap-1.5 flex-1 sm:flex-none border-base-300 hover:border-base-400 font-semibold text-xs">
            <i class="fa-solid fa-file-arrow-down text-xs"></i>
            <span class="hidden sm:inline">Xuất CSV</span>
            <span class="sm:hidden">Xuất</span>
          </button>
          <button (click)="importCsv()" class="btn btn-outline btn-sm rounded-xl gap-1.5 flex-1 sm:flex-none border-base-300 hover:border-base-400 font-semibold text-xs">
            <i class="fa-solid fa-file-arrow-up text-xs"></i>
            <span class="hidden sm:inline">Nhập CSV</span>
            <span class="sm:hidden">Nhập</span>
          </button>
          <button (click)="add()" class="btn btn-error btn-sm text-white rounded-xl gap-1.5 flex-1 sm:flex-none font-bold text-xs shadow-md shadow-error/25 hover:shadow-lg transition-all">
            <i class="fa-solid fa-user-plus text-xs"></i>
            <span>Thêm mới</span>
          </button>
        </div>
      </div>

      <!-- Filter & Search Bar -->
      <div class="card bg-base-100 border border-base-200 shadow-sm p-2.5 sm:p-3">
        <div class="flex flex-col sm:flex-row gap-2.5">
          <div class="relative flex-1">
            <i class="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/40 text-xs pointer-events-none"></i>
            <input type="text" [(ngModel)]="searchQuery" placeholder="Tìm theo tên, username, email, số điện thoại..."
              class="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-base-200/50 border border-base-300 focus:border-error focus:ring-2 focus:ring-error/20 focus:outline-none focus:bg-base-100 transition-all text-base-content placeholder:text-base-content/40" />
            @if (searchQuery) {
              <button (click)="searchQuery = ''" class="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content text-xs p-1">
                <i class="fa-solid fa-xmark"></i>
              </button>
            }
          </div>

          <div class="flex gap-2">
            <select [(ngModel)]="selectedRole" class="px-3 py-2 rounded-xl text-xs bg-base-200/50 border border-base-300 focus:border-error focus:ring-2 focus:ring-error/20 focus:outline-none text-base-content flex-1 sm:w-36 font-medium">
              <option value="ALL">Tất cả vai trò</option>
              <option value="Student">Học viên</option>
              <option value="Teacher">Giáo viên</option>
              <option value="Admin">Quản trị</option>
            </select>

            <select [(ngModel)]="selectedStatus" class="px-3 py-2 rounded-xl text-xs bg-base-200/50 border border-base-300 focus:border-error focus:ring-2 focus:ring-error/20 focus:outline-none text-base-content flex-1 sm:w-36 font-medium">
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
          </div>
        </div>
      </div>

      <!-- DESKTOP TABLE (md:block) -->
      <div class="hidden md:block card bg-base-100 border border-base-200 shadow-sm rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table w-full">
            <thead>
              <tr class="bg-base-200/40 text-[11px] font-bold uppercase tracking-wider text-base-content/60 border-b border-base-200">
                <th class="py-3.5 pl-6">Người dùng</th>
                <th class="py-3.5">Tên đăng nhập</th>
                <th class="py-3.5">Email</th>
                <th class="py-3.5">Số điện thoại</th>
                <th class="py-3.5">Vai trò</th>
                <th class="py-3.5">Trạng thái</th>
                <th class="py-3.5 pr-6 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-base-200">
              @for (u of filteredUsers; track u.id) {
                <tr class="hover:bg-base-200/30 transition-colors">
                  <td class="pl-6 py-3.5">
                    <div class="flex items-center gap-3">
                      <div class="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-sm"
                           [class]="u.role === 'Admin' ? 'bg-gradient-to-br from-red-600 to-rose-600 text-white' :
                                    u.role === 'Teacher' ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white' :
                                    'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'">
                        {{ getInitials(u.fullName) }}
                      </div>
                      <div>
                        <div class="font-bold text-sm text-base-content">{{ u.fullName }}</div>
                        <div class="text-xs text-base-content/40">{{ u.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="inline-block px-2.5 py-1 rounded-lg text-xs font-mono font-medium bg-base-200 text-base-content/80 border border-base-300/60">
                      {{ u.username }}
                    </span>
                  </td>
                  <td class="text-sm text-base-content/70">{{ u.email }}</td>
                  <td class="text-sm text-base-content/60">{{ u.phone || '—' }}</td>
                  <td>
                    @if (u.role === 'Admin') {
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        <i class="fa-solid fa-shield-halved text-[10px]"></i> Quản trị
                      </span>
                    } @else if (u.role === 'Teacher') {
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <i class="fa-solid fa-chalkboard-user text-[10px]"></i> Giáo viên
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <i class="fa-solid fa-graduation-cap text-[10px]"></i> Học viên
                      </span>
                    }
                  </td>
                  <td>
                    @if (u.locked) {
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                        <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span> Đã khóa
                      </span>
                    } @else {
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Hoạt động
                      </span>
                    }
                  </td>
                  <td class="pr-6 text-right">
                    <div class="inline-flex items-center gap-1">
                      <button (click)="edit(u)" title="Sửa thông tin"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-primary hover:bg-primary/10">
                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                      </button>
                      <button (click)="resetPw(u)" title="Đặt lại mật khẩu"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-warning hover:bg-warning/10">
                        <i class="fa-solid fa-key text-xs"></i>
                      </button>
                      <button (click)="toggleLock(u)" [title]="u.locked ? 'Mở khoá' : 'Khoá tài khoản'"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60"
                        [class]="u.locked ? 'hover:text-success hover:bg-success/10' : 'hover:text-amber-600 hover:bg-amber-500/10'">
                        <i class="fa-solid text-xs" [class.fa-lock-open]="u.locked" [class.fa-lock]="!u.locked"></i>
                      </button>
                      <button (click)="del(u)" title="Xoá tài khoản"
                        class="btn btn-ghost btn-xs btn-square rounded-lg text-base-content/60 hover:text-error hover:bg-error/10">
                        <i class="fa-solid fa-trash text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- MOBILE CARD LIST (md:hidden) -->
      <div class="md:hidden space-y-3">
        @for (u of filteredUsers; track u.id) {
          <div class="card bg-base-100 border border-base-200 shadow-sm rounded-2xl p-4 space-y-3.5">
            <!-- Top Row: Avatar + Name + Status -->
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-3 min-w-0">
                <div class="shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shadow-sm text-white"
                     [class]="u.role === 'Admin' ? 'bg-gradient-to-br from-red-600 to-rose-600' :
                              u.role === 'Teacher' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                              'bg-gradient-to-br from-blue-500 to-indigo-600'">
                  {{ getInitials(u.fullName) }}
                </div>
                <div class="min-w-0">
                  <h3 class="font-bold text-sm text-base-content truncate">{{ u.fullName }}</h3>
                  <p class="font-mono text-xs text-base-content/60 truncate">&#64;{{ u.username }}</p>
                </div>
              </div>

              <!-- Status Badge -->
              <div class="shrink-0">
                @if (u.locked) {
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-600"></span> Khóa
                  </span>
                } @else {
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Hoạt động
                  </span>
                }
              </div>
            </div>

            <!-- Details Section -->
            <div class="space-y-2 text-xs bg-base-200/40 rounded-xl p-3 border border-base-200">
              <div class="flex items-center justify-between text-base-content/70">
                <span class="flex items-center gap-2">
                  <i class="fa-solid fa-envelope w-4 text-center text-base-content/40"></i>
                  <span class="truncate max-w-[200px]">{{ u.email }}</span>
                </span>
                @if (u.phone) {
                  <span class="flex items-center gap-1.5 text-base-content/60">
                    <i class="fa-solid fa-phone text-[10px]"></i> {{ u.phone }}
                  </span>
                }
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-base-200/60">
                <span class="text-base-content/50 font-medium">Vai trò</span>
                @if (u.role === 'Admin') {
                  <span class="font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 text-[11px]">
                    <i class="fa-solid fa-shield-halved mr-1"></i> Quản trị
                  </span>
                } @else if (u.role === 'Teacher') {
                  <span class="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                    <i class="fa-solid fa-chalkboard-user mr-1"></i> Giáo viên
                  </span>
                } @else {
                  <span class="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
                    <i class="fa-solid fa-graduation-cap mr-1"></i> Học viên
                  </span>
                }
              </div>
            </div>

            <!-- Action Toolbar (Mobile) -->
            <div class="flex items-center justify-between gap-2 pt-1">
              <div class="flex items-center gap-2 flex-1">
                <button (click)="edit(u)" class="btn btn-outline btn-xs rounded-xl flex-1 border-base-300 font-bold gap-1 text-base-content hover:bg-base-200">
                  <i class="fa-solid fa-pen-to-square text-xs text-primary"></i> Sửa
                </button>
                <button (click)="resetPw(u)" class="btn btn-outline btn-xs rounded-xl flex-1 border-base-300 font-bold gap-1 text-base-content hover:bg-warning/10 hover:border-warning">
                  <i class="fa-solid fa-key text-xs text-warning"></i> Đổi MK
                </button>
              </div>

              <div class="flex items-center gap-1 shrink-0 border-l border-base-200 pl-2">
                <button (click)="toggleLock(u)" [title]="u.locked ? 'Mở khoá' : 'Khoá tài khoản'"
                  class="btn btn-ghost btn-xs btn-square rounded-lg"
                  [class.text-emerald-600]="u.locked" [class.text-amber-600]="!u.locked">
                  <i class="fa-solid text-xs" [class.fa-lock-open]="u.locked" [class.fa-lock]="!u.locked"></i>
                </button>
                <button (click)="del(u)" title="Xoá tài khoản"
                  class="btn btn-ghost btn-xs btn-square rounded-lg text-error/70 hover:text-error hover:bg-error/10">
                  <i class="fa-solid fa-trash text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Empty State -->
      @if (!filteredUsers.length) {
        <div class="card bg-base-100 border border-base-200 shadow-sm rounded-2xl py-12 text-center">
          <div class="w-14 h-14 rounded-2xl bg-base-200/60 flex items-center justify-center mx-auto mb-3">
            <i class="fa-solid fa-users text-2xl text-base-content/30"></i>
          </div>
          <p class="text-sm font-bold text-base-content/70">
            {{ users.length === 0 ? 'Chưa có người dùng nào trong hệ thống.' : 'Không tìm thấy người dùng phù hợp.' }}
          </p>
          <p class="text-xs text-base-content/40 mt-1">
            {{ users.length === 0 ? 'Nhấn nút "Thêm mới" để tạo tài khoản đầu tiên.' : 'Thử tìm kiếm với từ khóa khác hoặc điều chỉnh bộ lọc.' }}
          </p>
          @if (searchQuery || selectedRole !== 'ALL' || selectedStatus !== 'ALL') {
            <div class="mt-3">
              <button (click)="clearFilters()" class="btn btn-outline btn-xs rounded-xl text-error border-error/30 hover:bg-error/10">
                <i class="fa-solid fa-rotate-left mr-1"></i> Xóa bộ lọc
              </button>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class UsersComponent implements OnInit {
  users: UserRow[] = [];
  searchQuery = '';
  selectedRole = 'ALL';
  selectedStatus = 'ALL';

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);
  private auth = inject(AuthService);
  private router = inject(Router);

  get filteredUsers(): UserRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.users.filter((u) => {
      const matchQuery = !q ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.toLowerCase().includes(q));

      const matchRole = this.selectedRole === 'ALL' || u.role === this.selectedRole;
      const matchStatus = this.selectedStatus === 'ALL' ||
        (this.selectedStatus === 'ACTIVE' && !u.locked) ||
        (this.selectedStatus === 'LOCKED' && u.locked);

      return matchQuery && matchRole && matchStatus;
    });
  }

  clearFilters() {
    this.searchQuery = '';
    this.selectedRole = 'ALL';
    this.selectedStatus = 'ALL';
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('/api/users').subscribe({
      next: (res) => { if (res.success) this.users = res.data; },
      error: (e) => this.toast.error(e.error?.error ?? 'Không tải được danh sách')
    });
  }

  roleLabel(r: string) { return r === 'Admin' ? 'Quản trị' : r === 'Teacher' ? 'Giáo viên' : 'Học viên'; }

  private downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  exportCsv() {
    this.downloadCsv('nguoi-dung.csv', ['Tên đăng nhập', 'Họ tên', 'Email', 'Vai trò', 'Trạng thái'],
      this.users.map((u) => [u.username, u.fullName, u.email, u.role, u.locked ? 'Khoá' : 'Hoạt động']));
    this.toast.success(`Đã xuất ${this.users.length} người dùng.`);
  }

  async importCsv() {
    const r = await this.modal.form({
      title: 'Nhập người dùng (Excel/CSV)', confirmText: 'Nhập dữ liệu',
      fields: [{
        key: 'csv', label: 'Dán dữ liệu — mỗi dòng: tên đăng nhập, họ tên, email, vai trò, mật khẩu (tuỳ chọn)',
        type: 'textarea',
        placeholder: 'nguyenvan.a, Nguyễn Văn A, vana@gmail.com, Student, 123456\ntranthi.b, Trần Thị B, thib@gmail.com, Teacher, 123456'
      }]
    });
    if (!r) return;
    const rows = r['csv'].split('\n').map((l) => l.split(',').map((s) => s.trim())).filter((c) => c.length >= 4 && c[0] && c[1] && c[2]);
    if (!rows.length) { this.toast.error('Không đọc được dòng nào.'); return; }
    let ok = 0, fail = 0;
    for (const [username, fullName, email, role, password] of rows) {
      const res = await new Promise<any>((resolve) =>
        this.http.post<any>('/api/users', { username, fullName, email, role, password: password || '123456' }).subscribe(resolve));
      if (res.success) ok++; else { fail++; this.toast.error(`${email}: ${res.error}`); }
    }
    this.toast.success(`Nhập xong: ${ok} thành công, ${fail} lỗi.`);
    this.load();
  }

  async add() {
    const r = await this.modal.form({
      title: 'Thêm người dùng mới',
      confirmText: 'Tạo tài khoản',
      fields: [
        { key: 'username', label: 'Tên đăng nhập', placeholder: 'Nhập tên đăng nhập (VD: nguyenvana)' },
        { key: 'fullName', label: 'Họ tên', placeholder: 'Nhập họ và tên (VD: Nguyễn Văn A)' },
        { key: 'email', label: 'Email', type: 'email', placeholder: 'Nhập địa chỉ email (VD: vana@gmail.com)' },
        { key: 'password', label: 'Mật khẩu', type: 'text', value: '123456', placeholder: 'Nhập mật khẩu ban đầu (mặc định 123456)' },
        { key: 'role', label: 'Vai trò', type: 'select', options: [['Student', 'Học viên'], ['Teacher', 'Giáo viên'], ['Admin', 'Quản trị']] }
      ]
    });
    if (!r) return;
    this.http.post<any>('/api/users', r).subscribe({
      next: (res) => {
        if (res.success) { this.toast.success(`Đã tạo tài khoản ${r['email']}.`); this.load(); }
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Tạo tài khoản thất bại')
    });
  }

  async edit(u: UserRow) {
    const r = await this.modal.form({
      title: `Sửa thông tin — ${u.fullName}`,
      confirmText: 'Lưu thay đổi',
      fields: [
        { key: 'username', label: 'Tên đăng nhập', value: (u as any).username ?? '', placeholder: 'Nhập tên đăng nhập (VD: nguyenvana)' },
        { key: 'fullName', label: 'Họ tên', value: u.fullName, placeholder: 'Nhập họ và tên đầy đủ' },
        { key: 'email', label: 'Email', type: 'email', value: u.email, placeholder: 'Nhập địa chỉ email (VD: user@email.com)' },
        { key: 'phone', label: 'Số điện thoại (tuỳ chọn)', value: (u as any).phone ?? '', placeholder: 'Nhập số điện thoại (VD: 0912345678)' },
        { key: 'role', label: 'Vai trò', type: 'select', value: u.role, options: [['Student', 'Học viên'], ['Teacher', 'Giáo viên'], ['Admin', 'Quản trị']] },
        { key: 'newPassword', label: 'Mật khẩu mới (bỏ trống = giữ nguyên)', value: '', placeholder: 'Nhập mật khẩu mới nếu muốn thay đổi' },
        { key: 'lastLogin', label: 'Đăng nhập gần nhất', value: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'Chưa từng', hint: 'Thông tin chỉ đọc', disabled: true }
      ]
    });
    if (!r) return;
    const body: any = { username: r['username'], fullName: r['fullName'], email: r['email'], phone: r['phone'] || null, role: r['role'] };
    if (r['newPassword']) body.newPassword = r['newPassword'];
    this.http.put<any>(`/api/users/${u.id}`, body).subscribe({
      next: (res) => {
        if (res.success) { this.toast.success('Đã cập nhật.'); this.load(); }
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Cập nhật thất bại')
    });
  }

  async toggleLock(u: UserRow) {
    const msg = u.locked
      ? `Mở khoá tài khoản của <b>${u.fullName}</b>?`
      : `Khoá tài khoản của <b>${u.fullName}</b>? Họ sẽ không đăng nhập được.`;
    if (!(await this.modal.confirm(msg, u.locked ? 'Mở khoá' : 'Khoá', !u.locked))) return;
    this.http.put<any>(`/api/users/${u.id}`, { locked: !u.locked }).subscribe({
      next: (res) => {
        if (res.success) { this.toast.success(u.locked ? 'Đã mở khoá.' : 'Đã khoá tài khoản.'); this.load(); }
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  async resetPw(u: UserRow) {
    if (!(await this.modal.confirm(`Đặt lại mật khẩu của <b>${u.fullName}</b> thành <code>123456</code>?`, 'Đặt lại'))) return;
    this.http.put<any>(`/api/users/${u.id}`, { newPassword: '123456' }).subscribe({
      next: (res) => {
        if (res.success) this.toast.success(`Đã đặt lại mật khẩu của ${u.fullName}.`);
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  async del(u: UserRow) {
    if (!(await this.modal.confirm(`Xoá tài khoản <b>${u.fullName}</b> (${u.email})?\n<span class="text-xs text-base-content/40">Dữ liệu liên quan sẽ được ẩn đi — có thể khôi phục từ database.</span>`, 'Xoá', true))) return;
    this.http.delete<any>(`/api/users/${u.id}`).subscribe({
      next: (res) => {
        if (res.success) { this.toast.success(`Đã xoá ${u.fullName}.`); this.load(); }
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Xoá thất bại')
    });
  }
}

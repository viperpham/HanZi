import { Component, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';
import { AuthService } from '../auth.service';

interface UserRow {
  id: string; fullName: string; email: string; phone?: string; role: string; locked: boolean; lastLoginAt: string | null;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-5">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Quản lý người dùng</h1>
          <p class="text-sm text-base-content/50 mt-0.5">{{ users.length }} tài khoản trong hệ thống</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button (click)="exportCsv()" class="btn btn-outline btn-sm gap-2">
            <i class="fa-solid fa-file-arrow-down"></i> Xuất CSV
          </button>
          <button (click)="importCsv()" class="btn btn-outline btn-sm gap-2">
            <i class="fa-solid fa-file-arrow-up"></i> Nhập CSV
          </button>
          <button (click)="add()" class="btn btn-error btn-sm text-white gap-2">
            <i class="fa-solid fa-plus"></i> Thêm người dùng
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full min-w-[700px]">
            <thead>
              <tr class="text-xs uppercase tracking-wide text-base-content/50">
                <th>Họ tên</th>
                <th>Email</th>
                <th>Điện thoại</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th class="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users; track u.id) {
                <tr class="hover">
                  <td class="font-semibold text-sm">{{ u.fullName }}</td>
                  <td class="text-sm text-base-content/60">{{ u.email }}</td>
                  <td class="text-sm text-base-content/60">{{ u.phone || '—' }}</td>
                  <td>
                    @if (u.role === 'Admin') {
                      <span class="badge badge-ghost gap-1">
                        <i class="fa-solid fa-shield-halved fa-xs"></i> Quản trị
                      </span>
                    } @else if (u.role === 'Teacher') {
                      <span class="badge badge-warning gap-1">
                        <i class="fa-solid fa-chalkboard-user fa-xs"></i> Giáo viên
                      </span>
                    } @else {
                      <span class="badge badge-info gap-1">
                        <i class="fa-solid fa-graduation-cap fa-xs"></i> Học viên
                      </span>
                    }
                  </td>
                  <td>
                    @if (u.locked) {
                      <span class="badge badge-error gap-1 badge-sm">
                        <i class="fa-solid fa-lock fa-xs"></i> Đã khóa
                      </span>
                    } @else {
                      <span class="badge badge-success gap-1 badge-sm">
                        <i class="fa-solid fa-circle-check fa-xs"></i> Hoạt động
                      </span>
                    }
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-0.5">
                      <button (click)="edit(u)" title="Sửa thông tin"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content">
                        <i class="fa-solid fa-pencil"></i>
                      </button>
                      <button (click)="resetPw(u)" title="Đặt lại mật khẩu"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-warning">
                        <i class="fa-solid fa-key"></i>
                      </button>
                      <button (click)="toggleLock(u)" [title]="u.locked ? 'Mở khoá' : 'Khoá tài khoản'"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50"
                        [class.hover:text-success]="u.locked" [class.hover:text-warning]="!u.locked">
                        <i class="fa-solid" [class.fa-lock-open]="u.locked" [class.fa-lock]="!u.locked"></i>
                      </button>
                      <button (click)="loginAs(u)" title="Đăng nhập với vai trò này"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-info">
                        <i class="fa-solid fa-user-secret"></i>
                      </button>
                      <button (click)="del(u)" title="Xoá tài khoản"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-error">
                        <i class="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          @if (!users.length) {
            <div class="py-16 text-center">
              <i class="fa-solid fa-users text-4xl text-base-content/15"></i>
              <p class="text-sm text-base-content/40 mt-3">Chưa có người dùng nào.</p>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class UsersComponent implements OnInit {
  users: UserRow[] = [];
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);
  private auth = inject(AuthService);
  private router = inject(Router);

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('http://localhost:5000/api/users').subscribe({
      next: (res) => { if (res.success) this.users = res.data; },
      error: (e) => this.toast.error(e.error?.error ?? 'Không tải được danh sách')
    });
  }

  roleLabel(r: string) { return r === 'Admin' ? 'Quản trị' : r === 'Teacher' ? 'Giáo viên' : 'Học viên'; }

  /** Đăng nhập với vai trò này — Admin mở phiên với tư cách người dùng đích. */
  async loginAs(u: UserRow) {
    if (!(await this.modal.confirm(
      `Đăng nhập với vai trò <b>${u.fullName}</b>?<br><span class="text-xs text-base-content/50">Bạn sẽ thấy ứng dụng như người này. Đăng xuất để quay lại tài khoản quản trị.</span>`,
      'Đăng nhập'
    ))) return;
    const res = await this.http.post<any>(`http://localhost:5000/api/users/${u.id}/login-as`, {}).toPromise();
    if (!res?.success) { this.toast.error(res?.error ?? 'Không thể mở phiên.'); return; }
    this.auth.assume(res.data.accessToken, res.data.refreshToken, res.data.user);
    const role = res.data.user.role;
    this.toast.info(`Đang xem ứng dụng với vai trò ${u.fullName}.`);
    this.router.navigateByUrl(role === 'Student' ? '/home' : '/dashboard');
  }

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
    this.downloadCsv('nguoi-dung.csv', ['Họ tên', 'Email', 'Vai trò', 'Trạng thái'],
      this.users.map((u) => [u.fullName, u.email, u.role, u.locked ? 'Khoá' : 'Hoạt động']));
    this.toast.success(`Đã xuất ${this.users.length} người dùng.`);
  }

  async importCsv() {
    const r = await this.modal.form({
      title: 'Nhập người dùng (Excel/CSV)', confirmText: 'Nhập',
      fields: [{
        key: 'csv', label: 'Dán dữ liệu — mỗi dòng: họ tên, email, vai trò, mật khẩu (tùy chọn)',
        type: 'textarea',
        placeholder: 'Nguyễn Thị D, d@vidu.com, Student\nTrần V, v@vidu.com, Student, 123456'
      }]
    });
    if (!r) return;
    const rows = r['csv'].split('\n').map((l) => l.split(',').map((s) => s.trim())).filter((c) => c.length >= 3 && c[0] && c[1]);
    if (!rows.length) { this.toast.error('Không đọc được dòng nào.'); return; }
    let ok = 0, fail = 0;
    for (const [fullName, email, role, password] of rows) {
      const res = await new Promise<any>((resolve) =>
        this.http.post<any>('http://localhost:5000/api/users', { fullName, email, role, password: password || '123456' }).subscribe(resolve));
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
        { key: 'fullName', label: 'Họ tên', placeholder: 'VD: Nguyễn Thị D' },
        { key: 'email', label: 'Email đăng nhập', type: 'email', placeholder: 'email@vidu.com' },
        { key: 'password', label: 'Mật khẩu', type: 'text', value: '123456' },
        { key: 'role', label: 'Vai trò', type: 'select', options: [['Student', 'Học viên'], ['Teacher', 'Giáo viên'], ['Admin', 'Quản trị']] }
      ]
    });
    if (!r) return;
    this.http.post<any>('http://localhost:5000/api/users', r).subscribe({
      next: (res) => {
        if (res.success) { this.toast.success(`Đã tạo tài khoản ${r['email']}.`); this.load(); }
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Tạo tài khoản thất bại')
    });
  }

  async edit(u: UserRow) {
    const r = await this.modal.form({
      title: `Sửa — ${u.fullName}`,
      confirmText: 'Lưu',
      fields: [
        { key: 'fullName', label: 'Họ tên', value: u.fullName },
        { key: 'email', label: 'Email đăng nhập', type: 'email', value: u.email },
        { key: 'phone', label: 'Số điện thoại (tuỳ chọn)', value: (u as any).phone ?? '' },
        { key: 'role', label: 'Vai trò', type: 'select', value: u.role, options: [['Student', 'Học viên'], ['Teacher', 'Giáo viên'], ['Admin', 'Quản trị']] },
        { key: 'newPassword', label: 'Mật khẩu mới (bỏ trống = giữ nguyên)', value: '' },
        { key: 'lastLogin', label: 'Đăng nhập gần nhất', value: u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : 'Chưa từng', hint: 'Thông tin chỉ đọc' }
      ]
    });
    if (!r) return;
    const body: any = { fullName: r['fullName'], email: r['email'], phone: r['phone'] || null, role: r['role'] };
    if (r['newPassword']) body.newPassword = r['newPassword'];
    this.http.put<any>(`http://localhost:5000/api/users/${u.id}`, body).subscribe({
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
    this.http.put<any>(`http://localhost:5000/api/users/${u.id}`, { locked: !u.locked }).subscribe({
      next: (res) => {
        if (res.success) { this.toast.success(u.locked ? 'Đã mở khoá.' : 'Đã khoá tài khoản.'); this.load(); }
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  async resetPw(u: UserRow) {
    if (!(await this.modal.confirm(`Đặt lại mật khẩu của <b>${u.fullName}</b> thành <code>123456</code>?`, 'Đặt lại'))) return;
    this.http.put<any>(`http://localhost:5000/api/users/${u.id}`, { newPassword: '123456' }).subscribe({
      next: (res) => {
        if (res.success) this.toast.success(`Đã đặt lại mật khẩu của ${u.fullName}.`);
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  async del(u: UserRow) {
    if (!(await this.modal.confirm(`Xoá tài khoản <b>${u.fullName}</b> (${u.email})?\n<span class="text-xs text-base-content/40">Dữ liệu liên quan sẽ được ẩn đi — có thể khôi phục từ database.</span>`, 'Xoá', true))) return;
    this.http.delete<any>(`http://localhost:5000/api/users/${u.id}`).subscribe({
      next: (res) => {
        if (res.success) { this.toast.success(`Đã xoá ${u.fullName}.`); this.load(); }
        else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Xoá thất bại')
    });
  }
}

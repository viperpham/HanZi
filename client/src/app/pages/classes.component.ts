import { Component, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { ToastService } from '../toast.service';
import { ModalService } from '../modal.service';

interface ClassRow { id: string; code: string; name: string; curriculumName?: string; schedule?: string; room?: string; status: string; studentCount: number; }
interface StudentRow { id: string; fullName: string; email: string; joinedAt: string; locked: boolean; status: string; }
interface AttendanceRow { studentId: string; fullName: string; status: string | null; }

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  template: `
    <div class="space-y-5">

      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-extrabold text-base-content">Lớp học</h1>
          <p class="text-sm text-base-content/50 mt-0.5">{{ items.length }} lớp đang quản lý</p>
        </div>
        <button (click)="add()" class="btn btn-error btn-sm text-white gap-2">
          <i class="fa-solid fa-plus"></i> Tạo lớp
        </button>
      </div>

      <!-- Table -->
      <div class="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="table table-zebra w-full min-w-[700px]">
            <thead>
              <tr class="text-xs uppercase tracking-wide text-base-content/50">
                <th>Lớp</th>
                <th>Giáo trình</th>
                <th>Lịch học</th>
                <th>Sĩ số</th>
                <th class="text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              @for (c of items; track c.id) {
                <tr class="hover">
                  <td>
                    <p class="font-semibold text-sm">{{ c.name }}</p>
                    <span class="badge badge-ghost badge-sm font-mono text-xs text-error">{{ c.code }}</span>
                  </td>
                  <td class="text-sm text-base-content/60">{{ c.curriculumName || '—' }}</td>
                  <td class="text-sm text-base-content/60">
                    @if (c.schedule) { {{ c.schedule }} }
                    @if (c.room) { &nbsp;&middot; {{ c.room }} }
                    @if (!c.schedule && !c.room) { — }
                  </td>
                  <td>
                    <span class="flex items-center gap-1.5 text-sm">
                      <i class="fa-solid fa-users text-base-content/40 fa-sm"></i>
                      {{ c.studentCount }}
                    </span>
                  </td>
                  <td class="text-right">
                    <div class="flex items-center justify-end gap-0.5">
                      <button (click)="toggleDetail(c)"
                        [title]="selected?.id === c.id ? 'Đóng chi tiết' : 'Xem học viên & điểm danh'"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-base-content">
                        <i class="fa-solid" [class.fa-chevron-up]="selected?.id === c.id" [class.fa-chevron-down]="selected?.id !== c.id"></i>
                      </button>
                      <button (click)="enroll(c)" title="Thêm học viên"
                        class="btn btn-ghost btn-xs btn-square text-base-content/50 hover:text-success">
                        <i class="fa-solid fa-user-plus"></i>
                      </button>
                      <button (click)="del(c)" title="Xoá lớp"
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
              <i class="fa-solid fa-chalkboard text-4xl text-base-content/15"></i>
              <p class="text-sm text-base-content/40 mt-3">Chưa có lớp nào.</p>
            </div>
          }
        </div>
      </div>

      <!-- Class Detail Panel -->
      @if (selected; as c) {
        <div class="card bg-base-100 border border-error/30 shadow-sm">
          <div class="card-body p-5 space-y-5">

            <!-- Class header -->
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 class="text-lg font-extrabold text-base-content">{{ c.name }}</h2>
                <p class="text-sm text-base-content/50 mt-0.5 flex items-center gap-2 flex-wrap">
                  Mã lớp:
                  <span class="badge badge-error badge-sm font-mono">{{ c.code }}</span>
                  <button (click)="copyCode(c)" class="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-base-content"
                    title="Chép mã lớp">
                    <i class="fa-regular fa-copy fa-xs"></i> Chép
                  </button>
                  <span class="text-base-content/40">— Học viên dùng mã này để tự tham gia</span>
                </p>
              </div>
              <button (click)="selected = null" class="btn btn-ghost btn-sm btn-square">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>

            <!-- Tabs -->
            <div role="tablist" class="tabs tabs-box tabs-sm w-fit">
              <button role="tab" class="tab" [class.tab-active]="tab === 'students'" (click)="setTab(c, 'students')">
                <i class="fa-solid fa-users fa-xs mr-1"></i> Học viên
              </button>
              <button role="tab" class="tab" [class.tab-active]="tab === 'assignments'" (click)="setTab(c, 'assignments')">
                <i class="fa-solid fa-clipboard-list fa-xs mr-1"></i> Bài tập
              </button>
              <button role="tab" class="tab" [class.tab-active]="tab === 'progress'" (click)="setTab(c, 'progress')">
                <i class="fa-solid fa-table-cells fa-xs mr-1"></i> Tiến độ theo bài
              </button>
              <button role="tab" class="tab" [class.tab-active]="tab === 'config'" (click)="setTab(c, 'config')">
                <i class="fa-solid fa-gear fa-xs mr-1"></i> Cấu hình
              </button>
            </div>

            <!-- ===== TAB: HỌC VIÊN ===== -->
            @if (tab === 'students') {
            <div class="space-y-5">
              <!-- Tìm & thêm học viên -->
              <div class="rounded-xl border border-base-200 p-4">
                <h3 class="text-sm font-bold text-base-content/70 mb-2 flex items-center gap-2">
                  <i class="fa-solid fa-user-plus fa-sm text-success"></i> Thêm học viên vào lớp
                </h3>
                <div class="flex flex-wrap items-center gap-2">
                  <label class="input input-sm input-bordered flex items-center gap-2 grow max-w-xs">
                    <i class="fa-solid fa-magnifying-glass text-base-content/30 fa-xs"></i>
                    <input [(ngModel)]="searchQ" (ngModelChange)="searchStudents()"
                      placeholder="Gõ tên hoặc email…" class="grow" />
                  </label>
                  <button (click)="invite(c)" class="btn btn-outline btn-sm gap-2">
                    <i class="fa-regular fa-envelope"></i> Mời bằng email
                  </button>
                </div>
                @if (searchResults.length) {
                  <div class="mt-2 rounded-xl border border-base-200 divide-y divide-base-200 max-h-48 overflow-y-auto">
                    @for (u of searchResults; track u.id) {
                      <div class="flex items-center gap-2 px-3 py-2">
                        <div class="min-w-0 flex-1">
                          <p class="text-sm font-semibold">{{ u.fullName }}</p>
                          <p class="text-xs text-base-content/40">{{ u.email }}</p>
                        </div>
                        @if (inClass(u)) {
                          <span class="badge badge-success badge-sm text-white">Đã trong lớp</span>
                        } @else {
                          <button (click)="addStudent(c, u)" class="btn btn-success btn-xs text-white gap-1">
                            <i class="fa-solid fa-plus fa-xs"></i> Thêm
                          </button>
                        }
                      </div>
                    }
                  </div>
                } @else if (searchQ.trim().length >= 2) {
                  <p class="mt-2 text-xs text-base-content/40">Không tìm thấy học viên nào khớp.</p>
                }
              </div>

              <!-- Students table -->
              <div>
                <h3 class="text-sm font-bold text-base-content/70 mb-3 flex items-center gap-2">
                  <i class="fa-solid fa-users fa-sm"></i> Danh sách học viên
                </h3>
                <div class="overflow-x-auto rounded-xl border border-base-200">
                  <table class="table table-sm w-full">
                    <thead>
                      <tr class="text-xs uppercase text-base-content/40">
                        <th>Học viên</th>
                        <th>Ngày vào</th>
                        <th>Trạng thái</th>
                        <th class="text-right">Duyệt</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (s of students; track s.id) {
                        <tr class="hover">
                          <td>
                            <p class="font-semibold text-sm">{{ s.fullName }}</p>
                            <p class="text-xs text-base-content/40">{{ s.email }}</p>
                          </td>
                          <td class="text-sm text-base-content/50">{{ s.joinedAt | date:'dd/MM' }}</td>
                          <td>
                            @switch (s.status) {
                              @case ('Approved') {
                                <span class="badge badge-success badge-sm gap-1">
                                  <i class="fa-solid fa-check fa-xs"></i> Đã duyệt
                                </span>
                              }
                              @case ('Pending') {
                                <span class="badge badge-warning badge-sm gap-1">
                                  <i class="fa-solid fa-hourglass-half fa-xs"></i> Chờ duyệt
                                </span>
                              }
                              @default {
                                <span class="badge badge-ghost badge-sm">Từ chối</span>
                              }
                            }
                          </td>
                          <td class="text-right">
                            @if (s.status === 'Pending') {
                              <div class="flex items-center justify-end gap-1">
                                <button (click)="approve(c, s, true)"
                                  class="btn btn-success btn-xs text-white gap-1">
                                  <i class="fa-solid fa-check"></i> Duyệt
                                </button>
                                <button (click)="approve(c, s, false)"
                                  class="btn btn-outline btn-xs gap-1">
                                  <i class="fa-solid fa-xmark"></i> Từ chối
                                </button>
                              </div>
                            } @else {
                              <button (click)="removeStudent(c, s)" title="Xoá khỏi lớp"
                                class="btn btn-ghost btn-xs btn-square text-base-content/40 hover:text-error">
                                <i class="fa-solid fa-trash fa-xs"></i>
                              </button>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                  @if (!students.length) {
                    <div class="py-8 text-center">
                      <i class="fa-solid fa-user-slash text-2xl text-base-content/15"></i>
                      <p class="text-sm text-base-content/40 mt-2">Chưa có học viên nào.</p>
                    </div>
                  }
                </div>
              </div>

              <!-- Attendance -->
              <div class="rounded-xl border border-base-200 p-4">
                <div class="flex flex-wrap items-center gap-3 mb-4">
                  <h3 class="text-sm font-bold text-base-content flex items-center gap-2">
                    <i class="fa-solid fa-clipboard-check text-base-content/50"></i>
                    Điểm danh
                  </h3>
                  <input type="date" [(ngModel)]="attDate" (change)="loadAttendance(c)"
                    class="input input-sm" />
                  <button (click)="loadAttendance(c)" class="btn btn-ghost btn-sm gap-2">
                    <i class="fa-solid fa-rotate"></i> Tải
                  </button>
                  <button (click)="saveAttendance(c)" class="btn btn-error btn-sm text-white gap-2 ml-auto">
                    <i class="fa-solid fa-floppy-disk"></i> Lưu điểm danh
                  </button>
                </div>

                @if (attendance.length) {
                  <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    @for (a of attendance; track a.studentId) {
                      <div class="flex items-center justify-between gap-2 rounded-lg border border-base-200 px-3 py-2">
                        <span class="text-sm font-semibold truncate">{{ a.fullName }}</span>
                        <select [(ngModel)]="a.status" class="select select-xs min-w-[100px]">
                          <option [ngValue]="null">— chưa —</option>
                          <option value="Present">Có mặt</option>
                          <option value="Late">Muộn</option>
                          <option value="Absent">Vắng</option>
                        </select>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="text-center text-sm text-base-content/40 py-4">
                    <i class="fa-solid fa-user-slash mr-1"></i>
                    Lớp chưa có học viên đã duyệt — không có ai để điểm danh.
                  </p>
                }

                <!-- Thống kê tổng hợp -->
                @if (summary.length) {
                  <div class="divider text-xs text-base-content/40 my-3">THỐNG KÊ TOÀN BỘ BUỔI</div>
                  <div class="overflow-x-auto rounded-xl border border-base-200">
                    <table class="table table-sm w-full">
                      <thead>
                        <tr class="text-xs uppercase text-base-content/50">
                          <th>Học viên</th><th class="text-center">Có mặt</th><th class="text-center">Muộn</th>
                          <th class="text-center">Vắng</th><th class="text-center">Tỉ lệ đúng giờ</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (s of summary; track s.studentId) {
                          <tr>
                            <td class="font-semibold text-sm">{{ s.fullName }}</td>
                            <td class="text-center font-bold text-success">{{ s.present }}</td>
                            <td class="text-center font-bold text-warning">{{ s.late }}</td>
                            <td class="text-center font-bold text-error">{{ s.absent }}</td>
                            <td class="text-center">
                              <span class="badge badge-sm"
                                [class]="pct(s) >= 80 ? 'badge-success text-white' : pct(s) >= 50 ? 'badge-warning text-white' : 'badge-error text-white'">
                                {{ pct(s) }}%
                              </span>
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            </div>
            }

            <!-- ===== TAB: BÀI TẬP CỦA LỚP ===== -->
            @if (tab === 'assignments') {
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-base-content/70 flex items-center gap-2">
                  <i class="fa-solid fa-clipboard-list fa-sm"></i> Bài tập đã giao
                </h3>
                <span class="badge badge-ghost badge-sm">{{ classAssignments.length }} bài</span>
                <a routerLink="/assignments" class="btn btn-outline btn-xs gap-1 ml-auto">
                  <i class="fa-solid fa-plus fa-xs"></i> Giao bài cho lớp
                </a>
              </div>
              <div class="overflow-x-auto rounded-xl border border-base-200">
                <table class="table table-sm w-full">
                  <thead>
                    <tr class="text-xs uppercase text-base-content/40">
                      <th>Bài tập</th><th>Hạn nộp</th><th class="text-center">Số câu</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (a of classAssignments; track a.id) {
                      <tr class="hover">
                        <td class="font-semibold text-sm">{{ a.title }}</td>
                        <td class="text-sm text-base-content/50">{{ a.dueAt | date:'dd/MM/yyyy HH:mm' }}</td>
                        <td class="text-center">
                          <span class="badge badge-ghost badge-sm">{{ a.questionCount }} câu</span>
                        </td>
                        <td class="text-right">
                          <a [routerLink]="['/grading']"
                            [queryParams]="{ classId: c.id, assignmentId: a.id }"
                            class="btn btn-ghost btn-xs gap-1 text-warning">
                            <i class="fa-solid fa-pen-nib fa-xs"></i> Xem bài nộp
                          </a>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
                @if (!classAssignments.length) {
                  <div class="py-8 text-center">
                    <i class="fa-solid fa-clipboard-list text-2xl text-base-content/15"></i>
                    <p class="text-sm text-base-content/40 mt-2">Lớp chưa có bài tập nào.</p>
                  </div>
                }
              </div>
            </div>
            }

            <!-- ===== TAB: TIẾN ĐỘ THEO BÀI ===== -->
            @if (tab === 'progress') {
            <div class="space-y-3">
              @if (progress) {
                <div class="flex flex-wrap items-center gap-3 text-xs text-base-content/50">
                  <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-success inline-block"></span> Đã học hết (5/5)</span>
                  <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-warning inline-block"></span> Đang học</span>
                  <span class="flex items-center gap-1"><span class="w-3 h-3 rounded bg-base-200 inline-block"></span> Chưa mở</span>
                  <span class="ml-auto">Mỗi ô là số phần đã học của bài đó (tối đa 5)</span>
                </div>
                <div class="overflow-x-auto rounded-xl border border-base-200">
                  <table class="table table-sm w-full">
                    <thead>
                      <tr class="text-xs uppercase text-base-content/40">
                        <th>Học viên</th>
                        @for (l of progress.lessons; track l.lessonId) {
                          <th class="text-center" [title]="l.titleZh">B{{ l.orderNo }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of progress.students; track row.studentId) {
                        <tr class="hover">
                          <td class="font-semibold text-sm whitespace-nowrap">{{ row.studentName }}</td>
                          @for (cell of row.cells; track cell.lessonId) {
                            <td class="text-center">
                              <span class="inline-grid h-7 w-7 place-items-center rounded-lg text-[11px] font-extrabold text-white"
                                [class]="cell.parts >= 5 ? 'bg-success' : cell.parts > 0 ? 'bg-warning' : 'bg-base-200 text-base-content/40'">
                                {{ cell.parts || '' }}
                              </span>
                            </td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                  @if (!progress.students.length) {
                    <div class="py-8 text-center">
                      <i class="fa-solid fa-user-slash text-2xl text-base-content/15"></i>
                      <p class="text-sm text-base-content/40 mt-2">Chưa có học viên đã duyệt nào.</p>
                    </div>
                  }
                </div>
              }
            </div>
            }

            <!-- ===== TAB: CẤU HÌNH LỚP ===== -->
            @if (tab === 'config') {
            <div class="space-y-4 max-w-xl">
              <div class="rounded-xl border border-base-200 p-4 grid gap-3 sm:grid-cols-2">
                <label class="form-control">
                  <span class="label-text text-sm font-semibold mb-1">Tên lớp</span>
                  <input [(ngModel)]="cfgName" class="input input-sm w-full" />
                </label>
                <label class="form-control">
                  <span class="label-text text-sm font-semibold mb-1">Trạng thái</span>
                  <div class="select-wrap">
                    <select [(ngModel)]="cfgStatus" class="select select-sm w-full">
                      <option value="Upcoming">Sắp khai giảng</option>
                      <option value="Studying">Đang học</option>
                      <option value="Ended">Đã kết thúc</option>
                    </select>
                  </div>
                </label>
                <label class="form-control">
                  <span class="label-text text-sm font-semibold mb-1">Lịch học</span>
                  <input [(ngModel)]="cfgSchedule" class="input input-sm w-full" placeholder="VD: T2 · T4 — 19:00" />
                </label>
                <label class="form-control">
                  <span class="label-text text-sm font-semibold mb-1">Phòng</span>
                  <input [(ngModel)]="cfgRoom" class="input input-sm w-full" placeholder="VD: P201" />
                </label>
              </div>
              <div class="flex justify-end">
                <button (click)="saveConfig(c)" [disabled]="cfgSaving" class="btn btn-error btn-sm text-white gap-2">
                  <i class="fa-solid fa-floppy-disk"></i>
                  {{ cfgSaving ? 'Đang lưu…' : 'Lưu cấu hình' }}
                </button>
              </div>
              <div class="rounded-xl border border-base-200 p-4 text-sm text-base-content/60 space-y-1">
                <p><span class="font-semibold text-base-content/40">Giáo trình:</span> {{ c.curriculumName || '—' }}</p>
                <p class="alert bg-info/10 border-info/20 text-info py-2 mt-2">
                  <i class="fa-solid fa-circle-info"></i>
                  <span>Đổi tên lớp / lịch học sẽ hiện ngay cho học viên trong lớp của các em.</span>
                </p>
              </div>
            </div>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class ClassesComponent implements OnInit {
  items: ClassRow[] = [];
  selected: ClassRow | null = null;
  students: StudentRow[] = [];
  attendance: AttendanceRow[] = [];
  summary: any[] = [];
  attDate = new Date().toISOString().slice(0, 10);

  tab = 'students';
  classAssignments: any[] = [];
  progress: any = null;

  searchQ = '';
  searchResults: StudentRow[] = [];
  allStudents: StudentRow[] = [];

  cfgName = ''; cfgSchedule = ''; cfgRoom = ''; cfgStatus = 'Studying'; cfgSaving = false;

  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);

  ngOnInit() { this.load(); }

  load() {
    this.http.get<any>('/api/classes').subscribe({
      next: (res) => { if (res.success) this.items = res.data; },
      error: (e) => this.toast.error(e.error?.error ?? 'Không tải được')
    });
  }

  setTab(c: ClassRow, t: string) {
    this.tab = t;
    if (t === 'assignments' && !this.classAssignments.length) this.loadClassAssignments(c);
    if (t === 'progress') this.loadProgress(c);
    if (t === 'config') this.fillConfig(c);
  }

  loadClassAssignments(c: ClassRow) {
    this.classAssignments = [];
    this.http.get<any>(`/api/assignments?classId=${c.id}`).subscribe({
      next: (res) => { if (res.success) this.classAssignments = res.data; }
    });
  }

  loadProgress(c: ClassRow) {
    this.progress = null;
    this.http.get<any>(`/api/classes/${c.id}/lesson-progress`).subscribe({
      next: (res) => { if (res.success) this.progress = res.data; }
    });
  }

  fillConfig(c: ClassRow) {
    this.cfgName = c.name;
    this.cfgSchedule = c.schedule ?? '';
    this.cfgRoom = c.room ?? '';
    this.cfgStatus = c.status;
  }

  saveConfig(c: ClassRow) {
    if (!this.cfgName.trim()) { this.toast.error('Tên lớp không được để trống.'); return; }
    this.cfgSaving = true;
    this.http.put<any>(`/api/classes/${c.id}`, {
      name: this.cfgName, schedule: this.cfgSchedule, room: this.cfgRoom, status: this.cfgStatus
    }).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Đã lưu cấu hình lớp.');
          this.cfgSaving = false;
          this.load();
        } else { this.toast.error(res.error!); this.cfgSaving = false; }
      },
      error: (e) => { this.toast.error(e.error?.error ?? 'Lưu thất bại'); this.cfgSaving = false; }
    });
  }

  copyCode(c: ClassRow) {
    navigator.clipboard.writeText(c.code).then(
      () => this.toast.success(`Đã chép mã lớp ${c.code}.`),
      () => this.toast.info(`Mã lớp: ${c.code}`)
    );
  }

  /** Lọc học viên theo tên/email (danh sách hệ thống nhỏ — lọc tại chỗ). */
  async searchStudents() {
    const q = this.searchQ.trim().toLowerCase();
    if (q.length < 2) { this.searchResults = []; return; }
    if (!this.allStudents.length) {
      const res = await this.http.get<any>('/api/users?role=Student').toPromise();
      this.allStudents = res?.data ?? [];
    }
    this.searchResults = this.allStudents
      .filter(s => s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
      .slice(0, 6);
  }

  /** Học viên đã nằm trong lớp (đã duyệt) chưa. */
  inClass(u: StudentRow): boolean {
    return this.students.some(s => s.id === u.id && s.status === 'Approved');
  }

  addStudent(c: ClassRow, u: StudentRow) {
    this.http.post<any>(`/api/classes/${c.id}/students`, [u.id]).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(`Đã thêm ${u.fullName} vào lớp.`);
          this.load();
          if (this.selected?.id === c.id) this.loadStudents(c);
          this.searchStudents();
        } else this.toast.error(res.error!);
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  /** Mời học viên bằng email — hiện mã lớp để gửi kèm (chưa nối email thật). */
  async invite(c: ClassRow) {
    const r = await this.modal.form({
      title: `Mời học viên bằng email — ${c.name}`,
      confirmText: 'Ghi nhận',
      fields: [{
        key: 'emails', label: 'Danh sách email (mỗi dòng một địa chỉ)', type: 'textarea',
        placeholder: 'an.nguyen@gmail.com\nbinh.tran@gmail.com'
      }]
    });
    if (!r) return;
    const n = String(r['emails'] ?? '').split('\n').filter(x => x.trim()).length;
    if (!n) { this.toast.error('Bạn chưa nhập email nào.'); return; }
    this.toast.info(`Hệ thống chưa nối email — hãy gửi mã lớp ${c.code} cho ${n} học viên qua Zalo/email.`);
  }

  async add() {
    const curs = await this.http.get<any>('/api/curriculums').toPromise();
    const options: [string, string][] = (curs?.data?.items ?? []).map((c: any) => [c.id, `${c.coverEmoji} ${c.nameVi}`]);
    if (!options.length) { this.toast.error('Cần tạo giáo trình trước.'); return; }
    const r = await this.modal.form({
      title: 'Tạo lớp mới', confirmText: 'Tạo lớp',
      fields: [
        { key: 'name', label: 'Tên lớp', placeholder: 'VD: Lớp A1 — Sơ cấp 1' },
        { key: 'curriculumId', label: 'Giáo trình', type: 'select', options },
        { key: 'schedule', label: 'Lịch học', placeholder: 'VD: T2 · T4 — 19:00' },
        { key: 'room', label: 'Phòng', placeholder: 'VD: P201' }
      ]
    });
    if (!r) return;
    this.http.post<any>('/api/classes', r).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã tạo lớp. Dùng mã lớp để học viên tự tham gia!'); this.load(); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  async enroll(c: ClassRow) {
    const usersRes = await this.http.get<any>('/api/users?role=Student').toPromise();
    const all: StudentRow[] = usersRes?.data ?? [];
    if (!all.length) { this.toast.error('Chưa có học viên nào trong hệ thống. Hãy tạo ở trang Người dùng.'); return; }
    const r = await this.modal.form({
      title: `Thêm học viên vào ${c.name}`,
      confirmText: 'Thêm vào lớp',
      fields: [{ key: 'studentId', label: 'Chọn học viên (duyệt ngay)', type: 'select', options: all.map((s) => [s.id, `${s.fullName} (${s.email})`] as [string, string]) }]
    });
    if (!r) return;
    this.http.post<any>(`/api/classes/${c.id}/students`, [r['studentId']]).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã thêm học viên.'); this.load(); if (this.selected?.id === c.id) this.loadStudents(c); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Thất bại')
    });
  }

  async toggleDetail(c: ClassRow) {
    if (this.selected?.id === c.id) { this.selected = null; return; }
    this.selected = c;
    this.tab = 'students';
    this.classAssignments = [];
    this.progress = null;
    this.searchQ = '';
    this.searchResults = [];
    await this.loadStudents(c);
    this.loadAttendance(c);
    this.loadSummary(c);
  }

  async loadStudents(c: ClassRow) {
    const detail = await this.http.get<any>(`/api/classes/${c.id}`).toPromise();
    this.students = detail?.data?.students ?? [];
  }

  loadAttendance(c: ClassRow) {
    this.attendance = [];
    this.http.get<any>(`/api/classes/${c.id}/attendance?date=${this.attDate}`).subscribe({
      next: (res) => { if (res.success) this.attendance = res.data; }
    });
  }

  loadSummary(c: ClassRow) {
    this.summary = [];
    this.http.get<any>(`/api/classes/${c.id}/attendance/summary`).subscribe({
      next: (res) => { if (res.success) this.summary = res.data; }
    });
  }

  pct(s: any): number {
    const total = s.present + s.late + s.absent;
    return total ? Math.round((s.present * 100) / total) : 0;
  }

  saveAttendance(c: ClassRow) {
    const marks = this.attendance.filter((a) => a.status).map((a) => ({ studentId: a.studentId, status: a.status }));
    if (!marks.length) { this.toast.error('Chưa chọn trạng thái cho ai.'); return; }
    this.http.post<any>(`/api/classes/${c.id}/attendance`, {
      date: this.attDate, marks
    }).subscribe({
      next: (res) => { if (res.success) { this.toast.success(`Đã lưu điểm danh ${marks.length} học viên.`); this.loadSummary(c); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Lưu thất bại')
    });
  }

  approve(c: ClassRow, s: StudentRow, ok: boolean) {
    this.http.post<any>(`/api/classes/${c.id}/students/${s.id}/approve`, ok).subscribe({
      next: (res) => { if (res.success) { this.toast.success(ok ? `Đã duyệt ${s.fullName}.` : 'Đã từ chối.'); this.load(); this.loadStudents(c); } else this.toast.error(res.error!); }
    });
  }

  async removeStudent(c: ClassRow, s: StudentRow) {
    if (!(await this.modal.confirm(`Xoá <b>${s.fullName}</b> khỏi lớp ${c.name}?`, 'Xoá', true))) return;
    this.http.delete<any>(`/api/classes/${c.id}/students/${s.id}`).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã xoá khỏi lớp.'); this.load(); this.loadStudents(c); } else this.toast.error(res.error!); }
    });
  }

  async del(c: ClassRow) {
    if (!(await this.modal.confirm(`Xoá lớp <b>${c.name}</b>?`, 'Xoá', true))) return;
    this.http.delete<any>(`/api/classes/${c.id}`).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Đã xoá lớp.'); this.selected = null; this.load(); } else this.toast.error(res.error!); },
      error: (e) => this.toast.error(e.error?.error ?? 'Xoá thất bại')
    });
  }
}

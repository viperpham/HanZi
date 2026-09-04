import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export type AppRole = 'Student' | 'Teacher' | 'Admin';

export function homeForRole(role: string | null | undefined): string {
  if (role === 'Student') return '/home';
  return role === 'Admin' ? '/admin' : '/dashboard';
}

/** Chỉ cần đăng nhập. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigate(['/login']);
  return false;
};

/**
 * Chặn theo vai trò — học viên không vào được màn quản trị,
 * giáo viên không vào được màn chỉ dành cho admin.
 * Giáo viên được giữ mọi quyền của học viên (theo tài liệu thiết kế).
 */
export function roleGuard(allowed: AppRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const toast = inject(ToastService);

    if (!auth.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    const role = auth.user()?.role ?? 'Student';
    if (allowed.includes(role as AppRole)) return true;

    toast.error('Bạn không có quyền truy cập màn hình này.');
    return router.parseUrl(homeForRole(role));
  };
}

/** Redirect trang chủ theo vai trò (cho route '/'). */
export const homeRedirect: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isLoggedIn()) return router.parseUrl('/login');
  return router.parseUrl(homeForRole(auth.user()?.role));
};

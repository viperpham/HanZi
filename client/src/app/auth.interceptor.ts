import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, share, switchMap, throwError } from 'rxjs';

let refresh$: Observable<boolean> | null = null;

/** Gia hạn access token bằng refresh token — chỉ gọi 1 lần cho nhiều request 401 cùng lúc. */
function refreshOnce(http: HttpClient): Observable<boolean> {
  if (refresh$) return refresh$;
  const refreshToken = localStorage.getItem('hz_refresh');
  if (!refreshToken) return of(false);
  refresh$ = http.post<any>('/api/auth/refresh', { refreshToken }).pipe(
    map((res) => !!res?.success),
    catchError(() => of(false)),
    finalize(() => (refresh$ = null)),
    share()
  );
  return refresh$;
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const http = inject(HttpClient);
  const router = inject(Router);

  // Đưa URL tuyệt đối (/api/...) về tương đối (/api/...)
  // → dev đi qua proxy.conf.json, production đi qua nginx
  const url = req.url.replace(/^http:\/\/localhost:5000/, '');
  const isAuthCall = url.startsWith('/api/auth/login') || url.startsWith('/api/auth/refresh');

  const token = localStorage.getItem('hz_token');
  const authReq = req.clone({
    url,
    setHeaders: token && !isAuthCall ? { Authorization: `Bearer ${token}` } : {}
  });

  return next(authReq).pipe(
    catchError((err) => {
      // Access token hết hạn (401) → thử gia hạn rồi gửi lại request gốc
      if (err.status !== 401 || isAuthCall) return throwError(() => err);

      return refreshOnce(http).pipe(
        switchMap((ok) => {
          if (!ok) {
            localStorage.removeItem('hz_token');
            localStorage.removeItem('hz_refresh');
            localStorage.removeItem('hz_user');
            router.navigate(['/login']);
            return throwError(() => err);
          }
          const newToken = localStorage.getItem('hz_token') ?? '';
          return next(req.clone({ url, setHeaders: { Authorization: `Bearer ${newToken}` } }));
        })
      );
    })
  );
};

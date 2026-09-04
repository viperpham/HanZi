import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

export interface UserInfo { id: string; fullName: string; email: string; role: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = 'http://localhost:5000/api/auth';
  user = signal<UserInfo | null>(this.loadUser());

  constructor(private http: HttpClient) {}

  private loadUser(): UserInfo | null {
    const raw = localStorage.getItem('hz_user');
    return raw ? JSON.parse(raw) : null;
  }

  isLoggedIn() { return !!localStorage.getItem('hz_token'); }

  login(email: string, password: string) {
    return this.http.post<any>(`${this.base}/login`, { email, password }).pipe(
      tap((res) => {
        if (res.success) {
          localStorage.setItem('hz_token', res.data.accessToken);
          localStorage.setItem('hz_refresh', res.data.refreshToken);
          localStorage.setItem('hz_user', JSON.stringify(res.data.user));
          this.user.set(res.data.user);
        }
      })
    );
  }

  logout() {
    // Thu hồi refresh token phía server (fire-and-forget) trước khi xoá local
    if (this.isLoggedIn()) {
      this.http.post(`${this.base}/logout`, {}).subscribe({ error: () => {} });
    }
    localStorage.removeItem('hz_token');
    localStorage.removeItem('hz_refresh');
    localStorage.removeItem('hz_user');
    this.user.set(null);
  }

  token() { return localStorage.getItem('hz_token') ?? ''; }
}

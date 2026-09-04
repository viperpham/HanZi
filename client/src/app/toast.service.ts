import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ToastService {
  show(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const icons: Record<string, string> = {
      success: '<i class="fa-solid fa-circle-check"></i>',
      error:   '<i class="fa-solid fa-circle-exclamation"></i>',
      info:    '<i class="fa-solid fa-circle-info"></i>'
    };
    const alertClass: Record<string, string> = {
      success: 'alert-success',
      error:   'alert-error',
      info:    'alert-info'
    };

    const root = document.getElementById('toast-root') ?? this.createRoot();
    const el = document.createElement('div');
    // DaisyUI alert style + slide-in animation
    el.className = `alert ${alertClass[type]} shadow-lg text-sm font-medium max-w-xs
                    translate-x-full opacity-0 transition-all duration-300`;
    el.style.cssText = 'pointer-events:auto; display:flex; align-items:center; gap:0.5rem;';
    el.innerHTML = `${icons[type]}<span>${message}</span>`;
    root.appendChild(el);

    // Trigger slide-in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.classList.remove('translate-x-full', 'opacity-0');
      });
    });

    // Auto dismiss
    const delay = type === 'error' ? 5000 : 3500;
    setTimeout(() => {
      el.classList.add('translate-x-full', 'opacity-0');
      setTimeout(() => el.remove(), 320);
    }, delay);
  }

  success(msg: string) { this.show(msg, 'success'); }
  info(msg: string)    { this.show(msg, 'info'); }
  error(msg: string)   { this.show(msg, 'error'); }

  private createRoot(): HTMLElement {
    const root = document.createElement('div');
    root.id = 'toast-root';
    // DaisyUI toast — góc phải trên
    root.className = 'toast toast-end toast-top z-[200]';
    root.style.cssText = 'gap: 0.5rem;';
    document.body.appendChild(root);
    return root;
  }
}

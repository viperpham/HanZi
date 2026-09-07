import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

export interface ModalField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'datetime-local' | 'number';
  placeholder?: string;
  value?: string;
  options?: [string, string][];
  hint?: string;
  disabled?: boolean;
}

export interface ModalResult { [key: string]: string; }

@Injectable({ providedIn: 'root' })
export class ModalService {

  /** Form modal cho Thêm/Sửa — responsive, cuộn mượt, không bị tràn màn hình mobile */
  form(opts: {
    title: string;
    fields: ModalField[];
    confirmText?: string;
  }): Promise<ModalResult | null> {
    return new Promise((resolve) => {
      const fieldsHtml = opts.fields.map((f) => {
        const inputBase = 'w-full px-3.5 py-2.5 rounded-xl text-sm border transition-all focus:outline-none';
        const activeClass = 'bg-base-100 border-base-300 focus:border-error focus:ring-2 focus:ring-error/20 text-base-content';
        const disabledClass = 'opacity-70 bg-base-200/80 border-dashed border-base-300 text-base-content/70 cursor-not-allowed select-none';
        const inputClass = `${inputBase} ${f.disabled ? disabledClass : activeClass}`;
        const disabledAttr = f.disabled ? 'disabled readonly' : '';

        const control = f.type === 'select'
          ? `<select data-k="${f.key}" class="${inputClass}" ${disabledAttr}>${(f.options ?? []).map(([v, l], i) =>
              `<option value="${v}" ${v === f.value || (f.value === undefined && i === 0) ? 'selected' : ''}>${l}</option>`).join('')}</select>`
          : f.type === 'textarea'
            ? `<textarea data-k="${f.key}" rows="3" placeholder="${f.placeholder ?? ''}"
                 class="${inputClass} resize-none" ${disabledAttr}>${f.value ?? ''}</textarea>`
            : `<input data-k="${f.key}" type="${f.type ?? 'text'}" value="${f.value ?? ''}"
                 placeholder="${f.placeholder ?? ''}" class="${inputClass}" ${disabledAttr}/>`;

        const hint = f.hint
          ? `<p class="text-xs text-base-content/50 mt-1 flex items-center gap-1.5"><i class="fa-solid fa-circle-info text-[11px] text-base-content/40"></i> ${f.hint}</p>`
          : '';

        return `
          <div class="space-y-1">
            <label class="block text-xs font-bold uppercase tracking-wider text-base-content/70">
              ${f.label}
            </label>
            ${control}
            ${hint}
          </div>`;
      }).join('');

      const root = this.buildModal(`
        <div class="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-base-200 bg-base-100 shrink-0">
          <div class="flex items-center gap-2.5">
            <span class="w-9 h-9 rounded-xl bg-error/10 text-error flex items-center justify-center text-sm font-bold">
              <i class="fa-solid fa-pen-to-square"></i>
            </span>
            <h3 class="text-lg font-extrabold text-base-content">${opts.title}</h3>
          </div>
          <button data-cancel class="btn btn-ghost btn-sm btn-circle text-base-content/40 hover:text-base-content">
            <i class="fa-solid fa-xmark text-base"></i>
          </button>
        </div>

        <form class="px-5 sm:px-6 py-4 overflow-y-auto flex-1 space-y-3.5 max-h-[60vh] sm:max-h-[65vh]">
          ${fieldsHtml}
        </form>

        <div class="px-5 sm:px-6 py-3.5 border-t border-base-200 bg-base-200/40 flex items-center justify-end gap-2.5 shrink-0">
          <button data-cancel type="button" class="btn btn-ghost btn-sm rounded-xl px-4 text-base-content/70 font-semibold">
            Huỷ bỏ
          </button>
          <button data-ok type="button" class="btn btn-error btn-sm text-white rounded-xl px-5 font-bold shadow-sm shadow-error/25 hover:shadow">
            <i class="fa-solid fa-check mr-1"></i> ${opts.confirmText ?? 'Lưu thay đổi'}
          </button>
        </div>
      `);

      const done = (v: ModalResult | null) => {
        root.classList.add('opacity-0');
        setTimeout(() => { root.remove(); document.removeEventListener('keydown', esc); }, 150);
        resolve(v);
      };

      const submit = () => {
        const values: ModalResult = {};
        root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[data-k]')
          .forEach((i) => (values[i.dataset['k']!] = i.value.trim()));
        done(values);
      };

      root.querySelector('[data-ok]')!.addEventListener('click', submit);
      root.querySelector('form')!.addEventListener('submit', (e) => { e.preventDefault(); submit(); });
      root.querySelectorAll('[data-cancel]').forEach(btn => btn.addEventListener('click', () => done(null)));
      root.addEventListener('click', (e) => { if (e.target === root) done(null); });

      const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') done(null); };
      document.addEventListener('keydown', esc);
    });
  }

  /** Modal xác nhận bằng SweetAlert2 — hoạt họa mượt mà, chuẩn thư viện chuyên nghiệp */
  async confirm(message: string, okText = 'Đồng ý', danger = false): Promise<boolean> {
    const res = await Swal.fire({
      title: danger ? 'Xác nhận xóa' : 'Xác nhận thao tác',
      html: message,
      icon: danger ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: danger ? '#dc2626' : '#2563eb',
      cancelButtonColor: '#6b7280',
      confirmButtonText: danger ? `<i class="fa-solid fa-trash mr-1.5"></i> ${okText}` : `<i class="fa-solid fa-check mr-1.5"></i> ${okText}`,
      cancelButtonText: 'Huỷ bỏ',
      reverseButtons: true,
      focusCancel: danger,
      customClass: {
        popup: 'rounded-2xl shadow-2xl border border-base-200 text-sm font-sans',
        confirmButton: danger ? 'btn btn-error text-white font-bold rounded-xl px-5' : 'btn btn-primary text-white font-bold rounded-xl px-5',
        cancelButton: 'btn btn-ghost rounded-xl px-4'
      }
    });
    return res.isConfirmed;
  }

  private buildModal(inner: string): HTMLElement {
    const root = document.createElement('div');
    root.className = 'fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 transition-opacity duration-150';
    root.style.cssText = 'background: rgba(0,0,0,0.55); backdrop-filter: blur(4px);';
    root.innerHTML = `
      <div class="bg-base-100 w-full max-w-lg shadow-2xl border border-base-200 rounded-2xl flex flex-col overflow-hidden max-h-[88vh]">
        ${inner}
      </div>`;
    document.body.appendChild(root);
    return root;
  }
}


import { Injectable } from '@angular/core';

export interface ModalField {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'select' | 'textarea';
  placeholder?: string;
  value?: string;
  options?: [string, string][];
  hint?: string;
}

export interface ModalResult { [key: string]: string; }

@Injectable({ providedIn: 'root' })
export class ModalService {
  /** Form modal cho Thêm/Sửa — trả về object giá trị, hoặc null nếu huỷ. */
  form(opts: {
    title: string;
    fields: ModalField[];
    confirmText?: string;
  }): Promise<ModalResult | null> {
    return new Promise((resolve) => {
      const fieldsHtml = opts.fields.map((f) => {
        const inputClass = 'input w-full text-sm';
        const selectClass = 'select w-full text-sm';
        const textareaClass = 'textarea w-full text-sm';

        const control = f.type === 'select'
          ? `<select data-k="${f.key}" class="${selectClass}">${(f.options ?? []).map(([v, l], i) =>
              `<option value="${v}" ${v === f.value || (f.value === undefined && i === 0) ? 'selected' : ''}>${l}</option>`).join('')}</select>`
          : f.type === 'textarea'
            ? `<textarea data-k="${f.key}" rows="3" placeholder="${f.placeholder ?? ''}"
                 class="${textareaClass}">${f.value ?? ''}</textarea>`
            : `<input data-k="${f.key}" type="${f.type ?? 'text'}" value="${f.value ?? ''}"
                 placeholder="${f.placeholder ?? ''}" class="${inputClass}"/>`;

        const hint = f.hint ? `<p class="text-xs text-base-content/40 mt-1">${f.hint}</p>` : '';
        return `
          <div class="form-control w-full">
            <label class="label py-1">
              <span class="label-text font-semibold text-sm">${f.label}</span>
            </label>
            ${control}
            ${hint}
          </div>`;
      }).join('');

      const root = this.build(`
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-extrabold text-base-content">${opts.title}</h3>
          <button data-cancel class="btn btn-ghost btn-sm btn-square">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <form class="space-y-1">${fieldsHtml}</form>
        <div class="modal-action mt-5">
          <button data-cancel class="btn btn-ghost">Huỷ</button>
          <button data-ok class="btn btn-error text-white">
            <i class="fa-solid fa-check mr-1"></i>${opts.confirmText ?? 'Lưu'}
          </button>
        </div>`);

      const done = (v: ModalResult | null) => {
        root.classList.add('opacity-0');
        setTimeout(() => { root.remove(); document.removeEventListener('keydown', esc); }, 200);
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

  /** Modal xác nhận (xoá…) — trả true nếu đồng ý. */
  confirm(message: string, okText = 'Đồng ý', danger = false): Promise<boolean> {
    return new Promise((resolve) => {
      const iconHtml = danger
        ? '<div class="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mb-3"><i class="fa-solid fa-triangle-exclamation text-error text-xl"></i></div>'
        : '<div class="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mb-3"><i class="fa-solid fa-circle-question text-warning text-xl"></i></div>';

      const root = this.build(`
        <div class="text-center">
          ${iconHtml}
          <h3 class="text-lg font-extrabold text-base-content mb-2">Xác nhận</h3>
          <p class="text-sm text-base-content/60">${message}</p>
        </div>
        <div class="modal-action mt-5 justify-center gap-3">
          <button data-cancel class="btn btn-ghost min-w-[80px]">Huỷ</button>
          <button data-ok class="btn ${danger ? 'btn-error' : 'btn-neutral'} text-white min-w-[80px]">
            ${danger ? '<i class="fa-solid fa-trash mr-1"></i>' : '<i class="fa-solid fa-check mr-1"></i>'}${okText}
          </button>
        </div>`);

      const done = (v: boolean) => {
        root.classList.add('opacity-0');
        setTimeout(() => { root.remove(); document.removeEventListener('keydown', esc); }, 200);
        resolve(v);
      };
      root.querySelector('[data-ok]')!.addEventListener('click', () => done(true));
      root.querySelector('[data-cancel]')!.addEventListener('click', () => done(false));
      root.addEventListener('click', (e) => { if (e.target === root) done(false); });
      const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') done(false); };
      document.addEventListener('keydown', esc);
    });
  }

  private build(inner: string): HTMLElement {
    const root = document.createElement('div');
    // DaisyUI modal-style backdrop
    root.className = 'fixed inset-0 z-[90] flex items-center justify-center p-4 transition-opacity duration-200';
    root.style.cssText = 'background: rgba(0,0,0,0.45); backdrop-filter: blur(2px);';
    root.innerHTML = `
      <div class="card bg-base-100 w-full max-w-md shadow-2xl border border-base-200">
        <div class="card-body p-6">${inner}</div>
      </div>`;
    document.body.appendChild(root);
    return root;
  }
}

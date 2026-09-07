import { Injectable, signal } from '@angular/core';
import { FileAsset } from './file.service';

export interface AssetPickerOptions {
  title?: string;
  /** 'image' chỉ ảnh, 'doc' chỉ tài liệu, 'any' cả hai */
  accept?: 'image' | 'doc' | 'any';
  /** cho chọn nhiều tệp (mặc định 1) */
  multiple?: boolean;
}

/**
 * Mở modal "Thư viện tài liệu" (component nằm trong app.component):
 *   const files = await picker.open({ accept: 'any', multiple: true });
 * Resolve danh sách tệp đã chọn; huỷ = null.
 */
@Injectable({ providedIn: 'root' })
export class AssetPickerService {
  state = signal<{ opts: AssetPickerOptions; resolve: (v: FileAsset[] | null) => void } | null>(null);

  open(opts: AssetPickerOptions = {}): Promise<FileAsset[] | null> {
    return new Promise((resolve) => this.state.set({ opts, resolve }));
  }

  /** Đóng modal — result = danh sách chọn hoặc null (huỷ). */
  close(result: FileAsset[] | null) {
    const cur = this.state();
    this.state.set(null);
    cur?.resolve(result);
  }
}

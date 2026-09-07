import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AssetPickerComponent } from './pages/asset-picker.component';

@Component({
  selector: 'app-root',
  standalone: true,
  // CHỈ 1 router-outlet duy nhất — layout sidebar nằm ở ShellComponent (route layout).
  // Trước đây @if hoán đổi 2 router-outlet làm màn login "dính" lại sau khi đăng nhập.
  imports: [RouterOutlet, AssetPickerComponent],
  template: `
    <router-outlet />

    <!-- Modal Thư viện tài liệu (dùng chung mọi trang) -->
    <asset-picker />
  `,
  styles: []
})
export class AppComponent {}

import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { TokenService } from '../../core/services/token.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-manager-layout',
  styleUrl: '../admin-layout/admin-layout.css',
  templateUrl: './manager-layout.html',
})
export class ManagerLayout {
  private readonly authService = inject(AuthService);
  private readonly tokenService = inject(TokenService);
  private readonly themeService = inject(ThemeService);

  sidebarCollapsed = false;

  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  get userEmail(): string {
    return this.tokenService.getEmail() || 'Manager';
  }

  get userName(): string {
    return this.userEmail.split('@')[0];
  }

  get employeeId(): number | null {
    const id = this.tokenService.getEmployeeId();
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.authService.logout();
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }
}

import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { ThemeService } from '../../core/services/theme.service';
import { RouterLink, RouterLinkActive, RouterModule } from '@angular/router';

@Component({
  imports: [RouterModule,RouterLink,RouterLinkActive],
  selector: 'app-hr-layout',
  styleUrl: './hr-layout.css',
  templateUrl: './hr-layout.html',
})
export class HrLayout {
  private readonly authService = inject(AuthService);
  private readonly tokenService = inject(TokenService);

  private readonly themeService = inject(ThemeService);
  get isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
  sidebarCollapsed = false;

  get userEmail(): string {
    return this.tokenService.getEmail() || 'Admin';
  }

  get userName(): string {
    return this.userEmail.split('@')[0];
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

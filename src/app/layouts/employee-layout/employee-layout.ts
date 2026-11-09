import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { TokenService } from '../../core/services/token.service';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-employee-layout',
  styleUrl: './employee-layout.css',
  templateUrl: './employee-layout.html',
})
export class EmployeeLayout {

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
      return this.tokenService.getEmail() || 'ُEmployee';
    }
  
    get userName(): string {
      return this.userEmail.split('@')[0];
    }

    get employeeId(): number | null {
      const id = this.tokenService.getEmployeeId();
      return Number.isSafeInteger(id) && id > 0 ? id : null;
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

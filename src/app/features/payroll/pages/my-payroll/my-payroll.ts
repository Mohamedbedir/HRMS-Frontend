import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PayrollResponse } from '../../models/payroll-response';
import { PayrollService } from '../../services/payroll.service';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  imports: [CommonModule, CurrencyPipe, DatePipe],
  selector: 'app-my-payroll',
  styleUrl: './my-payroll.css',
  templateUrl: './my-payroll.html',
})
export class MyPayroll implements OnInit {
  private readonly payrollService = inject(PayrollService);
  private readonly tokenService = inject(TokenService);
  private readonly router = inject(Router);

  readonly employeeId = this.tokenService.getEmployeeId();
  readonly payrolls = signal<PayrollResponse[]>([]);
  readonly loading = signal(true);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    if (!Number.isSafeInteger(this.employeeId) || this.employeeId <= 0) {
      this.loading.set(false);
      this.errorMessage.set('Your employee profile could not be identified. Please contact HR.');
      return;
    }

    this.loadPayrolls();
  }

  loadPayrolls(): void {
    if (!Number.isSafeInteger(this.employeeId) || this.employeeId <= 0) return;

    this.loading.set(true);
    this.errorMessage.set('');

    this.payrollService.getPayrollByEmployee(this.employeeId).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!response.succeeded || !Array.isArray(response.data)) {
          this.errorMessage.set(response.message || 'Your payroll records could not be loaded.');
          return;
        }
        this.payrolls.set(response.data);
      },
      error: (error: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'Your payroll records could not be loaded. Please try again.');
      },
    });
  }

  openPayrollDetails(payroll: PayrollResponse): void {
    const routePrefix = this.router.url.startsWith('/manager/') ? '/manager' : '/employee';
    void this.router.navigate([routePrefix, 'payroll', payroll.id]);
  }

  onRowKeydown(event: KeyboardEvent, payroll: PayrollResponse): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openPayrollDetails(payroll);
    }
  }

  monthName(month: number): string {
    return new Date(2000, month - 1, 1).toLocaleString('en', { month: 'long' });
  }

  statusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'approved':
        return 'status-success';
      case 'cancelled':
        return 'status-danger';
      case 'generated':
      case 'calculated':
        return 'status-info';
      default:
        return 'status-warning';
    }
  }
}

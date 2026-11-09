import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AttendanceService } from '../../services/attendance.service';
import { AttendanceResponse } from '../../models/Attendance-Response';
import { ToastrService } from '@relynn/ngx-toastr';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, timeout } from 'rxjs';
import { Router } from '@angular/router';
import { EmployeeApiService } from '../../../employees/services/Employee.Service';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  imports: [DatePipe, FormsModule],
  selector: 'app-attendance',
  styleUrl: './attendance.css',
  templateUrl: './attendance.html',
})
export class Attendance implements OnInit {
  private readonly requestTimeoutMs = 30_000;
  private readonly attendanceService = inject(AttendanceService);
  private readonly toastr=inject(ToastrService);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeApiService);
  private readonly tokenService = inject(TokenService);

  attendanceRecords = signal<AttendanceResponse[]>([]);

  loading = false;
  checkInSubmitting = signal(false);
  checkOutSubmitting = signal(false);
  errorMessage = '';
  successMessage = '';
  notes = '';

  fromDate = this.getToday();
  toDate = this.getToday();

  ngOnInit(): void {
    this.loadAttendance();
  }

  private getToday(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  loadAttendance(): void {
    this.loading = true;
    this.errorMessage = '';

    if (this.isManagerView) {
      this.loadManagerAttendance();
      return;
    }

    this.attendanceService
      .getMyAttendances()
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: response => {
          this.attendanceRecords.set(response.succeeded
            ? response.data ?? []
            : []);

          if (!response.succeeded) {
            this.errorMessage =
              response.message || 'Failed to load attendance records.';
            this.toastr.error(this.errorMessage, 'Error');
          }
        },
        error: error => {
          this.errorMessage = this.getRequestErrorMessage(
            error,
            'Failed to load attendance records.'
          );
          this.toastr.error(this.errorMessage, 'Error');
        }
      });
  }

  filterByDate(): void {
    if (!this.fromDate || !this.toDate) {
      this.errorMessage = 'Please select both dates.';
      this.toastr.error(this.errorMessage, 'Error');
      return;
    }

    if (this.fromDate > this.toDate) {
      this.errorMessage = 'From date cannot be after To date.';
      this.toastr.error(this.errorMessage, 'Error');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    if (this.isManagerView) {
      this.loadManagerAttendance(this.fromDate, this.toDate);
      return;
    }

    this.attendanceService.getMyAttendancesByDate(this.fromDate, this.toDate)
      .pipe(
        timeout({ first: this.requestTimeoutMs }),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: response => {
          this.attendanceRecords.set(response.succeeded
            ? response.data ?? []
            : []);

          if (!response.succeeded) {
            this.errorMessage =
              response.message || 'Failed to filter attendance records.';
            this.toastr.error(this.errorMessage, 'Error');
          }

        },
        error: error => {
          this.errorMessage = this.getRequestErrorMessage(
            error,
            'Failed to filter attendance records.'
          );
          this.toastr.error(this.errorMessage, 'Error');
        }
      });
  }

  get isManagerView(): boolean {
    return this.router.url.startsWith('/manager/');
  }

  private loadManagerAttendance(fromDate?: string, toDate?: string): void {
    const managerId = this.tokenService.getEmployeeId();
    if (!Number.isSafeInteger(managerId) || managerId <= 0) {
      this.handleManagerAttendanceError(
        'Your employee profile could not be identified. Please contact HR.',
      );
      return;
    }

    this.employeeService.GetAll().subscribe({
      next: (response) => {
        if (!response.succeeded || !Array.isArray(response.data)) {
          this.handleManagerAttendanceError(response.message || 'Failed to load your team.');
          return;
        }

        const employeeIds = [
          managerId,
          ...response.data
            .filter((employee) => employee.managerId === managerId)
            .map((employee) => employee.id),
        ];
        const requests = employeeIds.map((employeeId) =>
          fromDate && toDate
            ? this.attendanceService.getMyAttendancesByDate(fromDate, toDate, employeeId)
            : this.attendanceService.getMyAttendances(employeeId),
        );

        forkJoin(requests).subscribe({
          next: (responses) => {
            const failedResponse = responses.find(
              (item) => !item.succeeded || !Array.isArray(item.data),
            );
            if (failedResponse) {
              this.handleManagerAttendanceError(
                failedResponse.message || 'Failed to load attendance records.',
              );
              return;
            }

            this.attendanceRecords.set(responses.flatMap((item) => item.data ?? []));
            this.loading = false;
          },
          error: (error) => {
            this.handleManagerAttendanceError(
              this.getRequestErrorMessage(error, 'Failed to load attendance records.'),
            );
          },
        });
      },
      error: (error) => {
        this.handleManagerAttendanceError(
          this.getRequestErrorMessage(error, 'Failed to load your team.'),
        );
      },
    });
  }

  private handleManagerAttendanceError(message: string): void {
    this.loading = false;
    this.attendanceRecords.set([]);
    this.errorMessage = message;
    this.toastr.error(message, 'Error');
  }
  checkIn(): void {
    if (this.checkInSubmitting() || this.checkOutSubmitting()) {
      return;
    }

    this.checkInSubmitting.set(true);
    this.errorMessage = '';
    this.successMessage = '';

    this.attendanceService.checkIn({
      notes: this.notes.trim()
    }).pipe(
      timeout({ first: this.requestTimeoutMs }),
      finalize(() => this.checkInSubmitting.set(false))
    ).subscribe({
      next: response => {
        this.checkInSubmitting.set(false);

        if (!response.succeeded) {
          this.errorMessage = response.message || 'Check-in failed.';
          this.toastr.error(this.errorMessage, 'Error');
          return;
        }

        this.successMessage =
          response.message || response.data || 'Check-in completed successfully.';
        this.toastr.success(this.successMessage, 'Success');
        this.loadAttendance();
      },
      error: error => {
        this.checkInSubmitting.set(false);
        this.errorMessage = this.getRequestErrorMessage(error, 'Check-in failed.');
        this.toastr.error(this.errorMessage, 'Error');
        
      }
    });
  }

  checkOut(): void {
    if (this.checkInSubmitting() || this.checkOutSubmitting()) {
      return;
    }

    this.checkOutSubmitting.set(true);
    this.errorMessage = '';
    this.successMessage = '';

    this.attendanceService.checkOut().pipe(
      timeout({ first: this.requestTimeoutMs }),
      finalize(() => this.checkOutSubmitting.set(false))
    ).subscribe({
      next: response => {
        this.checkOutSubmitting.set(false);

        if (!response.succeeded) {
          this.errorMessage = response.message || 'Check-out failed.';
          this.toastr.error(this.errorMessage, 'Error');
          return;
        }

        this.successMessage =
          response.message || response.data || 'Check-out completed successfully.';
        this.toastr.success(this.successMessage, 'Success');
        this.loadAttendance();
      },
      error: error => {
        this.checkOutSubmitting.set(false);
        this.errorMessage = this.getRequestErrorMessage(error, 'Check-out failed.');
        this.toastr.error(this.errorMessage, 'Error');
      }
    });
  }

  formatAttendanceTime(value: string | null, missingLabel: string): string {
    if (!value) {
      return missingLabel;
    }

    const timeOnlyMatch = value.match(/^(\d{1,2}):(\d{2})(?::\d{2}(?:\.\d+)?)?$/);
    if (timeOnlyMatch) {
      const hours = Number(timeOnlyMatch[1]);
      const minutes = timeOnlyMatch[2];
      if (hours > 23 || hours < 0) {
        return value;
      }

      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${String(displayHours).padStart(2, '0')}:${minutes} ${period}`;
    }

    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  }

  private getRequestErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return 'The request timed out. Please try again.';
    }

    if (
      typeof error === 'object' &&
      error !== null &&
      'error' in error &&
      typeof error.error === 'object' &&
      error.error !== null &&
      'message' in error.error &&
      typeof error.error.message === 'string'
    ) {
      return error.error.message;
    }

    return fallback;
  }
}
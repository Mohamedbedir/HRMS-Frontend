import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastrService } from '@relynn/ngx-toastr';
import { LeaveCancelModal } from '../../components/leave-cancel-modal/leave-cancel-modal';
import { LeaveRequestModal } from '../../components/leave-request-modal/leave-request-modal';
import { LeaveRequest } from '../../models/leave-request.model';
import { LeaveRequestService } from '../../services/leave-request.service';
import { TokenService } from '../../../../core/services/token.service';

@Component({
  imports: [CommonModule, DatePipe, FormsModule, RouterLink, LeaveCancelModal, LeaveRequestModal],
  selector: 'app-my-leave-requests',
  styleUrl: './my-leave-requests.css',
  templateUrl: './my-leave-requests.html',
})
export class MyLeaveRequests implements OnInit {
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly tokenService = inject(TokenService);
  private readonly toastr = inject(ToastrService);

  readonly requests = signal<LeaveRequest[]>([]);
  readonly loading = signal(false);
  readonly actionLoading = signal(false);
  readonly createModalOpen = signal(false);
  readonly selectedRequest = signal<LeaveRequest | null>(null);

  searchTerm = '';
  statusFilter = 'all';
  errorMessage = '';

  get routePrefix(): '/employee' {
    return '/employee';
  }

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    const employeeId = this.tokenService.getEmployeeId();
    if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
      this.loading.set(false);
      this.requests.set([]);
      this.errorMessage = 'Could not identify your employee account. Please sign in again.';
      this.toastr.error(this.errorMessage, 'Error');
      return;
    }

    this.loading.set(true);
    this.errorMessage = '';
    this.leaveRequestService.getByEmployee(employeeId).subscribe({
      next: (response) => {
        this.loading.set(false);
        if (!response.succeeded) {
          this.requests.set([]);
          this.errorMessage = response.message || 'Failed to load your leave requests.';
          this.toastr.error(this.errorMessage, 'Error');
          return;
        }

        this.requests.set(response.data ?? []);
      },
      error: (error) => {
        this.loading.set(false);
        this.requests.set([]);
        this.errorMessage = error?.error?.message || 'An error occurred while loading your leave requests.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }

  filteredRequests(): LeaveRequest[] {
    const search = this.searchTerm.trim().toLowerCase();
    return this.requests().filter((request) => {
      const matchesStatus =
        this.statusFilter === 'all' || request.status.toLowerCase() === this.statusFilter;
      const matchesSearch =
        !search ||
        [request.leaveType, request.reason, request.status].some((value) =>
          value?.toLowerCase().includes(search),
        );
      return matchesStatus && matchesSearch;
    });
  }

  countByStatus(status: string): number {
    return this.requests().filter((request) => request.status.toLowerCase() === status).length;
  }

  onRowKeydown(event: KeyboardEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('button, a, input, select, textarea')) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  }

  openCancel(request: LeaveRequest): void {
    this.selectedRequest.set(request);
  }

  closeCancel(): void {
    if (!this.actionLoading()) {
      this.selectedRequest.set(null);
    }
  }

  cancelRequest(): void {
    const request = this.selectedRequest();
    if (!request || this.actionLoading()) return;

    this.actionLoading.set(true);
    this.leaveRequestService.cancel({ leaveRequestId: request.id }).subscribe({
      next: (response) => {
        this.actionLoading.set(false);
        if (!response.succeeded) {
          this.toastr.error(response.message || 'Failed to cancel the request.', 'Action failed');
          return;
        }

        this.toastr.success('Leave request cancelled successfully.', 'Success');
        this.closeCancel();
        this.loadRequests();
      },
      error: (error) => {
        this.actionLoading.set(false);
        this.toastr.error(
          error?.error?.message || 'Failed to cancel the request.',
          'Action failed',
        );
      },
    });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-pending';
    }
  }
}

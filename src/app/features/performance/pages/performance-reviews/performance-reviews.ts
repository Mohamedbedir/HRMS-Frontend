import { Component, inject, OnInit, signal } from '@angular/core';
import { PerformanceReviewResponse } from '../../models/performance-review.model';
import { PerformanceReviewService } from '../../services/performance-review.service';
import { ToastrService } from '@relynn/ngx-toastr';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { PerformanceReviewCreateModal } from '../../components/performance-review-create-modal/performance-review-create-modal';
import { managementRoutePrefix } from '../../../../core/utils/management-route';
import { EmployeeApiService } from '../../../employees/services/Employee.Service';
import { TokenService } from '../../../../core/services/token.service';
import { forkJoin } from 'rxjs';

@Component({
  imports: [DatePipe, PerformanceReviewCreateModal],
  selector: 'app-performance-reviews',
  styleUrl: './performance-reviews.css',
  templateUrl: './performance-reviews.html',
})
export class PerformanceReviews implements OnInit {
  private readonly reviewService = inject(PerformanceReviewService);
  private readonly toastr = inject(ToastrService);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeApiService);
  private readonly tokenService = inject(TokenService);

  reviews = signal<PerformanceReviewResponse[]>([]);

  loading = signal(false);
  errorMessage = signal('');
  isCreateModalOpen = signal(false);

  get isManagerView(): boolean {
    return this.router.url.startsWith('/manager/');
  }

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    if (this.router.url.startsWith('/manager/')) {
      this.loadManagerReviews();
      return;
    }

    this.reviewService.getAll().subscribe({
      next: (response) => {
        if (response.succeeded) {
          this.reviews.set(response.data ?? []) ;
        } else {
          this.reviews.set([]);
          this.errorMessage.set(response.message || 'Failed to load performance reviews.');
          this.toastr.error(this.errorMessage(), 'Error');
        }

        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.errorMessage.set(error?.error?.message || 'An error occurred while loading reviews.');
        this.toastr.error(this.errorMessage(), 'Error')
      },
    });
  }

  private loadManagerReviews(): void {
    const managerId = this.tokenService.getEmployeeId();
    if (!Number.isSafeInteger(managerId) || managerId <= 0) {
      this.failToLoadReviews('Your employee profile could not be identified. Please contact HR.');
      return;
    }

    this.employeeService.GetAll().subscribe({
      next: (response) => {
        if (!response.succeeded || !Array.isArray(response.data)) {
          this.failToLoadReviews(response.message || 'Failed to load your team.');
          return;
        }

        const employeeIds = response.data
          .filter((employee) => employee.managerId === managerId)
          .map((employee) => employee.id);

        if (employeeIds.length === 0) {
          this.reviews.set([]);
          this.loading.set(false);
          return;
        }

        forkJoin(employeeIds.map((id) => this.reviewService.getByEmployee(id))).subscribe({
          next: (responses) => {
            const failedResponse = responses.find((item) => !item.succeeded);
            if (failedResponse) {
              this.failToLoadReviews(failedResponse.message || 'Failed to load performance reviews.');
              return;
            }

            this.reviews.set(responses.flatMap((item) => item.data ?? []));
            this.loading.set(false);
          },
          error: (error) => {
            this.failToLoadReviews(
              error?.error?.message || 'An error occurred while loading reviews.',
            );
          },
        });
      },
      error: (error) => {
        this.failToLoadReviews(error?.error?.message || 'Failed to load your team.');
      },
    });
  }

  private failToLoadReviews(message: string): void {
    this.loading.set(false);
    this.reviews.set([]);
    this.errorMessage.set(message);
    this.toastr.error(message, 'Error');
  }

  getScoreClass(score: number): string {
    if (score === 5) return 'text-bg-success';
    if (score >= 3) return 'text-bg-warning';  
    return 'text-bg-danger';
  }

  onReviewCreated(): void {
    this.isCreateModalOpen.set(false);
    this.loadReviews();
  }

  openReview(id: number): void {
    void this.router.navigate([
      managementRoutePrefix(this.router),
      'performance-reviews',
      id,
    ]);
  }
}

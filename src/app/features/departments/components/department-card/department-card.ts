import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { managementRoutePrefix } from '../../../../core/utils/management-route';
import { DepartmentResponse } from '../../models/department-response';

@Component({
  imports: [RouterLink],
  selector: 'app-department-card',
  styleUrl: './department-card.css',
  templateUrl: './department-card.html',
})
export class DepartmentCard {
  private readonly router = inject(Router);

  @Input({ required: true }) department!: DepartmentResponse;

  @Output() edit = new EventEmitter<DepartmentResponse>();
  @Output() delete = new EventEmitter<DepartmentResponse>();

  get routePrefix(): '/admin' | '/hr' | '/manager' {
    return managementRoutePrefix(this.router);
  }
}

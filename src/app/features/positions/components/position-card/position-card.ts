import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { managementRoutePrefix } from '../../../../core/utils/management-route';
import { PositionResponse } from '../../models/Position-response';

@Component({
  imports: [RouterLink],
  selector: 'app-position-card',
  styleUrl: './position-card.css',
  templateUrl: './position-card.html',
})
export class PositionCard {
  private readonly router = inject(Router);

  @Input({ required: true }) position!: PositionResponse;

  @Output() edit = new EventEmitter<PositionResponse>();
  @Output() delete = new EventEmitter<PositionResponse>();

  get routePrefix(): '/admin' | '/hr' {
    return managementRoutePrefix(this.router);
  }
}

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PluginFunction } from '../../services/plugin.service';

@Component({
  selector: 'app-function-selector',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Loading shimmer -->
    <div class="fn-selector" *ngIf="loading">
      <div class="shimmer-pill"></div>
      <div class="shimmer-pill"></div>
      <div class="shimmer-pill short"></div>
    </div>

    <!-- Error state -->
    <div class="fn-selector fn-error" *ngIf="!loading && error">
      <span class="error-icon">⚠️</span>
      <span class="error-msg">{{ error }}</span>
      <button class="btn-retry" (click)="retryClicked.emit()">Retry</button>
    </div>

    <!-- Tab strip -->
    <div class="fn-selector" *ngIf="!loading && !error && functions.length > 0">
      <button
        *ngFor="let fn of functions"
        class="fn-tab"
        [class.active]="fn.name === selectedName"
        (click)="selectFunction(fn)"
        (mouseenter)="hoveredDescription = fn.description"
        (mouseleave)="hoveredDescription = ''"
        [title]="fn.description"
      >
        {{ fn.label }}
      </button>
    </div>

    <!-- Description tooltip -->
    <div class="fn-description" *ngIf="hoveredDescription" [class.visible]="!!hoveredDescription">
      {{ hoveredDescription }}
    </div>
  `,
  styleUrls: ['./function-selector.component.scss']
})
export class FunctionSelectorComponent implements OnChanges {
  @Input() functions: PluginFunction[] = [];
  @Input() loading = false;
  @Input() error   = '';

  @Output() functionSelected = new EventEmitter<PluginFunction>();
  @Output() retryClicked     = new EventEmitter<void>();

  selectedName    = '';
  hoveredDescription = '';

  ngOnChanges(changes: SimpleChanges) {
    // When functions load for the first time, auto-select the first one
    if (changes['functions'] && this.functions.length > 0 && !this.selectedName) {
      this.selectFunction(this.functions[0]);
    }
    // Reset when loading a new plugin (functions becomes [])
    if (changes['functions'] && this.functions.length === 0) {
      this.selectedName = '';
    }
  }

  selectFunction(fn: PluginFunction) {
    this.selectedName = fn.name;
    this.functionSelected.emit(fn);
  }
}

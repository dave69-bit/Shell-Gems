import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { PluginService, PluginInfo, PluginFunction, PluginParam } from '../../services/plugin.service';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { FunctionSelectorComponent } from '../function-selector/function-selector.component';
import { ResultViewerComponent } from '../result-viewer/result-viewer.component';

@Component({
  selector: 'app-side-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DynamicFormComponent,
    FunctionSelectorComponent,
    ResultViewerComponent
  ],
  template: `
    <div class="overlay" *ngIf="isOpen" (click)="close()"></div>
    <div class="panel" [class.open]="isOpen">

      <!-- ── Header ── -->
      <div class="panel-header" *ngIf="plugin">
        <div class="header-left">
          <img *ngIf="plugin.iconPath" [src]="plugin.iconPath" alt="icon"
               onerror="this.src='./favicon.ico'" class="plugin-icon"/>
          <div *ngIf="!plugin.iconPath" class="placeholder-icon"></div>
          <h2>{{ plugin.name }}</h2>
        </div>
        <button class="btn-close" (click)="close()">✕</button>
      </div>

      <!-- ── Function Selector ── -->
      <app-function-selector
        *ngIf="plugin"
        [functions]="functions"
        [loading]="loadingFunctions"
        [error]="functionsError"
        (functionSelected)="onFunctionSelected($event)"
        (retryClicked)="loadFunctions()">
      </app-function-selector>

      <!-- ── Body (param form) ── -->
      <div class="panel-body">
        <!-- Loading params -->
        <div class="state-container loading-state" *ngIf="loadingParams">
          <div class="skeleton-shimmer"></div>
          <div class="skeleton-shimmer"></div>
          <div class="skeleton-shimmer short"></div>
        </div>

        <!-- Error fetching params -->
        <div class="state-container error-state" *ngIf="paramsError">
          <span class="error-icon">⚠️</span>
          <p>{{ paramsError }}</p>
          <button class="btn-outline" (click)="loadParams()">Retry</button>
        </div>

        <!-- Dynamic form -->
        <div class="form-area" *ngIf="!loadingParams && !paramsError && schema.length > 0">
          <app-dynamic-form [schema]="schema" [form]="form" [functionName]="selectedFunctionName">
          </app-dynamic-form>
        </div>

        <div class="form-area" *ngIf="!loadingParams && !paramsError && schema.length === 0 && selectedFunctionName">
          <p class="text-muted">No parameters for this function.</p>
        </div>
      </div>

      <!-- ── Result Viewer ── -->
      <app-result-viewer
        *ngIf="plugin"
        [result]="executeResult"
        [loading]="executing"
        [executeError]="executeError">
      </app-result-viewer>

      <!-- ── Footer ── -->
      <div class="panel-footer" *ngIf="!loadingFunctions && !functionsError && selectedFunctionName">
        <div class="inline-error" *ngIf="executeError && !executing">{{ executeError }}</div>
        <button class="btn-execute"
                [disabled]="form.invalid || executing || (schema.length > 0 && !selectedFunctionName)"
                (click)="onExecute()">
          <span class="btn-spinner" *ngIf="executing"></span>
          {{ executing ? 'Executing…' : 'Execute' }}
        </button>
      </div>

    </div>
  `,
  styleUrls: ['./side-panel.component.scss']
})
export class SidePanelComponent implements OnChanges {
  @Input() plugin: PluginInfo | null = null;
  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();

  // Function-level state
  functions:        PluginFunction[] = [];
  loadingFunctions  = false;
  functionsError    = '';
  selectedFunctionName = '';

  // Param-level state
  schema:       PluginParam[] = [];
  form:         FormGroup     = new FormGroup({});
  loadingParams = false;
  paramsError   = '';

  // Execute state
  executing    = false;
  executeResult: any  = null;
  executeError  = '';

  constructor(private pluginService: PluginService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['plugin'] && this.plugin && this.isOpen) {
      this.resetAll();
      this.loadFunctions();
    }
  }

  close() {
    this.resetAll();
    this.closed.emit();
  }

  resetAll() {
    this.functions            = [];
    this.loadingFunctions     = false;
    this.functionsError       = '';
    this.selectedFunctionName = '';
    this.schema               = [];
    this.form                 = new FormGroup({});
    this.loadingParams        = false;
    this.paramsError          = '';
    this.executing            = false;
    this.executeResult        = null;
    this.executeError         = '';
  }

  // ── Load function list ──────────────────────────────────────────────────

  async loadFunctions() {
    if (!this.plugin) return;
    this.loadingFunctions = true;
    this.functionsError   = '';
    this.functions        = [];

    try {
      const resp = await this.pluginService.getFunctions(this.plugin.id);
      if (resp.success) {
        this.functions = resp.functions;
        // FunctionSelectorComponent auto-selects first and emits; we wait for that event
      } else {
        this.functionsError = resp.error || 'Could not load functions';
      }
    } catch (e: any) {
      this.functionsError = e.message || 'Failed to load functions';
    } finally {
      this.loadingFunctions = false;
    }
  }

  // ── Function selected ───────────────────────────────────────────────────

  onFunctionSelected(fn: PluginFunction) {
    if (fn.name === this.selectedFunctionName) return; // no-op if same tab
    this.selectedFunctionName = fn.name;
    // Reset form, params, and result when switching functions
    this.schema        = [];
    this.form          = new FormGroup({});
    this.paramsError   = '';
    this.executeResult = null;
    this.executeError  = '';
    this.loadParams();
  }

  // ── Load param schema ───────────────────────────────────────────────────

  async loadParams() {
    if (!this.plugin || !this.selectedFunctionName) return;
    this.loadingParams = true;
    this.paramsError   = '';

    try {
      const resp = await this.pluginService.getParams(this.plugin.id, this.selectedFunctionName);
      if (resp.success) {
        this.schema = resp.params;
        this.buildForm();
      } else {
        this.paramsError = resp.error || 'Could not load parameters';
      }
    } catch (e: any) {
      this.paramsError = e.message || 'Failed to fetch parameters';
    } finally {
      this.loadingParams = false;
    }
  }

  buildForm() {
    const group: any = {};
    for (const p of this.schema) {
      const validators = [];
      if (p.required)                               validators.push(Validators.required);
      if (p.type === 'number' && p.min !== undefined) validators.push(Validators.min(p.min));
      if (p.type === 'number' && p.max !== undefined) validators.push(Validators.max(p.max));
      let initial = p.defaultValue ?? '';
      if (p.type === 'boolean') initial = p.defaultValue ?? false;
      group[p.key] = new FormControl(initial, validators);
    }
    this.form = new FormGroup(group);
  }

  // ── Execute ─────────────────────────────────────────────────────────────

  async onExecute() {
    if (!this.plugin || !this.selectedFunctionName) return;
    this.executing    = true;
    this.executeError  = '';
    this.executeResult = null; // clear previous

    try {
      const resp = await this.pluginService.execute(
        this.plugin.id,
        this.selectedFunctionName,
        this.form.value
      );
      if (resp.success) {
        this.executeResult = resp.result;
      } else {
        this.executeError = resp.error || 'Execute failed';
      }
    } catch (e: any) {
      this.executeError = e.message || 'DLL method threw an exception';
    } finally {
      this.executing = false;
    }
  }
}

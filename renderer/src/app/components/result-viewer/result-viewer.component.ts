import {
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxJsonViewerModule } from 'ngx-json-viewer';

type ResultState = 'empty' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-result-viewer',
  standalone: true,
  imports: [CommonModule, NgxJsonViewerModule],
  template: `
    <!-- Container only renders when not empty -->
    <div class="result-viewer" [class.visible]="state !== 'empty'">

      <!-- Toolbar row -->
      <div class="result-toolbar" *ngIf="state !== 'empty'">
        <span class="result-label">RESULT</span>
        <div class="toolbar-actions" *ngIf="state === 'success'">
          <button class="tb-btn" (click)="expandAll()" title="Expand all">⊞ Expand</button>
          <button class="tb-btn" (click)="collapseAll()" title="Collapse all">⊟ All</button>
          <button class="tb-btn copy-btn" (click)="copyJson()">
            {{ copyLabel }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div class="result-loading" *ngIf="state === 'loading'">
        <div class="spinner"></div>
        <span>Executing…</span>
      </div>

      <!-- Error -->
      <div class="result-error" *ngIf="state === 'error'">
        {{ errorMessage }}
      </div>

      <!-- JSON tree -->
      <div class="result-tree" *ngIf="state === 'success'">
        <ngx-json-viewer
          [json]="displayData"
          [expanded]="expanded"
          [depth]="expandDepth">
        </ngx-json-viewer>
      </div>

    </div>
  `,
  styleUrls: ['./result-viewer.component.scss']
})
export class ResultViewerComponent implements OnChanges {
  /** Pass null = empty; undefined = keep previous; raw result object = show */
  @Input() result:   any        = null;
  @Input() loading   = false;
  @Input() executeError = '';

  state:        ResultState = 'empty';
  displayData:  any         = {};
  rawJsonString = '';
  errorMessage  = '';

  // ngx-json-viewer expanded flag & depth trick
  expanded    = false;
  expandDepth = 1;    // 1 = first level only collapsed by default

  copyLabel = '⎘ Copy JSON';
  private copyTimer: any;

  ngOnChanges(changes: SimpleChanges) {
    if (this.loading) {
      this.state = 'loading';
      return;
    }

    if (this.executeError) {
      this.state        = 'error';
      this.errorMessage = this.executeError;
      return;
    }

    if (this.result !== null && this.result !== undefined && !this.loading) {
      // 1. Keep raw result for copying (no _meta)
      const { _meta, ...rawBody } = this.result as any;
      this.rawJsonString = JSON.stringify(rawBody, null, 2);

      // 2. Process for display using _meta if present
      this.displayData = this.applyMetaHints(rawBody, _meta);
      
      this.state         = 'success';
      this.expanded      = false;
      this.expandDepth   = 1;
    }

    if (!this.loading && !this.executeError && this.result === null) {
      this.state = 'empty';
    }
  }

  private applyMetaHints(data: any, meta: any): any {
    if (!meta || typeof data !== 'object' || data === null) return data;

    // We create a display-friendly version of the object
    const display: any = Array.isArray(data) ? [] : {};

    for (const key of Object.keys(data)) {
      const value = data[key];
      const hint  = meta[key];

      // Deep nesting check
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        display[hint?.label || key] = this.applyMetaHints(value, null); 
        continue;
      }

      let formattedValue = value;

      if (hint && hint.format) {
        switch (hint.format) {
          case 'bytes':      formattedValue = this.formatBytes(value); break;
          case 'percent':    formattedValue = (Number(value) * 100).toFixed(1) + '%'; break;
          case 'boolean':    formattedValue = value ? '✅ Yes' : '❌ No'; break;
          case 'date':       formattedValue = this.formatDate(value); break;
          case 'base64file': formattedValue = `[Download: ${hint.filename || 'file'}]`; break;
        }
      } else if (hint && hint.unit) {
        formattedValue = `${value} ${hint.unit}`;
      } else if (typeof value === 'number') {
        formattedValue = value.toLocaleString();
      }

      display[hint?.label || key] = formattedValue;
    }

    return display;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 bytes';
    const k = 1024;
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private formatDate(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + 
             ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  }

  expandAll() {
    this.expanded    = true;
    this.expandDepth = 999;
  }

  collapseAll() {
    this.expanded    = false;
    this.expandDepth = 1;
  }

  copyJson() {
    navigator.clipboard.writeText(this.rawJsonString).then(() => {
      this.copyLabel = '✓ Copied';
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => (this.copyLabel = '⎘ Copy JSON'), 1500);
    });
  }
}

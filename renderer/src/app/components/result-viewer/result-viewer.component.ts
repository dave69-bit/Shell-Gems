import {
  Component,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';

type ResultState = 'empty' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-json-node',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="json-node" *ngFor="let entry of entries">
      <div class="json-row" (click)="toggle(entry)">
        <span class="indent" [style.paddingLeft.px]="depth * 16"></span>
        <span class="chevron" [class.expanded]="entry.open"
              *ngIf="isExpandable(entry.value)">▶</span>
        <span class="chevron-placeholder" *ngIf="!isExpandable(entry.value)"></span>
        <span class="json-key">{{ entry.key }}</span>
        <span class="json-sep">:&nbsp;</span>

        <!-- Collapsed summary for objects/arrays -->
        <span class="json-summary" *ngIf="isExpandable(entry.value) && !entry.open">
          {{ summary(entry.value) }}
        </span>

        <!-- Leaf values -->
        <span *ngIf="!isExpandable(entry.value)"
              [class]="'json-val ' + typeClass(entry.value)">
          {{ display(entry.value) }}
        </span>
      </div>

      <!-- Recursion for expanded objects/arrays -->
      <app-json-node
        *ngIf="isExpandable(entry.value) && entry.open"
        [data]="entry.value"
        [depth]="depth + 1"
        [forceExpand]="forceExpand"
        [forceCollapse]="forceCollapse">
      </app-json-node>
    </div>
  `,
  styles: []
})
export class JsonNodeComponent implements OnChanges {
  @Input() data: any        = {};
  @Input() depth            = 0;
  @Input() forceExpand      = 0;  // increment to expand all
  @Input() forceCollapse    = 0;  // increment to collapse all

  entries: { key: string; value: any; open: boolean }[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.buildEntries();
    }
    if (changes['forceExpand'] && !changes['forceExpand'].firstChange) {
      this.entries.forEach(e => { if (this.isExpandable(e.value)) e.open = true; });
    }
    if (changes['forceCollapse'] && !changes['forceCollapse'].firstChange) {
      this.entries.forEach(e => e.open = false);
    }
  }

  buildEntries() {
    if (Array.isArray(this.data)) {
      this.entries = this.data.map((v, i) => ({ key: `[${i}]`, value: v, open: false }));
    } else if (this.data && typeof this.data === 'object') {
      this.entries = Object.keys(this.data).map(k => ({ key: k, value: this.data[k], open: false }));
    } else {
      this.entries = [];
    }
  }

  toggle(entry: { key: string; value: any; open: boolean }) {
    if (this.isExpandable(entry.value)) entry.open = !entry.open;
  }

  isExpandable(v: any): boolean {
    return v !== null && typeof v === 'object';
  }

  summary(v: any): string {
    if (Array.isArray(v))  return `[ ${v.length} item${v.length === 1 ? '' : 's'} ]`;
    const keys = Object.keys(v);
    return `{ ${keys.length} key${keys.length === 1 ? '' : 's'} }`;
  }

  typeClass(v: any): string {
    if (v === null)            return 'null';
    if (typeof v === 'string') return 'string';
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    return '';
  }

  display(v: any): string {
    if (v === null)            return 'null';
    if (typeof v === 'string') return `"${v}"`;
    return String(v);
  }
}


@Component({
  selector: 'app-result-viewer',
  standalone: true,
  imports: [CommonModule, JsonNodeComponent],
  template: `
    <div class="result-viewer" [class.visible]="state !== 'empty'">

      <!-- Toolbar -->
      <div class="result-toolbar" *ngIf="state !== 'empty'">
        <span class="result-label">RESULT</span>
        <div class="toolbar-actions" *ngIf="state === 'success'">
          <button class="tb-btn" (click)="expandAll()">⊞ Expand</button>
          <button class="tb-btn" (click)="collapseAll()">⊟ All</button>
          <button class="tb-btn copy-btn" (click)="copyJson()">{{ copyLabel }}</button>
        </div>
      </div>

      <!-- Loading -->
      <div class="result-loading" *ngIf="state === 'loading'">
        <div class="spinner"></div>
        <span>Executing…</span>
      </div>

      <!-- Error -->
      <div class="result-error" *ngIf="state === 'error'">{{ errorMessage }}</div>

      <!-- JSON Tree -->
      <div class="result-tree" *ngIf="state === 'success'">
        <app-json-node
          [data]="displayData"
          [depth]="0"
          [forceExpand]="expandTick"
          [forceCollapse]="collapseTick">
        </app-json-node>
      </div>

    </div>
  `,
  styleUrls: ['./result-viewer.component.scss']
})
export class ResultViewerComponent implements OnChanges {
  @Input() result: any       = null;
  @Input() loading           = false;
  @Input() executeError      = '';

  state:         ResultState = 'empty';
  displayData:   any         = {};
  rawJsonString  = '';
  errorMessage   = '';

  expandTick   = 0;
  collapseTick = 0;

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

    if (this.result !== null && this.result !== undefined) {
      const { _meta, ...rawBody } = this.result as any;
      this.rawJsonString = JSON.stringify(rawBody, null, 2);
      this.displayData   = this.applyMetaHints(rawBody, _meta);
      this.state         = 'success';
    }

    if (!this.loading && !this.executeError && this.result === null) {
      this.state = 'empty';
    }
  }

  expandAll()   { this.expandTick++;   }
  collapseAll() { this.collapseTick++; }

  copyJson() {
    navigator.clipboard.writeText(this.rawJsonString).then(() => {
      this.copyLabel = '✓ Copied';
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => (this.copyLabel = '⎘ Copy JSON'), 1500);
    });
  }

  private applyMetaHints(data: any, meta: any): any {
    if (!meta || typeof data !== 'object' || data === null) return data;
    const display: any = Array.isArray(data) ? [] : {};
    for (const key of Object.keys(data)) {
      const value = data[key];
      const hint  = meta[key];
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        display[hint?.label || key] = this.applyMetaHints(value, null);
        continue;
      }
      let formatted = value;
      if (hint?.format) {
        switch (hint.format) {
          case 'bytes':      formatted = this.formatBytes(value);  break;
          case 'percent':    formatted = (Number(value) * 100).toFixed(1) + '%'; break;
          case 'boolean':    formatted = value ? '✅ Yes' : '❌ No'; break;
          case 'date':       formatted = this.formatDate(value);   break;
          case 'base64file': formatted = `[Download: ${hint.filename || 'file'}]`; break;
        }
      } else if (hint?.unit) {
        formatted = `${value} ${hint.unit}`;
      } else if (typeof value === 'number') {
        formatted = value.toLocaleString();
      }
      display[hint?.label || key] = formatted;
    }
    return display;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 bytes';
    const k = 1024, sizes = ['bytes', 'KB', 'MB', 'GB'];
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
}

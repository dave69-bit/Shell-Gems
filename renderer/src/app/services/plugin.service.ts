import { Injectable } from '@angular/core';

// ── Data models ───────────────────────────────────────────────────────────────

export interface PluginInfo {
  id: string;
  name: string;
  iconPath: string;
  status: 'active' | 'error' | 'pending';
  error?: string;
}

export interface PluginFunction {
  name: string;        // exact method name used for reflection dispatch
  label: string;       // human-readable tab label
  description: string; // tooltip text
}

export interface PluginParam {
  key: string;
  type: 'text' | 'number' | 'boolean' | 'range' | 'file';
  label: string;
  defaultValue?: any;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  accept?: string;
  maxSizeKb?: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PluginService {

  /** Returns all plugins found in plugins/dlls/ */
  async listPlugins(): Promise<{ success: boolean; plugins: PluginInfo[]; error?: string }> {
    return (window as any).electronAPI.invoke('plugins:list');
  }

  /** Returns the list of functions exposed by a plugin */
  async getFunctions(
    pluginId: string
  ): Promise<{ success: boolean; pluginId: string; functions: PluginFunction[]; error?: string }> {
    return (window as any).electronAPI.invoke('plugins:functions', { pluginId });
  }

  /** Returns the parameter schema for a specific function */
  async getParams(
    pluginId: string,
    functionName: string
  ): Promise<{ success: boolean; pluginId: string; functionName: string; params: PluginParam[]; error?: string }> {
    return (window as any).electronAPI.invoke('plugins:params', { pluginId, functionName });
  }

  /** Executes a named function and returns the JSON result object */
  async execute(
    pluginId: string,
    functionName: string,
    params: Record<string, unknown>
  ): Promise<{ success: boolean; pluginId: string; functionName: string; result?: any; error?: string }> {
    return (window as any).electronAPI.invoke('plugins:execute', { pluginId, functionName, params });
  }
}

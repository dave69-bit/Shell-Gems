import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

process.env.EDGE_USE_CORECLR = '1';
const edge = require('electron-edge-js');

import { logError } from '../logger';

// Each cached plugin entry holds three edge-js bound methods
interface PluginMethods {
  getFunctions: ((payload: any, cb: (err: any, res: any) => void) => void) | null;
  getParams:    ((payload: any, cb: (err: any, res: any) => void) => void) | null;
  execute:      ((payload: any, cb: (err: any, res: any) => void) => void) | null;
}

const _pluginMethods: { [pluginId: string]: PluginMethods } = {};

function getDllPath(pluginId: string): string {
  if (app.isPackaged) {
    return path.join(path.dirname(app.getPath('exe')), 'plugins', 'dlls', `${pluginId}.dll`);
  }
  return path.join(app.getAppPath(), 'plugins', 'dlls', `${pluginId}.dll`);
}

function getTypeName(pluginId: string): string {
  // Convention: Shell_Gems.Plugins.<pluginId (no hyphens)>Plugin
  return `Shell_Gems.Plugins.${pluginId.replace(/-/g, '')}Plugin`;
}

async function loadMethod(pluginId: string, methodName: string): Promise<any> {
  const dllPath = getDllPath(pluginId);
  if (!fs.existsSync(dllPath)) {
    const errObj = new Error(`DLL for plugin '${pluginId}' not found at ${dllPath}`);
    logError(`Missing DLL Error`, errObj);
    throw errObj;
  }
  try {
    return edge.func({
      assemblyFile: dllPath,
      typeName:     getTypeName(pluginId),
      methodName:   methodName
    });
  } catch (e: any) {
    let errorMessage = e.message || 'Unknown error';
    if (errorMessage.includes('edge.initializeClrFunc is not a function')) {
      errorMessage += '\n\n[MISSING PREREQUISITES ERROR]: The required .NET Framework or .NET Core runtime was not found on this machine. Please install the correct .NET runtime to allow plugins to load.';
    }
    const robustError = `Failed to load method '${methodName}' from ${pluginId}.dll: ${errorMessage}`;
    logError(`[LoadMethod Error] pluginId: ${pluginId}, methodName: ${methodName}`, robustError);
    throw new Error(robustError);
  }
}

function ensureEntry(pluginId: string) {
  if (!_pluginMethods[pluginId]) {
    _pluginMethods[pluginId] = { getFunctions: null, getParams: null, execute: null };
  }
}

function callMethod(fn: (payload: any, cb: (err: any, res: any) => void) => void, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    fn(payload, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getPluginFunctions(pluginId: string): Promise<any> {
  ensureEntry(pluginId);
  if (!_pluginMethods[pluginId].getFunctions) {
    _pluginMethods[pluginId].getFunctions = await loadMethod(pluginId, 'GetFunctions');
  }
  return callMethod(_pluginMethods[pluginId].getFunctions!, null);
}

export async function getPluginParams(pluginId: string, functionName: string): Promise<any> {
  ensureEntry(pluginId);
  if (!_pluginMethods[pluginId].getParams) {
    _pluginMethods[pluginId].getParams = await loadMethod(pluginId, 'GetParams');
  }
  return callMethod(_pluginMethods[pluginId].getParams!, { functionName });
}

export async function executePlugin(
  pluginId: string,
  functionName: string,
  parameters: Record<string, unknown>
): Promise<any> {
  ensureEntry(pluginId);
  if (!_pluginMethods[pluginId].execute) {
    _pluginMethods[pluginId].execute = await loadMethod(pluginId, 'Execute');
  }
  return callMethod(_pluginMethods[pluginId].execute!, { functionName, parameters });
}

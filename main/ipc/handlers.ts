import { ipcMain } from 'electron';
import { scanPlugins } from './pluginScanner';
import { getPluginFunctions, getPluginParams, executePlugin } from './pluginLoader';

export function registerIpcHandlers() {

  // ── plugins:list ──────────────────────────────────────────────────────────
  ipcMain.handle('plugins:list', async () => {
    try {
      const plugins = scanPlugins();

      // Health-check: try GetFunctions to verify the DLL is loadable
      for (const p of plugins) {
        try {
          await getPluginFunctions(p.id);
          p.status = 'active';
        } catch (e: any) {
          p.status = 'error';
          p.error  = e.message || 'Failed to initialize plugin';
        }
      }

      return { success: true, plugins };
    } catch (error: any) {
      return { success: false, error: error.message || 'Could not scan plugins directory' };
    }
  });

  // ── plugins:functions ─────────────────────────────────────────────────────
  ipcMain.handle('plugins:functions', async (_event, payload: { pluginId: string }) => {
    try {
      const { pluginId } = payload;
      const raw = await getPluginFunctions(pluginId);
      const functions = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { success: true, pluginId, functions };
    } catch (error: any) {
      return {
        success: false,
        error: `Plugin '${payload?.pluginId}' could not be loaded: ${error.message}`
      };
    }
  });

  // ── plugins:params ────────────────────────────────────────────────────────
  ipcMain.handle('plugins:params', async (_event, payload: { pluginId: string; functionName: string }) => {
    try {
      const { pluginId, functionName } = payload;
      const raw = await getPluginParams(pluginId, functionName);
      const params = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return { success: true, pluginId, functionName, params };
    } catch (error: any) {
      return {
        success: false,
        error: `Function '${payload?.functionName}' not found on plugin '${payload?.pluginId}': ${error.message}`
      };
    }
  });

  // ── plugins:execute ───────────────────────────────────────────────────────
  ipcMain.handle(
    'plugins:execute',
    async (_event, payload: { pluginId: string; functionName: string; params: Record<string, unknown> }) => {
      try {
        const { pluginId, functionName, params } = payload;
        const raw = await executePlugin(pluginId, functionName, params ?? {});
        const result = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return { success: true, pluginId, functionName, result };
      } catch (error: any) {
        return {
          success: false,
          error: `DLL method '${payload?.functionName}' threw an exception: ${error.message}`
        };
      }
    }
  );
}

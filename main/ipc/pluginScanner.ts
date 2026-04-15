import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface PluginInfo {
  id: string;
  name: string;
  iconPath: string;
  status: 'active' | 'error' | 'pending';
  error?: string;
}

export function scanPlugins(): PluginInfo[] {
  let pluginsDir = path.join(app.getAppPath(), 'plugins');
  if (app.isPackaged) {
    pluginsDir = path.join(path.dirname(app.getPath('exe')), 'plugins');
  }
  
  const dllsDir = path.join(pluginsDir, 'dlls');
  const iconsDir = path.join(pluginsDir, 'icons');
  
  // Debug logging
  try {
    const logPath = path.join(app.getPath('userData'), 'plugin-scanner.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Scanning: ${dllsDir}\n`);
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] Exists: ${fs.existsSync(dllsDir)}\n`);
  } catch (e) {}
  
  const plugins: PluginInfo[] = [];

  try {
    if (!fs.existsSync(dllsDir)) {
      console.warn(`DLL directory not found: ${dllsDir}`);
      return plugins;
    }

    const files = fs.readdirSync(dllsDir);
    const dllFiles = files.filter(f => f.toLowerCase().endsWith('.dll'));

    for (const file of dllFiles) {
      const id = path.parse(file).name;
      const name = id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const iconPathRelative = `plugins/icons/${id}.png`;
      const iconPathAbsolute = path.join(iconsDir, `${id}.png`);
      
      plugins.push({
        id,
        name,
        iconPath: fs.existsSync(iconPathAbsolute) ? iconPathRelative : '',
        status: 'pending'
      });
    }
  } catch (error: any) {
    console.error('Error scanning plugins directory:', error);
  }

  return plugins;
}

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export function logError(message: string, error?: any) {
  const logDir = app.isPackaged 
    ? path.dirname(app.getPath('exe'))
    : path.join(app.getAppPath(), '..'); // app.getAppPath() goes to the root when unpackaged usually or dist depending on setup. let's just use root for unpackaged.
  
  // Since getAppPath returns diff depending on how it's run, let's just use userData for reliable logging 
  // or a file next to exe. For standalone, user usually wants the log next to the portable exe.
  const portableLogDir = app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
  
  const logFile = path.join(portableLogDir, 'shell-gems-error.log');
  
  const timestamp = new Date().toISOString();
  const errorDetails = error ? (typeof error === 'string' ? error : (error.stack || error.message || error.toString())) : '';
  let logLine = `[${timestamp}] ERROR: ${message}`;
  if (errorDetails) {
    logLine += `\n${errorDetails}`;
  }
  logLine += `\n\n`;

  console.error(logLine);
  
  try {
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch (e) {
    console.error('Failed to write to log file:', e);
  }
}

export function logInfo(message: string) {
  const logDir = app.isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath();
  const logFile = path.join(logDir, 'shell-gems-app.log');
  const logLine = `[${new Date().toISOString()}] INFO: ${message}\n`;
  console.log(logLine);
  try {
    fs.appendFileSync(logFile, logLine, 'utf8');
  } catch(e) {
    console.error('Failed to write to log file:', e);
  }
}

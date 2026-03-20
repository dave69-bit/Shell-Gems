import { app } from 'electron';
import { scanPlugins } from './ipc/pluginScanner';
import { getPluginFunctions, getPluginParams, executePlugin } from './ipc/pluginLoader';

app.whenReady().then(async () => {
    console.log('\n--- START REDESIGN INTEGRATION TEST ---\n');
    
    // 1. Scan
    const plugins = scanPlugins();
    console.log('Scanned plugins:', plugins.map(p => p.id));
  
    for (const p of plugins) {
        console.log(`\n>>> Testing Plugin: ${p.id} <<<`);
        try {
            // 2. Get Functions
            const functions = await getPluginFunctions(p.id);
            console.log(`Functions found:`, functions.map((f: any) => f.name));

            for (const fn of functions) {
                // 3. Get Params for each function
                console.log(`  - Fetching Params for '${fn.name}'...`);
                const params = await getPluginParams(p.id, fn.name);
                console.log(`  - Params schema loaded for '${fn.name}':`, params.length, 'keys found');

                // 4. Execute a sample (e.g. Echo or Calculate if it exists)
                if (fn.name === 'Echo') {
                   console.log(`  - Executing 'Echo'...`);
                   const res = await executePlugin(p.id, 'Echo', { message: 'Integration Test', flag: true });
                   console.log(`  - Echo Result:`, JSON.stringify(res, null, 2));
                } else if (fn.name === 'Calculate') {
                   console.log(`  - Executing 'Calculate' (12 + 8)...`);
                   const res = await executePlugin(p.id, 'Calculate', { num1: 12, num2: 8, op: '+' });
                   console.log(`  - Calculate Result:`, JSON.stringify(res, null, 2));
                }
            }
        } catch (e: any) {
            console.error(`Error with plugin ${p.id}:`, e.message);
        }
    }
  
    console.log('\n--- REDESIGN TEST COMPLETE ---\n');
    process.exit(0);
});

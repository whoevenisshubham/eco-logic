const fs = require('fs');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = dir + '/' + file;
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      if (name.endsWith('.tsx')) {
        files.push(name);
      }
    }
  }
  return files;
}

const components = getFiles('src/components');
components.forEach(file => {
  let content = fs.readFileSync(file, 'utf-8');
  let original = content;

  // Change specific components we haven't touched fully yet
  if (!file.includes('TimeSeriesEnergyChart') && !file.includes('EnergyHeatmapEditor') && !file.includes('App') && !file.includes('NavBar') && !file.includes('GreenGenieChat') && !file.includes('EnergyComplexityRadar')) {
      content = content.replace(/className=\"panel-header([^\"]*)\"/g, 'className=\"panel-header drag-handle cursor-grab active:cursor-grabbing border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between\"');

      content = content.replace(/text-xs/g, 'text-[13px]');
      content = content.replace(/text-\[10px\]/g, 'text-[11px]');
      content = content.replace(/text-\[9px\]/g, 'text-[10px]');
      
      content = content.replace(/className=\"panel-title\"/g, 'className=\"panel-title font-semibold text-[14px]\"');
  }

  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log('Updated UI in', file);
  }
});
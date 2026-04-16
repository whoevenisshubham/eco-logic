import fs from 'fs';
import path from 'path';

const componentsDir = path.join(process.cwd(), 'src/components');
const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(componentsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replacements for typography
  content = content.replace(/text-\[9px\]/g, 'text-xs');
  content = content.replace(/text-\[10px\]/g, 'text-xs');

  // Replacements for colors
  content = content.replace(/#6366f1/g, '#4f46e5'); // Indigo
  // Emerald #10b981, Amber #f59e0b, Rose #f43f5e, Sky #0ea5e9 are mostly correct already.
  
  // Replacements for tooltips (D3 text/html tooltips and Recharts)
  // Let's find specific tooltip classes
  content = content.replace(/class=\\"tooltip-title\\"/g, 'class="tooltip-title text-slate-700 font-semibold mb-1"');
  
  // Update D3 tooltips css style strings if they exist, or className
  content = content.replace(/className="absolute tooltip/g, 'className="absolute tooltip bg-white border border-slate-200 shadow-lg rounded-xl text-slate-700 p-3 ');
  
  // Recharts Tooltip
  content = content.replace(/contentStyle=\{\{(.*?)\}\}/g, "contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', color: '#334155', padding: '12px', fontWeight: 500, fontSize: '12px' }}");

  fs.writeFileSync(filePath, content);
}
console.log('Done component replacements');

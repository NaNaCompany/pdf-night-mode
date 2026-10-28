import {finalizePublicSite} from './publisher-tracking.mjs';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'src'),dist=path.join(root,'docs');
if(path.dirname(dist)!==root||path.basename(dist)!=='docs')throw new Error('Invalid build target');
await fs.mkdir(dist,{recursive:true});await fs.cp(source,dist,{recursive:true});
const app=JSON.parse(await fs.readFile(path.join(root,'APP.json'),'utf8'));
const locales=JSON.parse(await fs.readFile(path.join(source,'locales.json'),'utf8'));
const version=createHash('sha256').update(await fs.readFile(path.join(source,'app.js'))).update(await fs.readFile(path.join(source,'style.css'))).digest('hex').slice(0,12);
const template=await fs.readFile(path.join(source,'index.html'),'utf8');
const originalLicense=await fs.readFile(path.join(source,'licenses.html'),'utf8');
const legal=[...originalLicense.matchAll(/<pre>([\s\S]*?)<\/pre>/g)].map(m=>m[1]);
if(legal.length!==2)throw new Error('Expected both library license notices');
const labels={ko:'한국어',en:'English',ja:'日本語',zh:'中文',es:'Español',de:'Deutsch',fr:'Français',pt:'Português',ru:'Русский'};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const route=lang=>lang==='ko'?'/':'/'+lang+'/';
let urls=[];
for(const lang of app.languages){
 const t=locales[lang],base=lang==='ko'?'./':'../',directory=lang==='ko'?dist:path.join(dist,lang);
 await fs.mkdir(directory,{recursive:true});
 const url=app.origin+route(lang);
 const metadata=`<link rel="canonical" href="${url}">`+app.languages.map(l=>`<link rel="alternate" hreflang="${l}" href="${app.origin+route(l)}">`).join('')+`<link rel="alternate" hreflang="x-default" href="${app.origin}/">`;
 const languageOptions=app.languages.map(l=>`<option value="${base}${l==='ko'?'':l+'/'}"${l===lang?' selected':''}>${labels[l]}</option>`).join('');
 const values={...t,lang,base,version,metadata,languageOptions,translations:JSON.stringify(t).replaceAll('<',String.fromCharCode(92)+'u003c')};
 const raw=new Set(['metadata','languageOptions','translations']);
 const html=template.replace(/\{\{(\w+)\}\}/g,(_,key)=>{if(!(key in values))throw new Error('Missing '+key);return raw.has(key)?values[key]:esc(values[key]);});
 await fs.writeFile(path.join(directory,'index.html'),html);
 const licensing=`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(t.licenseTitle)}</title><link rel="stylesheet" href="${base}style.css"></head><body><main class="licenses"><a href="./">← ${esc(t.back)}</a><h1>${esc(t.licenseTitle)}</h1><p>${esc(t.licenseDescription)}</p><h2>PDF.js · Apache 2.0</h2><a href="https://github.com/mozilla/pdf.js">PDF.js</a><pre>${legal[0]}</pre><h2>PDF-LIB · MIT</h2><a href="https://github.com/Hopding/pdf-lib">PDF-LIB</a><pre>${legal[1]}</pre></main></body></html>`;
 await fs.writeFile(path.join(directory,'licenses.html'),licensing);urls.push(url);
}
await fs.writeFile(path.join(dist,'robots.txt'),'User-agent: *\nAllow: /\nSitemap: '+app.origin+'/sitemap.xml\n');
await fs.writeFile(path.join(dist,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+urls.map(url=>'<url><loc>'+url+'</loc></url>').join('')+'</urlset>\n');
console.log(JSON.stringify({status:'built',app:app.slug,languages:app.languages,pages:urls.length}));

console.log(JSON.stringify({publisher_pages:await finalizePublicSite(dist,app)}));

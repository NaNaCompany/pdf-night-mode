import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {THEMES,mapPixels,parsePages,renderPage,convertPdf} from '../src/core.js';
const require=createRequire(import.meta.url),base=process.env.NANA_TEST_NODE_MODULES;
const dep=name=>require(base?path.join(base,name):name);
const {createCanvas}=dep('@napi-rs/canvas');
const {PDFDocument,rgb,degrees,StandardFonts}=dep('pdf-lib');
const pdfjs=await import(base?pathToFileURL(path.join(base,'pdfjs-dist/legacy/build/pdf.mjs')).href:'pdfjs-dist/legacy/build/pdf.mjs');
fs.mkdirSync(new URL('../artifacts/',import.meta.url),{recursive:true});
async function fixture(){
  const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
  const first=pdf.addPage([300,200]);first.drawRectangle({x:0,y:0,width:300,height:200,color:rgb(1,1,1)});first.drawRectangle({x:20,y:20,width:50,height:50,color:rgb(0,0,0)});first.drawRectangle({x:100,y:20,width:50,height:50,color:rgb(1,0,0)});first.drawText('READABLE PDF',{x:20,y:140,size:20,font});
  const second=pdf.addPage([200,300]);second.setRotation(degrees(90));second.drawText('ROTATED PAGE',{x:15,y:150,size:15,font});
  const bytes=await pdf.save();fs.writeFileSync(new URL('../artifacts/source.pdf',import.meta.url),bytes);
  return pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,standardFontDataUrl:base?path.join(base,'pdfjs-dist/standard_fonts').replaceAll('\\','/')+'/' : undefined}).promise;
}
test('page ranges preserve requested order and reject invalid ranges',()=>{
  assert.deepEqual(parsePages('',3),[1,2,3]);assert.deepEqual(parsePages('3, 1-2, 3',3),[3,1,2]);
  for(const text of ['0','4','2-1','1,,2','1.5','a','-1'])assert.throws(()=>parsePages(text,3),/pageRange/);
});
test('white, black and transparent pixels map exactly to every selected theme',()=>{
  for(const {bg,fg} of Object.values(THEMES)){
    const data=new Uint8ClampedArray([255,255,255,255,0,0,0,255,20,80,180,0]);mapPixels(data,bg,fg);
    const hex=offset=>'#'+Array.from(data.slice(offset,offset+3)).map(n=>n.toString(16).padStart(2,'0')).join('');
    assert.equal(hex(0),bg);assert.equal(hex(4),fg);assert.equal(hex(8),bg);assert.equal(data[11],255);
  }
});
test('saved PDFs contain transformed pixels, correct count and rotated dimensions',async()=>{
  const original=await fixture();
  try{
    for(const [name,theme] of Object.entries(THEMES)){
      const progress=[];
      const bytes=await convertPdf(original,PDFDocument,{pages:[1,2],...theme,dpi:96,createCanvas,onProgress:n=>progress.push(n)});
      assert.deepEqual(progress,[1,2]);
      fs.writeFileSync(new URL('../artifacts/'+name+'.pdf',import.meta.url),bytes);
      const converted=await pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false}).promise;
      assert.equal(converted.numPages,2);
      for(const n of [1,2]){
        const page=await converted.getPage(n),view=page.getViewport({scale:1});assert.equal(view.width,300);assert.equal(view.height,200);
        const {canvas}=await renderPage(page,{dpi:72,createCanvas});
        const pixel=canvas.getContext('2d').getImageData(5,5,1,1).data;
        const hex='#'+Array.from(pixel.slice(0,3)).map(v=>v.toString(16).padStart(2,'0')).join('');assert.equal(hex,theme.bg);
        const content=await page.getTextContent();assert.equal(content.items.length,0);
        if(n===1)fs.writeFileSync(new URL('../artifacts/'+name+'.png',import.meta.url),canvas.toBuffer('image/png'));
        canvas.width=canvas.height=1;
      }
      await converted.destroy();
    }
  } finally {await original.destroy();}
});
test('cancellation, page limits and identical colors fail without partial output',async()=>{
  const original=await fixture();
  try{
    await assert.rejects(convertPdf(original,PDFDocument,{pages:[1],...THEMES.black,createCanvas,shouldCancel:()=>true}),/cancelled/);
    await assert.rejects(convertPdf(original,PDFDocument,{pages:Array(101).fill(1),...THEMES.black,createCanvas}),/pageLimit/);
    await assert.rejects(convertPdf(original,PDFDocument,{pages:[1],bg:'#000000',fg:'#000000',createCanvas}),/sameColors/);
  }finally{await original.destroy();}
});

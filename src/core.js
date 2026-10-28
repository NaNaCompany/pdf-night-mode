export const THEMES = {
  black: {bg:'#000000', fg:'#ffffff'},
  gray: {bg:'#2b2d31', fg:'#ededeb'},
  blue: {bg:'#142238', fg:'#e8edf4'},
  sepia: {bg:'#30251e', fg:'#f5e6ce'},
};
export function hexRgb(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new Error('invalidColor');
  return [1,3,5].map(i => parseInt(hex.slice(i,i+2),16));
}
export function parsePages(input, total) {
  if (!Number.isInteger(total) || total < 1) throw new Error('invalidPdf');
  if (!String(input).trim()) return Array.from({length:total},(_,i)=>i+1);
  const found = new Set();
  for (const token of String(input).split(',')) {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(token);
    if (!match) throw new Error('pageRange');
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > total) throw new Error('pageRange');
    for (let n = start; n <= end; n++) found.add(n);
  }
  return [...found];
}
export function mapPixels(data, bgHex, fgHex) {
  const bg = hexRgb(bgHex), fg = hexRgb(fgHex);
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i+3] / 255;
    const luminance = (.2126 * data[i] + .7152 * data[i+1] + .0722 * data[i+2]) * a + 255 * (1-a);
    const ink = 1 - luminance / 255;
    for (let c=0;c<3;c++) data[i+c] = Math.round(bg[c] + (fg[c]-bg[c])*ink);
    data[i+3] = 255;
  }
  return data;
}
export function pageScale(page, dpi) {
  const base = page.getViewport({scale:1});
  const wanted = Math.max(72,Math.min(216,Number(dpi) || 144)) / 72;
  const scale = Math.min(wanted, Math.sqrt(8000000/(base.width*base.height)), 6000/Math.max(base.width,base.height));
  return {base, viewport:page.getViewport({scale})};
}
const cancelled = () => { throw new Error('cancelled'); };
export async function renderPage(page, {dpi=144,bg,fg,createCanvas,shouldCancel=()=>false}) {
  if (shouldCancel()) cancelled();
  const {base,viewport} = pageScale(page,dpi);
  const canvas = createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext('2d', {willReadFrequently:true});
  context.fillStyle='#ffffff'; context.fillRect(0,0,canvas.width,canvas.height);
  await page.render({canvas,canvasContext:context,viewport,background:'rgb(255,255,255)'}).promise;
  if (shouldCancel()) {canvas.width=canvas.height=1; cancelled();}
  if (bg && fg) {
    const pixels=context.getImageData(0,0,canvas.width,canvas.height);
    mapPixels(pixels.data,bg,fg); context.putImageData(pixels,0,0);
  }
  return {canvas,width:base.width,height:base.height};
}
export async function convertPdf(document, PDFDocument, {pages,bg,fg,dpi,createCanvas,shouldCancel=()=>false,onProgress=()=>{}}) {
  if (!pages.length || pages.length>100) throw new Error('pageLimit');
  hexRgb(bg); hexRgb(fg);
  if (bg.toLowerCase()===fg.toLowerCase()) throw new Error('sameColors');
  let pixels=0;
  for (const n of pages) {
    if (shouldCancel()) cancelled();
    const page=await document.getPage(n), {viewport}=pageScale(page,dpi);
    pixels+=Math.ceil(viewport.width)*Math.ceil(viewport.height);
  }
  if (pixels>220000000) throw new Error('pixelLimit');
  const output=await PDFDocument.create();
  output.setTitle('PDF dark color conversion');
  for (let i=0;i<pages.length;i++) {
    if (shouldCancel()) cancelled();
    const source=await document.getPage(pages[i]);
    const {canvas,width,height}=await renderPage(source,{dpi,bg,fg,createCanvas,shouldCancel});
    const image=await output.embedPng(canvas.toDataURL('image/png'));
    const page=output.addPage([width,height]);
    page.drawImage(image,{x:0,y:0,width,height});
    canvas.width=canvas.height=1;
    onProgress(i+1,pages.length);
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  if (shouldCancel()) cancelled();
  return output.save();
}

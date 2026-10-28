import * as pdfjs from './vendor/pdf.mjs';
import {PDFDocument} from './vendor/pdf-lib.mjs';
import {THEMES,mapPixels,parsePages,renderPage,convertPdf} from './core.js';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.mjs',import.meta.url).href;
const $=id=>document.getElementById(id);
const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
let doc=null,sourceFile=null,loadingTask=null,current=1,busy=false,abort=false,previewToken=0,loadToken=0;
const T=JSON.parse(document.getElementById('translations').textContent);
const t=(key,params={})=>T[key].replace(/\{(\w+)\}/g,(_,name)=>String(params[name]??''));
const messages=Object.fromEntries(['pageRange','pageLimit','pixelLimit','sameColors','cancelled','invalidColor'].map(key=>[key,t(key)]));
$('language').addEventListener('change',event=>{location.href=event.target.value;});
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function controls(){ $('convert').disabled=!doc||busy;$('prev').disabled=!doc||busy||current<=1;$('next').disabled=!doc||busy||current>=doc.numPages;for(const e of document.querySelectorAll('.controls input,.controls select,.theme,#retry'))e.disabled=busy;$('cancel').hidden=!busy;$('progress').hidden=!busy; }
async function showPreview(){
  if(!doc||busy)return;
  const token=++previewToken;
  try{
    const page=await doc.getPage(current);
    $('pageLabel').textContent=`${current} / ${doc.numPages}`;controls();
    const {canvas}=await renderPage(page,{dpi:72,createCanvas:makeCanvas});
    if(token!==previewToken){canvas.width=canvas.height=1;return;}
    const original=$('original'),processed=$('processed');
    original.width=processed.width=canvas.width;original.height=processed.height=canvas.height;
    original.getContext('2d').drawImage(canvas,0,0);
    const ctx=processed.getContext('2d'),image=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
    mapPixels(image.data,$('bg').value,$('fg').value);ctx.putImageData(image,0,0);
    canvas.width=canvas.height=1;$('empty').hidden=true;$('canvases').hidden=false;$('preview').classList.remove('empty');
  }catch(error){if(token===previewToken)status(t('previewError'),true);}
}
async function load(file){
  if(busy)return;
  const token=++loadToken,password=$('password').value;++previewToken;
  doc=null;sourceFile=file;current=1;controls();
  $('empty').hidden=false;$('canvases').hidden=true;$('pageLabel').textContent='— / —';
  if(loadingTask){const old=loadingTask;loadingTask=null;try{await old.destroy();}catch{}}
  if(token!==loadToken)return;
  $('fileInfo').textContent=file?file.name:t('fileHint');
  if(!file)return;
  if(file.size>80*1024*1024){status(t('fileSize'),true);return;}
  try{
    status(t('loading'));
    const bytes=new Uint8Array(await file.arrayBuffer());
    if(token!==loadToken)return;
    if(!new TextDecoder('latin1').decode(bytes.subarray(0,1024)).includes('%PDF-'))throw new Error('invalidPdf');
    const base=new URL('./vendor/',import.meta.url);
    loadingTask=pdfjs.getDocument({data:bytes,password,isEvalSupported:false,cMapUrl:new URL('cmaps/',base).href,cMapPacked:true,standardFontDataUrl:new URL('standard_fonts/',base).href,wasmUrl:new URL('wasm/',base).href,enableXfa:false});
    const task=loadingTask,loaded=await task.promise;
    if(token!==loadToken){await loaded.destroy();return;}
    doc=loaded;$('fileInfo').textContent=t('fileLoaded',{name:file.name,pages:doc.numPages,size:(file.size/1048576).toFixed(1)});
    status(t('ready'));controls();await showPreview();
  }catch(error){
    if(token!==loadToken)return;
    doc=null;controls();
    status(error.name==='PasswordException'?t('passwordError'):t('invalidPdf'),true);
  }
}
$('file').addEventListener('change',e=>{$('password').value='';load(e.target.files[0]);});
$('retry').addEventListener('click',()=>{if(sourceFile)load(sourceFile);});
for(const event of ['dragover','drop'])$('dropzone').addEventListener(event,e=>{e.preventDefault();if(event==='drop'&&!busy){const files=e.dataTransfer.files;if(files.length!==1){status(t('singleFile'),true);return;}$('password').value='';load(files[0]);}});
for(const button of document.querySelectorAll('.theme'))button.addEventListener('click',()=>{const theme=THEMES[button.dataset.theme];$('bg').value=theme.bg;$('fg').value=theme.fg;for(const b of document.querySelectorAll('.theme')){const selected=b===button;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));}showPreview();});
for(const id of ['bg','fg'])$(id).addEventListener('input',()=>{for(const b of document.querySelectorAll('.theme')){b.classList.remove('selected');b.setAttribute('aria-pressed','false');}showPreview();});
$('prev').addEventListener('click',()=>{if(current>1){current--;showPreview();}});
$('next').addEventListener('click',()=>{if(doc&&current<doc.numPages){current++;showPreview();}});
$('cancel').addEventListener('click',()=>{abort=true;status(t('cancelPending'));$('cancel').disabled=true;});
$('convert').addEventListener('click',async()=>{
  if(!doc||busy)return;
  let pages;try{pages=parsePages($('range').value,doc.numPages);}catch(error){status(messages[error.message]||t('pageRange'),true);return;}
  busy=true;abort=false;++previewToken;controls();$('cancel').disabled=false;$('progress').max=pages.length;$('progress').value=0;status(t('starting'));
  try{
    const data=await convertPdf(doc,PDFDocument,{pages,bg:$('bg').value,fg:$('fg').value,dpi:Number($('dpi').value),createCanvas:makeCanvas,shouldCancel:()=>abort,onProgress:(n,total)=>{$('progress').value=n;status(t('progress',{n,total}));}});
    const blob=new Blob([data],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='dark-color.pdf';a.setAttribute('data-google-vignette','false');a.setAttribute('data-google-interstitial','false');document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
    status(t('complete',{pages:pages.length}));
  }catch(error){status(messages[error.message]||t('conversionError'),error.message!=='cancelled');}
  finally{busy=false;controls();showPreview();}
});

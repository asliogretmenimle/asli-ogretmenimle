/**
 * Stüdyo'da üretilen tek dosyalık HTML'i site içinde güvenli çalıştırmak için hazırlar.
 *
 * HTML, `sandbox="allow-scripts"` bir iframe'de (srcdoc) çalışır: sitenin çerezlerine, oturumuna ve
 * localStorage'ına erişemez. Site ile konuşmak için başa küçük bir köprü betiği eklenir:
 *
 *   window.AO.grade              → seçili sınıf (1–8)
 *   window.AO.kind               → 'game' | 'interaction' | 'manipulative'
 *   window.AO.finish({ stars, summary, score, insight })   → bitiş ekranını açar
 *   window.AO.sound(name)        → 'ok' | 'bad' | 'win' | 'tap' kısa ses (site ses ayarına uyar)
 *
 * Köprü ayrıca yakalanmayan hataları bildirir (Stüdyo'da "AI'ya düzelttir" düğmesi bunları kullanır)
 * ve sandbox'ta hata veren localStorage / alert gibi API'ler için zararsız yedekler tanımlar.
 */

export type FrameKind = 'game' | 'interaction' | 'manipulative'

export interface FrameMessage {
  __ao: 1
  type: 'finish' | 'error' | 'sound' | 'ready'
  result?: { stars?: number; summary?: string; score?: number; insight?: string }
  message?: string
  name?: string
}

const bootstrap = (params: { grade: number; kind: FrameKind }) => `<script>(function(){
var P=${JSON.stringify(params)};
function post(m){m.__ao=1;try{parent.postMessage(m,'*')}catch(e){}}
window.AO={grade:P.grade,kind:P.kind,
finish:function(r){r=r||{};post({type:'finish',result:{stars:Math.max(1,Math.min(3,Math.round(Number(r.stars)||2))),summary:String(r.summary||''),score:Number(r.score)||0,insight:r.insight?String(r.insight):undefined}})},
sound:function(n){post({type:'sound',name:String(n||'tap')})}};
function mem(){var s={};return{getItem:function(k){return k in s?s[k]:null},setItem:function(k,v){s[k]=String(v)},removeItem:function(k){delete s[k]},clear:function(){s={}},key:function(i){return Object.keys(s)[i]||null},get length(){return Object.keys(s).length}}}
['localStorage','sessionStorage'].forEach(function(n){try{window[n].getItem('x')}catch(e){try{Object.defineProperty(window,n,{value:mem(),configurable:true})}catch(_){}}});
window.alert=function(m){console.log('[alert]',m)};window.confirm=function(){return true};window.prompt=function(_,d){return d||''};
window.addEventListener('error',function(e){post({type:'error',message:(e.message||'Hata')+(e.lineno?' (satır '+e.lineno+')':'')})});
window.addEventListener('unhandledrejection',function(e){post({type:'error',message:'Promise: '+(e.reason&&e.reason.message||e.reason)})});
window.addEventListener('load',function(){post({type:'ready'})});
})();</script>`

const BASE_STYLE = `<style>html,body{margin:0;padding:0}body{font-family:'Nunito',ui-rounded,system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-tap-highlight-color:transparent}</style>`
const FONT = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">`

/** AI'nın yazdığı HTML'e köprüyü ekler (tam belge ya da parça olabilir) */
export function buildSrcDoc(html: string, params: { grade: number; kind: FrameKind }) {
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${bootstrap(params)}${FONT}${BASE_STYLE}`
  const src = html.trim()
  if (/<head[^>]*>/i.test(src)) return src.replace(/<head[^>]*>/i, (m) => `${m}${head}`)
  if (/<html[^>]*>/i.test(src)) return src.replace(/<html[^>]*>/i, (m) => `${m}<head>${head}</head>`)
  return `<!doctype html><html lang="tr"><head>${head}</head><body>${src}</body></html>`
}

export const isFrameMessage = (d: unknown): d is FrameMessage => !!d && typeof d === 'object' && (d as FrameMessage).__ao === 1

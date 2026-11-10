// Contrast of the looks (shared.css, "Looks"): each palette's text, muted and gold on page and surface (4.5:1), its field
// borders (3:1), error and success on the page. Keep the table in step with shared.css. node scripts/tools/look-contrast.js
const P = {
 'classic-d': {bg:'#0b0c10',surface:'#12141a',border:'#2a2d3a',field:'#606478',text:'#e8e0d0',muted:'#958a76',gold:'#c9a84c',goldL:'#e8c97a',error:'#c0392b',success:'#5a9e6f'},
 'classic-l': {bg:'#f4efe4',surface:'#ebe4d5',border:'#c8b896',field:'#8f7d58',text:'#2a2010',muted:'#665632',gold:'#76590f',goldL:'#6b4e0a',error:'#b52a1d',success:'#3a7d52'},
 'winter-d': {bg:'#0a1320',surface:'#101c2c',border:'#24384e',field:'#5f7a94',text:'#e6edf3',muted:'#94a6b8',gold:'#d4b55c',goldL:'#efd48c',error:'#e0685c',success:'#5fae7c'},
 'winter-l': {bg:'#f0f5f8',surface:'#e2ebf0',border:'#b3c5d1',field:'#6c8496',text:'#12222e',muted:'#485c6c',gold:'#7a5a0c',goldL:'#684c08',error:'#b3261e',success:'#256b45'},
 'illum-d': {bg:'#0c0f2c',surface:'#141840',border:'#2c336c',field:'#6a71b2',text:'#f0e7d3',muted:'#a49ec4',gold:'#dcb04a',goldL:'#f2cf7c',error:'#ea6a50',success:'#62b184'},
 'illum-l': {bg:'#f3e9cf',surface:'#e9dcba',border:'#c9b27e',field:'#8a7340',text:'#2b1d10',muted:'#63502b',gold:'#8c2f14',goldL:'#6f230e',error:'#a81f12',success:'#2f6b45'},
 'marble-d': {bg:'#13110e',surface:'#1c1915',border:'#39322a',field:'#7b6d59',text:'#ece6da',muted:'#a19785',gold:'#dfa867',goldL:'#f0c896',error:'#dc5f4c',success:'#5fa57c'},
 'marble-l': {bg:'#f3f2ef',surface:'#e7e5e0',border:'#c3bfb6',field:'#827d75',text:'#22201d',muted:'#59554e',gold:'#1d6657',goldL:'#155043',error:'#b3261e',success:'#2a6e4a'},
 'hc-d': {bg:'#000000',surface:'#0e0e0e',border:'#5c5c5c',field:'#9a9a9a',text:'#ffffff',muted:'#d0d0d0',gold:'#ffd75e',goldL:'#ffe89a',error:'#ff7b6b',success:'#6fdc9a'},
 'hc-l': {bg:'#ffffff',surface:'#f3f3f3',border:'#767676',field:'#595959',text:'#000000',muted:'#333333',gold:'#5a3d00',goldL:'#4a3200',error:'#a30f05',success:'#0f5a30'},
};
const lum=h=>{const c=[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return ((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(',');
for(const [k,p] of Object.entries(P)){
  const r={ 'text/bg':cr(p.text,p.bg),'text/surf':cr(p.text,p.surface),'muted/bg':cr(p.muted,p.bg),'muted/surf':cr(p.muted,p.surface),'gold/bg':cr(p.gold,p.bg),'gold/surf':cr(p.gold,p.surface),'goldL/surf':cr(p.goldL,p.surface),'field/bg':cr(p.field,p.bg),'field/surf':cr(p.field,p.surface),'err/bg':cr(p.error,p.bg),'succ/bg':cr(p.success,p.bg),'bg/gold':cr(p.bg,p.gold)};
  const bad=Object.entries(r).filter(([n,v])=>v<(n.startsWith('field')?3:4.5)).map(([n,v])=>n+'='+v);
  console.log(k.padEnd(10),Object.entries(r).map(([n,v])=>v).join(' '), bad.length?' LOW: '+bad.join(' '):'', ' gold-rgb',rgb(p.gold),'| goldL',rgb(p.goldL),'| bg',rgb(p.bg));
}

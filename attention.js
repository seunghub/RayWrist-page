(() => {
  'use strict';
  const data = window.RAYWRIST_ATTENTION;
  if (!data) return;
  const root = document.getElementById('attention');
  const $ = id => document.getElementById(id);
  const scenes = data.scenes;
  const video = $('attention-video');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sceneIndex = 0, armIndex = 0, query = 35, mode = 'film';
  let images = {}, loadToken = 0, yaw = -.7, pitch = .48;
  const palettes = { ink: '#172a43', muted: '#687993', gold: '#e5ac41', line: '#dce4ee' };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const scene = () => scenes[sceneIndex];
  const arm = () => scene().arms[armIndex];
  const color = p => { const t = clamp(p / data.legendMax, 0, 1); return `rgb(${[61, 96, 150].map((v, i) => Math.round(v*(1-t) + [242,181,60][i]*t)).join(',')})`; };
  const percent = p => (p * 100).toFixed(1) + '%';
  const play = () => { const promise = video.play(); if (promise) promise.catch(() => {}); };
  function canvas(id) { const el = $(id), ctx = el.getContext('2d'); ctx.clearRect(0, 0, el.width, el.height); ctx.fillStyle = '#f7f9fc'; ctx.fillRect(0,0,el.width,el.height); return [ctx,el.width,el.height]; }
  function line(c, a, b, color, width=2) { c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.strokeStyle=color; c.lineWidth=width; c.stroke(); }
  function dot(c, p, r, fill) { c.beginPath(); c.arc(p[0],p[1],r,0,Math.PI*2); c.fillStyle=fill; c.fill(); c.strokeStyle='#fff'; c.lineWidth=2; c.stroke(); }
  function photo(id, key) {
    const [c,w,h] = canvas(id), image = images[key]; if (!image) return;
    const scale = Math.min(w/image.width,h/image.height), nw=image.width*scale,nh=image.height*scale,x=(w-nw)/2,y=(h-nh)/2;
    c.drawImage(image,x,y,nw,nh);
    const a=arm();
    if(key==='wrist') {
      const xy=a.queryXY[query],cell=a.queryCellXY??[a.queryCell,a.queryCell],sw=cell[0]*scale,sh=cell[1]*scale,xx=x+(xy[0]+.5-cell[0]/2)*scale,yy=y+(xy[1]+.5-cell[1]/2)*scale;
      c.lineWidth=6; c.strokeStyle='white';c.strokeRect(xx,yy,sw,sh);c.lineWidth=3;c.strokeStyle=palettes.gold;c.strokeRect(xx,yy,sw,sh);
    } else if (key==='external') {
      c.save();c.beginPath();c.rect(x,y,nw,nh);c.clip();c.strokeStyle=a.name.startsWith('Right')?'#4faaa0':palettes.gold;c.lineWidth=3;c.strokeRect(x+a.offsets[0]*scale,y+a.offsets[1]*scale,a.cropSize*scale,a.cropSize*scale);c.restore();
    } else if (a.valid[query]) {
      c.save();c.beginPath();c.rect(x,y,nw,nh);c.clip();
      const uv=a.cropUV[query].map(p=>[x+(p[0]+.5)*nw/256,y+(p[1]+.5)*nh/256]);
      c.beginPath();uv.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle='#687c96';c.lineWidth=1.7;c.stroke();
      a.weights[query].slice(0,16).map((p,k)=>({p,k})).sort((a,b)=>a.p-b.p).forEach(({p,k})=>dot(c,uv[k],Math.sqrt(8+450*p),color(p)));
      c.restore();
    }
  }
  function draw3D() {
    const [c,w,h]=canvas('token-space'),f=scene(),a=arm(),corners=[];
    for (let x of [f.lower[0],f.upper[0]]) for (let y of [f.lower[1],f.upper[1]]) for (let z of [f.lower[2],f.upper[2]]) corners.push([x,y,z]);
    const rotate=p=>{const xx=Math.cos(yaw)*p[0]-Math.sin(yaw)*p[1], yy=Math.sin(yaw)*p[0]+Math.cos(yaw)*p[1];return [xx,Math.cos(pitch)*(p[2]-.05)-Math.sin(pitch)*yy];};
    const bound=[...corners,a.origin].map(rotate),lo=[0,1].map(k=>Math.min(...bound.map(p=>p[k]))),hi=[0,1].map(k=>Math.max(...bound.map(p=>p[k]))),center=lo.map((v,k)=>(v+hi[k])/2),scale=Math.min((w-65)/(hi[0]-lo[0]),(h-65)/(hi[1]-lo[1]));
    const project=p=>rotate(p).map((v,k)=>(v-center[k])*scale+[w/2,h/2][k]);
    for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)if(corners[i].filter((v,k)=>v!==corners[j][k]).length===1)line(c,project(corners[i]),project(corners[j]),'#b9c9da',1.5);
    [[.035,0,0],[0,.035,0],[0,0,.035]].forEach((p,k)=>line(c,project([0,0,0]),project(p),['#c96c6b','#579b89','#4f78b4'][k],2.5));
    if(a.valid[query]) {
      const pts=a.xyz[query].map(project),cam=project(a.origin);line(c,cam,pts[15],'#6c7d93',1.8);
      a.weights[query].slice(0,16).map((p,k)=>({p,k})).sort((a,b)=>a.p-b.p).forEach(({p,k})=>dot(c,pts[k],Math.sqrt(8+450*p),color(p)));
      dot(c,cam,4,palettes.ink);c.font='18px Paperlogy, sans-serif';c.fillStyle=palettes.muted;c.fillText(a.originLabel??'wrist',cam[0]+8,cam[1]-8);
    } else {c.font='19px Paperlogy, sans-serif';c.fillStyle=palettes.muted;c.textAlign='center';c.fillText('No ray–box interval',w/2,h/2);}
  }
  function drawWeights() {
    const [c,w,h]=canvas('token-weights'),weights=arm().weights[query],left=49,right=12,top=15,bottom=36,bw=(w-left-right)/17;
    c.font='15px Paperlogy, sans-serif';c.textAlign='right';
    for(let p of [0,.25,.5,.75,1]){let y=h-bottom-p*(h-top-bottom);line(c,[left,y],[w-right,y],'#e2e8f1',1);c.fillStyle=palettes.muted;c.fillText(Math.round(100*p)+'%',left-8,y+5);}
    weights.forEach((p,k)=>{const x=left+k*bw+3,y=h-bottom-p*(h-top-bottom);c.fillStyle=k===16?'#8f9db2':color(p);c.fillRect(x,y,bw-6,Math.max(.7,p*(h-top-bottom)));c.fillStyle=palettes.muted;c.textAlign='center';c.fillText(k===16?'∅':String(k+1),x+(bw-6)/2,h-10);});
    $('token-null').textContent=percent(weights[16]);$('token-peak').textContent=percent(Math.max(...weights.slice(0,16)));
    $('token-query-label').textContent=`q${String(query).padStart(2,'0')} · row ${Math.floor(query/scene().n)}, column ${query%scene().n}`;
    $('token-range').value=query;$('token-number').value=query;
    $('token-status').textContent=arm().valid[query]?'16 spatial candidates + null':'Ray–box miss · geometric update is gated off';
    $('token-live').textContent=`${scene().title}, ${arm().name}, query ${query}. Null ${percent(weights[16])}.`;
  }
  function draw(){photo('token-wrist','wrist');photo('token-external','external');photo('token-crop','crop');draw3D();drawWeights();}
  async function loadArm() {
    root.dataset.ready='false';
    const token=++loadToken,f=scene(),a=arm();query=a.defaultQuery??f.defaultQuery;
    const labels=f.panelLabels??['Reference wrist','External RGB','Source crop','Tool-frame ray'];
    ['wrist','external','crop','space'].forEach((key,i)=>{ $('token-'+key+'-title').textContent=labels[i]; });
    $('token-wrist-hint').textContent=f.virtual?'Select a virtual token':'Click a token';
    $('token-range').max=$('token-number').max=f.n*f.n-1;
    $('token-count').textContent=f.n+' × '+f.n+' lattice';
    const paths={wrist:a.wristImage??f.images.wrist,external:f.images.external,crop:a.cropImage??f.images.crop};
    try {
      const loaded={};await Promise.all(Object.entries(paths).map(async([key,path])=>{const img=new Image();img.src=path;await img.decode();loaded[key]=img;}));
      if(token!==loadToken)return;images=loaded;draw();root.dataset.ready='true';$('attention-error').hidden=true;
    } catch { $('attention-error').textContent='The attention images could not be loaded. Reload the page to try again.';$('attention-error').hidden=false; }
  }
  function selectScene(index,shouldPlay=true) {
    sceneIndex=index;const f=scene();armIndex=f.defaultArm??0;root.dataset.scene=f.id;root.dataset.ready='false';
    document.querySelectorAll('.attention-scene').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    $('attention-scene-title').textContent=f.title;$('attention-scene-dataset').textContent=f.dataset;
    const select=$('token-arm');select.replaceChildren();f.arms.forEach((a,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=a.name;select.append(opt);});select.value=armIndex;select.hidden=f.arms.length===1;
    video.pause();video.poster=`assets/attention/posters/${f.id}.jpg`;video.src=`assets/attention/videos/${f.id}-tokens.mp4`;video.load();$('attention-download').href=video.getAttribute('src');
    loadArm();if(mode==='film'&&shouldPlay)play();
  }
  function setMode(next) {
    mode=next;$('attention-film').hidden=next!=='film';$('attention-inspector').hidden=next!=='explore';
    document.querySelectorAll('[data-attention-mode]').forEach(b=>{const selected=b.dataset.attentionMode===next;b.setAttribute('aria-pressed',String(selected));});
    if(next==='explore'){video.pause();if(root.dataset.ready==='true')draw();}else play();
  }
  let activeDataset='All';
  function filterDataset(dataset,choose=true){activeDataset=dataset;document.querySelectorAll('[data-attention-dataset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.attentionDataset===dataset)));document.querySelectorAll('.attention-scene').forEach((b,i)=>{b.hidden=dataset!=='All'&&scenes[i].dataset!==dataset;});if(choose&&dataset!=='All'&&scene().dataset!==dataset)selectScene(scenes.findIndex(f=>f.dataset===dataset));}
  document.querySelectorAll('[data-attention-dataset]').forEach(b=>b.addEventListener('click',()=>filterDataset(b.dataset.attentionDataset)));
  const deck=$('attention-scenes');
  scenes.forEach((f,i)=>{const b=document.createElement('button');b.type='button';b.className='attention-scene';b.setAttribute('aria-pressed',String(i===0));b.setAttribute('aria-label','Show '+f.title);const img=document.createElement('img');img.src=f.arms[f.defaultArm??0].cropImage??f.images.crop;img.alt='';img.loading='lazy';img.width=256;img.height=256;const label=document.createElement('span');label.className='attention-scene-copy';const name=document.createElement('span');name.textContent=f.title;const small=document.createElement('span');small.textContent=f.dataset+' · '+(f.arms.length===2?'two wrists':f.n*f.n+' tokens');label.append(name,small);b.append(img,label);b.addEventListener('click',()=>selectScene(i));deck.append(b);});
  document.querySelectorAll('[data-attention-mode]').forEach(b=>b.addEventListener('click',()=>setMode(b.dataset.attentionMode)));
  $('token-arm').addEventListener('change',e=>{armIndex=+e.target.value;loadArm();});
  const setQuery=value=>{query=clamp(Math.round(+value||0),0,scene().n*scene().n-1);draw();};
  $('token-range').addEventListener('input',e=>setQuery(e.target.value));$('token-number').addEventListener('input',e=>setQuery(e.target.value));
  $('token-wrist').addEventListener('click',e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height,a=arm(),img=images.wrist;if(!img)return;const cell=a.queryCellXY??[a.queryCell,a.queryCell],x0=a.queryXY[0][0]+.5-cell[0]/2,y0=a.queryXY[0][1]+.5-cell[1]/2,scale=Math.min(420/img.width,420/img.height),ox=(420-img.width*scale)/2,oy=(420-img.height*scale)/2,u=(x*420-ox)/scale,v=(y*420-oy)/scale;if(u<0||v<0||u>=img.width||v>=img.height)return;const col=clamp(Math.floor((u-x0)/cell[0]),0,scene().n-1),row=clamp(Math.floor((v-y0)/cell[1]),0,scene().n-1);setQuery(row*scene().n+col);});
  let drag=null;$('token-space').addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY,yaw,pitch];e.currentTarget.setPointerCapture(e.pointerId);});
  $('token-space').addEventListener('pointermove',e=>{if(!drag)return;yaw=drag[2]+(e.clientX-drag[0])*.008;pitch=clamp(drag[3]+(e.clientY-drag[1])*.008,-1.3,1.3);draw3D();});
  ['pointerup','pointercancel'].forEach(name=>$('token-space').addEventListener(name,()=>{drag=null;}));
  $('token-reset').addEventListener('click',()=>{yaw=-.7;pitch=.48;draw3D();});
  video.addEventListener('error',()=>{$('attention-error').textContent='The token-sweep video could not be loaded. Try opening the MP4 file.';$('attention-error').hidden=false;});
  if('IntersectionObserver'in window&&!reduced){let started=false;const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting&&!started&&mode==='film'){started=true;play();}}),{threshold:.5});observer.observe(video);}
  window.RayWristAttention={state:()=>({scene:scene().id,arm:armIndex,query,mode}),selectScene,setQuery,setMode,showScene:id=>{const i=scenes.findIndex(f=>f.id===id);if(i<0)return;filterDataset(scenes[i].dataset,false);selectScene(i,false);setMode('explore');root.scrollIntoView({behavior:reduced?'instant':'smooth'});}};
  selectScene(0,false);
})();

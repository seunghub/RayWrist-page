(() => {
  'use strict';
  const stories = window.RAYWRIST_ROBOCASA_STORIES || [];
  const $ = id => document.getElementById(id);
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = 0, seekRequest = 0;
  function watchTask(time=0) {
    const story=stories[current],request=++seekRequest;
    window.RayWristGallery.selectBenchmark('robocasa',false);
    window.RayWristGallery.selectClip(story.galleryIndex,false);
    const video=$('rollout-video');
    const seek=()=>{if(request!==seekRequest)return;video.currentTime=time;const p=video.play();if(p)p.catch(()=>{});};
    if(video.readyState>=1)seek();else video.addEventListener('loadedmetadata',seek,{once:true});
    $('rollouts').scrollIntoView({behavior:motion?'smooth':'instant'});
  }
  const tabs=[...document.querySelectorAll('[data-story]')];
  function selectStory(index) {
    current=index;const story=stories[index];$('story-panel').dataset.story=story.id;
    tabs.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.tabIndex=i===index?0:-1;});
    $('story-panel').setAttribute('aria-labelledby','story-tab-'+story.id);
    $('story-subtitle').textContent=story.subtitle;$('story-inspect').hidden=!story.attentionScene;
    const frames=$('story-frames');frames.replaceChildren();
    story.frames.forEach(frame=>{const b=document.createElement('button');b.type='button';b.className='story-frame';b.setAttribute('aria-label','Watch '+story.name+' from '+frame.label.toLowerCase());const im=document.createElement('img');im.src=frame.src;im.alt=frame.label;im.width=584;im.height=540;im.loading='lazy';const caption=document.createElement('span');caption.className='story-frame-caption';const label=document.createElement('span');label.textContent=frame.label;const time=document.createElement('span');time.textContent=Math.floor(frame.time/60)+':'+String(Math.floor(frame.time%60)).padStart(2,'0');caption.append(label,time);b.append(im,caption);b.addEventListener('click',()=>watchTask(frame.time));frames.append(b);});
  }
  tabs.forEach((b,i)=>{b.addEventListener('click',()=>selectStory(i));b.addEventListener('keydown',e=>{let target=null;if(e.key==='ArrowRight')target=(i+1)%tabs.length;if(e.key==='ArrowLeft')target=(i+tabs.length-1)%tabs.length;if(e.key==='Home')target=0;if(e.key==='End')target=tabs.length-1;if(target!==null){e.preventDefault();tabs[target].focus();selectStory(target);}});});
  $('story-watch').addEventListener('click',()=>watchTask());$('story-inspect').addEventListener('click',()=>window.RayWristAttention.showScene(stories[current].attentionScene));
  if(stories.length)selectStory(0);

  const rows=window.RAYWRIST_TASK_RESULTS||[],grid=$('task-result-grid');
  rows.forEach(row=>{const card=document.createElement('article');card.className='task-result';card.dataset.family=row.family==='Placement + fixture closure'?'closure':'placement';card.dataset.task=row.task;const title=document.createElement('h4');title.textContent=row.label.replace(' → ',' to ').replace(' + close',', close');card.append(title);
    for(const[method,key,cls]of[['Native FT','FT_SR','ft'],['FT + ours','RayWrist_SR','ray']]){const line=document.createElement('div');line.className='task-sr-row';const label=document.createElement('span');label.textContent=method;const track=document.createElement('span');track.className='task-sr-track';const bar=document.createElement('i');bar.className='task-sr-bar '+cls;bar.style.width=Number(row[key])+'%';track.append(bar);const value=document.createElement('span');value.textContent=Number(row[key])+'%';line.append(label,track,value);line.setAttribute('aria-label',method+': '+Number(row[key])+' percent');card.append(line);}
    grid.append(card);
  });
  document.querySelectorAll('[data-task-family]').forEach(button=>button.addEventListener('click',()=>{const family=button.dataset.taskFamily;document.querySelectorAll('[data-task-family]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));grid.querySelectorAll('.task-result').forEach(card=>{card.hidden=family!=='all'&&card.dataset.family!==family;});}));
})();

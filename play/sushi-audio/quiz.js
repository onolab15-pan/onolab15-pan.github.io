(function(root){
  'use strict';
  function shuffle(items,rng=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
  const playable=char=>/[A-Z\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]/u.test(char);
  function question(sushi,language,collection,rng=Math.random){
    const answer=language==='ja'?sushi.ja:sushi.en.toUpperCase();const chars=Array.from(answer);
    const holes=chars.map((char,i)=>playable(char)?i:-1).filter(i=>i>=0);
    const required=holes.map(i=>chars[i]);const alphabet=language==='ja'?[...new Set(collection.flatMap(s=>Array.from(s.ja)).filter(char=>playable(char)&&!(sushi.id==='24'&&char==='ツ')))]:Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    const cards=[...required];while(cards.length<Math.max(10,required.length+3))cards.push(alphabet[Math.floor(rng()*alphabet.length)]);
    return {sushi,language,answer,chars,holes,cards:shuffle(cards,rng)};
  }
  root.SushiAudioEngine={shuffle,question};if(!root.document)return;
  const $=id=>document.getElementById(id),player=$('player'),collection=root.SUSHI_AUDIO_WORDS||[],voices=root.SUSHI_AUDIO||{};
  const state={mode:null,deck:[],index:0,score:0,q:null,filled:0,used:new Set(),solved:false,run:0};
  function bilingual(id,ja,en,primary=null){const a=document.createElement('span');a.textContent=ja;a.lang='ja';const b=document.createElement('span');b.textContent=en;b.lang='en';b.className='enline';if(primary){a.className=primary==='ja'?'question-primary':'question-secondary';b.classList.add(primary==='en'?'question-primary':'question-secondary');}$(id).replaceChildren(a,b);}
  function stopAudio(){state.run++;player.pause();player.currentTime=0;}
  function show(id){for(const name of ['menu','game','result'])$(name).hidden=name!==id;}
  function play(){const run=++state.run;player.pause();player.currentTime=0;$('audio-status').className='audio-status';$('audio-status').textContent=state.mode==='ja'?'Playing Japanese…':'英語を再生しています…';
    const attempt=player.play();if(attempt)attempt.catch(()=>{if(run!==state.run||$('game').hidden)return;$('audio-status').className='audio-status error';$('audio-status').textContent=state.mode==='ja'?'Tap Listen again to hear the audio.':'音声ボタンをタップして聞いてください。';});}
  player.addEventListener('ended',()=>{if(!$('game').hidden)$('audio-status').textContent=state.mode==='ja'?'Tap to listen again.':'タップすると、もう一度聞けます。';});
  player.addEventListener('error',()=>{if(!$('game').hidden){$('audio-status').className='audio-status error';$('audio-status').textContent=state.mode==='ja'?'Audio unavailable. Tap Listen again to retry.':'音声を再生できません。もう一度タップしてください。';}});
  function draw(){const q=state.q;$('word').replaceChildren();let group=document.createElement('span');group.className='word-group';$('word').append(group);
    q.chars.forEach((char,i)=>{if(char===' '){group=document.createElement('span');group.className='word-group';$('word').append(group);return;}const span=document.createElement('span');span.className='letter';const at=q.holes.indexOf(i);const blank=at>=state.filled&&at!==-1;span.textContent=blank?'_':char;if(at!==-1)span.classList.add(blank?'blank':'filled');group.append(span);});
    $('word').setAttribute('aria-label',q.chars.map((char,i)=>q.holes.includes(i)&&q.holes.indexOf(i)>=state.filled?'空欄 / blank':char).join(' '));}
  function start(mode){stopAudio();state.mode=mode;state.deck=shuffle(collection).slice(0,10);state.index=0;state.score=0;$('plates').replaceChildren();$('plate-count').textContent='0';show('game');render();}
  function render(){stopAudio();state.q=question(state.deck[state.index],state.mode,collection);state.filled=0;state.used=new Set();state.solved=false;const q=state.q;
    $('mode-label').textContent=state.mode==='ja'?'Listen to Japanese':'英語を聞く';$('progress').textContent=`${state.index+1} / ${state.deck.length} 問 · Questions`;
    // Do not set the photo URL or an answer-bearing alt until the answer is complete.
    $('sushi-photo').hidden=true;$('sushi-photo').removeAttribute('src');$('sushi-photo').alt='';$('photo-blank').hidden=false;$('image-error').hidden=true;$('next').hidden=true;$('pass').hidden=false;$('translation').replaceChildren();$('feedback').replaceChildren();
    bilingual('instruction',state.mode==='ja'?'音を聞いて、日本語の名前を完成させよう':'音を聞いて、英語の名前を完成させよう',state.mode==='ja'?'Listen and build the Japanese name.':'Listen and build the English name.',state.mode==='ja'?'en':'ja');
    $('listen-label').textContent=state.mode==='ja'?'Listen again / もう一度聞く':'もう一度聞く / Listen again';draw();$('choices').replaceChildren();
    q.cards.forEach((char,i)=>{const b=document.createElement('button');b.className='card';b.textContent=char;b.setAttribute('aria-label',`${char} · カード ${i+1}`);b.addEventListener('click',()=>pick(char,i,b));$('choices').append(b);});
    player.src=voices[q.sushi.id][state.mode];$('instruction').focus({preventScroll:true});play();}
  function pick(char,i,button){if(state.solved||state.used.has(i))return;const q=state.q;if(char!==q.chars[q.holes[state.filled]]){bilingual('feedback','もう一度、音を聞いてみよう','Listen again and try another letter.');$('feedback').className='feedback error';button.classList.add('wrong');return;}
    state.used.add(i);button.disabled=true;button.classList.remove('wrong');button.classList.add('used');state.filled++;draw();$('feedback').className='feedback';
    if(state.filled<q.holes.length){$('feedback').replaceChildren();return;}
    state.solved=true;$('pass').hidden=true;state.score++;$('plate-count').textContent=String(state.score);const plate=document.createElement('span');plate.className='plate';$('plates').append(plate);
    $('photo-blank').hidden=true;$('sushi-photo').alt=q.sushi.ja;$('sushi-photo').src=q.sushi.image;$('sushi-photo').hidden=false;
    bilingual('feedback','正解。寿司の写真が出ました。','Correct. Here is your sushi.');bilingual('translation',q.sushi.ja,q.sushi.en);
    for(const b of $('choices').children)b.disabled=true;$('next').textContent=state.index+1===state.deck.length?'できあがりを見る / Finish →':'次のひと皿 / Next →';$('next').hidden=false;$('next').focus({preventScroll:true});}
  $('listen').addEventListener('click',play);$('change-mode').addEventListener('click',menu);$('result-modes').addEventListener('click',menu);
  function menu(){stopAudio();show('menu');document.querySelector(`[data-mode="${state.mode}"]`).focus({preventScroll:true});}
  function advance(){stopAudio();state.index++;if(state.index<state.deck.length)render();else{show('result');$('result-title').textContent=`${state.score}皿、できあがり。`;$('result-copy').textContent=`${state.score} / ${state.deck.length} plates`;$('result-title').focus({preventScroll:true});}}
  $('next').addEventListener('click',()=>{if(state.solved)advance();});
  $('pass').addEventListener('click',()=>{if(!state.solved)advance();});
  $('again').addEventListener('click',()=>start(state.mode));$('sushi-photo').addEventListener('error',()=>{if(state.solved){$('sushi-photo').hidden=true;$('image-error').hidden=false;}});$('retry-image').addEventListener('click',()=>{if(state.solved){$('image-error').hidden=true;$('sushi-photo').hidden=false;$('sushi-photo').src=state.q.sushi.image;}});
  $('reload-audio').addEventListener('click',()=>location.reload());
  const ready=collection.length===40&&collection.every(s=>voices[s.id]?.ja&&voices[s.id]?.en);
  if(ready){$('loading-status').hidden=true;for(const b of document.querySelectorAll('[data-mode]')){b.disabled=false;b.addEventListener('click',()=>start(b.dataset.mode));}}
  else{bilingual('loading-status','音声を読み込めませんでした。再読み込みしてください。','Audio could not be loaded. Please reload.');$('reload-audio').hidden=false;}
})(typeof window!=='undefined'?window:globalThis);

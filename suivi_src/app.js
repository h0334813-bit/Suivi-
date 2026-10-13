/* ---------- État et stockage (navigateur du lecteur) ---------- */
const KEY='suivi-risque-m1';
const blank=()=>({lu:{},obj:{},td:{},quiz:{}});
let S=blank();
let view={name:'home'};
let run=null;
let mem='';
const lessonCache={};
try{const r=JSON.parse(localStorage.getItem(KEY)||'null');if(r&&typeof r==='object')S=Object.assign(blank(),r);}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}

/* ---------- Calculs ---------- */
const W={lu:.15,obj:.15,td:.30,quiz:.40};
const exOf=i=>EX.map((e,k)=>[e,k]).filter(([e])=>e.ch===i);
const objDone=i=>(S.obj[i]||[]).filter(Boolean).length;
const tdDone=i=>exOf(i).filter(([,k])=>S.td[k]).length;
const bestQ=i=>S.quiz[i]?S.quiz[i].best:0;
const chScore=i=>Math.round(100*(W.lu*(S.lu[i]?1:0)+W.obj*objDone(i)/CH[i].obj.length+W.td*tdDone(i)/exOf(i).length+W.quiz*bestQ(i)));
const overall=()=>Math.round(CH.reduce((s,_,i)=>s+chScore(i),0)/CH.length);
function level(p){return p>=75?'Prêt pour l’examen':p>=50?'Solide':p>=25?'En progression':'Découverte';}
function status(i){
  if(chScore(i)>=80)return ['ok','Maîtrisé'];
  if(S.lu[i]||objDone(i)||tdDone(i)||S.quiz[i])return ['mid','En cours'];
  return ['todo','À commencer'];
}
function nextStep(){
  const i=CH.map((_,i)=>i).sort((a,b)=>chScore(a)-chScore(b)||a-b)[0];
  if(chScore(i)>=80)return 'Toutes les séances dépassent 80 %. Refaites les quiz les plus anciens pour consolider.';
  const todo=!S.lu[i]?'lire le cours':!tdDone(i)?'faire les exercices de TD':!S.quiz[i]?'passer le quiz':'refaire le quiz';
  return 'Prochaine étape conseillée : <strong>séance '+(i+1)+', '+CH[i].t+'</strong> ('+chScore(i)+' %). Commencez par '+todo+'.';
}
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------- Markdown et formules ---------- */
function md(src){
  if(typeof marked==='undefined')return '<pre>'+esc(src)+'</pre>';
  const m=[];
  src=src.replace(/\$\$([\s\S]+?)\$\$/g,(_,t)=>{m.push(['d',t]);return 'MATHTOK'+(m.length-1)+'END';});
  src=src.replace(/\$([^$\n]+?)\$/g,(_,t)=>{m.push(['i',t]);return 'MATHTOK'+(m.length-1)+'END';});
  let h=marked.parse(src,{mangle:false,headerIds:false});
  h=h.replace(/MATHTOK(\d+)END/g,(_,k)=>{const [ty,t]=m[k];return ty==='d'?'\\['+esc(t)+'\\]':'\\('+esc(t)+'\\)';});
  return h.replace(/<table>/g,'<div class="scroll"><table>').replace(/<\/table>/g,'</table></div>');
}
function typeset(el){
  if(window.MathJax&&MathJax.startup&&MathJax.startup.promise){
    return MathJax.startup.promise.then(()=>MathJax.typesetPromise([el])).then(()=>true).catch(()=>false);
  }
  return Promise.resolve(false);
}
window.addEventListener('load',()=>{typeset(app);});

/* ---------- Vues ---------- */
const app=document.getElementById('app');
function go(v){view=v;render();window.scrollTo(0,0);}

function home(){
  const p=overall();
  const totObj=CH.reduce((s,c)=>s+c.obj.length,0), doneObj=CH.reduce((s,_,i)=>s+objDone(i),0);
  const lus=CH.filter((_,i)=>S.lu[i]).length, td=Object.keys(S.td).filter(k=>S.td[k]).length;
  return `
  <header>
    <div class="eyebrow">Master 1 Actuariat · Statistiques du risque</div>
    <h1>Où en êtes-vous dans le cours ?</h1>
  </header>
  <section class="panel" aria-label="Niveau global">
    <div class="hero">
      <div><div class="big num">${p}<small> %</small></div><span class="level">${level(p)}</span></div>
      <div>
        <div class="gauge" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100" aria-label="Avancement global">
          <i style="width:${p}%"></i><b style="left:25%"></b><b style="left:50%"></b><b style="left:75%"></b>
        </div>
        <div class="ticks"><span>Découverte</span><span>En progression</span><span>Solide</span><span>Examen</span></div>
      </div>
    </div>
    <p class="next">${nextStep()}</p>
  </section>
  <section class="tiles" aria-label="Chiffres clés">
    <div class="tile"><div class="v num">${lus}/${CH.length}</div><div class="l">cours lus</div></div>
    <div class="tile"><div class="v num">${td}/${EX.length}</div><div class="l">exercices réussis</div></div>
    <div class="tile"><div class="v num">${Object.keys(S.quiz).length}/${CH.length}</div><div class="l">quiz passés</div></div>
    <div class="tile"><div class="v num">${doneObj}/${totObj}</div><div class="l">objectifs validés</div></div>
  </section>
  <section>
    <h2 style="margin-bottom:10px">Les 12 séances</h2>
    <ul class="list">${CH.map((c,i)=>{const [cl,lb]=status(i);const sc=chScore(i);return `
      <li><button class="row" data-ch="${i}">
        <span class="n">${String(i+1).padStart(2,'0')}</span>
        <span class="t">${esc(c.t)}<span class="chip ${cl}">${lb}</span></span>
        <span class="p">${sc} %</span>
        <span class="bar"><i style="width:${sc}%"></i></span>
      </button></li>`}).join('')}</ul>
    <p class="method" style="margin-top:12px">Score d'une séance : 15 % cours lu, 15 % objectifs cochés, 30 % exercices de TD réussis, 40 % meilleur résultat au quiz. Le niveau global est la moyenne des 12 séances.</p>
  </section>
  <section>
    <h2 style="margin-bottom:10px">Ressources du cours</h2>
    <div class="actions" style="margin-top:0">
      <button class="btn" data-doc="plan">Programme et plan</button>
      <button class="btn" data-doc="eval">Modalités d'évaluation</button>
      <button class="btn" data-doc="biblio">Pour aller plus loin</button>
    </div>
  </section>
  <section class="panel">
    <details>
      <summary>Sauvegarde et remise à zéro</summary>
      <p class="note" style="margin-top:10px">Votre progression est enregistrée dans ce navigateur. Pour la déplacer sur un autre appareil, copiez le code ci-dessous puis collez-le sur l'autre appareil.</p>
      <textarea id="code" aria-label="Code de sauvegarde" spellcheck="false">${esc(mem)}</textarea>
      <div class="actions">
        <button class="btn" id="exp">Générer mon code</button>
        <button class="btn" id="cp">Copier</button>
        <button class="btn primary" id="imp">Importer ce code</button>
        <button class="btn danger" id="rst">Tout effacer</button>
      </div>
      <p class="note" id="msg" role="status" style="margin-top:10px"></p>
    </details>
  </section>`;
}

function doc(key){
  const T={plan:'Programme et plan',eval:'Modalités d’évaluation',biblio:'Pour aller plus loin'}[key];
  return `<button class="btn back" id="back">← Retour au tableau de bord</button>
  <header><div class="eyebrow">Ressources du cours</div><h1>${T}</h1></header>
  <section class="panel lesson" id="docbody">${md(DOCS[key])}</section>`;
}

function tabBar(i,tab){
  const T=[['cours','Cours'],['td','Exercices TD ('+tdDone(i)+'/'+exOf(i).length+')'],['quiz','Quiz'],['obj','Objectifs ('+objDone(i)+'/'+CH[i].obj.length+')']];
  return `<div class="tabs" role="tablist">${T.map(([k,l])=>`<button role="tab" aria-selected="${k===tab}" class="tab" data-tab="${k}" id="tab-${k}">${l}</button>`).join('')}</div>`;
}
function chapter(i){
  const tab=view.tab||'cours', c=CH[i], q=S.quiz[i], a=S.obj[i]||[];
  let body='';
  if(tab==='cours'){
    body=`<section class="panel lesson" id="lesson">${lessonCache[i]||md(LESSONS[i])}</section>
    <div class="actions"><button class="btn ${S.lu[i]?'':'primary'}" id="lu">${S.lu[i]?'✓ Cours lu (annuler)':'Marquer le cours comme lu'}</button>
    <button class="btn" data-tab="td">Passer aux exercices</button></div>`;
  }else if(tab==='td'){
    body=exOf(i).map(([e,k],n)=>`
    <section class="panel ex" data-k="${k}">
      <div class="eyebrow">Exercice ${n+1}<span class="chip ok" id="done-${k}" ${S.td[k]?'':'hidden'}>Réussi</span></div>
      <div class="md">${md(e.q)}</div>
      <div class="answer">
        <label for="a-${k}">Votre réponse${e.unit?' ('+esc(e.unit)+')':''}</label>
        <input id="a-${k}" type="text" inputmode="decimal" autocomplete="off" placeholder="Valeur numérique">
        <button class="btn primary chk">Vérifier</button>
        <button class="btn solbtn">Voir la solution</button>
      </div>
      <p class="fb" id="fb-${k}" role="status"></p>
      <div class="expl" id="sol-${k}" hidden>${md(e.sol)}</div>
    </section>`).join('')+`<p class="method">Tolérance d'arrondi acceptée : 0,5 % à 2 % selon l'exercice. Les décimales s'écrivent avec une virgule ou un point.</p>`;
  }else if(tab==='quiz'){
    body=`<section class="panel">
    <h2 style="margin-bottom:6px">Quiz de la séance</h2>
    <p>${q?`Meilleur score : <strong class="num">${Math.round(q.best*c.q.length)}/${c.q.length}</strong> · dernier essai : <span class="num">${Math.round(q.last*c.q.length)}/${c.q.length}</span> · ${q.n} essai${q.n>1?'s':''}`:`Pas encore tenté. ${c.q.length} questions avec correction immédiate.`}</p>
    <div class="actions"><button class="btn primary" id="start">${q?'Refaire le quiz':'Lancer le quiz'}</button></div></section>`;
  }else{
    body=`<section class="panel">
    <h2 style="margin-bottom:6px">Ce que je sais faire</h2>
    <p class="note" style="margin-bottom:6px">Cochez un objectif quand vous pourriez l'expliquer sans le cours.</p>
    ${c.obj.map((o,k)=>`<label class="obj"><input type="checkbox" data-o="${k}" id="o-${i}-${k}" ${a[k]?'checked':''}><span>${esc(o)}</span></label>`).join('')}</section>`;
  }
  return `
  <button class="btn back" id="back">← Retour au tableau de bord</button>
  <header>
    <div class="eyebrow">Séance ${i+1} sur ${CH.length} · score <span class="num" id="sc">${chScore(i)} %</span></div>
    <h1>${esc(c.t)}</h1>
  </header>
  ${tabBar(i,tab)}
  ${body}`;
}

function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function startQuiz(i){
  run={i,k:0,ok:0,picked:null,opts:CH[i].q.map(q=>shuffle(q.o.map((t,j)=>({t,ok:j===0}))))};
  go({name:'quiz'});
}
function quiz(){
  const c=CH[run.i], q=c.q[run.k], opts=run.opts[run.k], done=run.picked!==null;
  return `
  <button class="btn back" id="back">← Quitter le quiz</button>
  <section class="panel">
    <div class="eyebrow">Séance ${run.i+1} · question ${run.k+1} sur ${c.q.length}</div>
    <p class="q">${esc(q.q)}</p>
    <div class="opts">${opts.map((o,j)=>{
      let cl='';if(done){if(o.ok)cl='right';else if(j===run.picked)cl='wrong';}
      return `<button class="opt ${cl}" data-p="${j}" ${done?'disabled':''}>${esc(o.t)}</button>`}).join('')}</div>
    ${done?`<div class="expl" role="status"><strong>${opts[run.picked].ok?'Correct. ':'Pas tout à fait. '}</strong>${esc(q.e)}</div>
    <div class="actions"><button class="btn primary" id="next">${run.k+1<c.q.length?'Question suivante':'Voir le résultat'}</button></div>`:''}
  </section>`;
}
function result(){
  const c=CH[run.i], n=c.q.length, f=run.ok/n, prev=S.quiz[run.i];
  if(!run.saved){S.quiz[run.i]=prev?{best:Math.max(prev.best,f),last:f,n:prev.n+1}:{best:f,last:f,n:1};save();run.saved=true;}
  const msg=f===1?'Parfait, séance maîtrisée.':f>=0.66?'Bien. Relisez les corrections des erreurs avant de passer à la suite.':'À retravailler : reprenez la section du cours puis refaites le quiz.';
  return `
  <section class="panel">
    <div class="eyebrow">Séance ${run.i+1} · résultat</div>
    <div class="score num">${run.ok}/${n}</div>
    <p>${msg}</p>
    <p class="note">Score de la séance : <span class="num">${chScore(run.i)} %</span> · niveau global : <span class="num">${overall()} %</span> (${level(overall())})</p>
    <div class="actions">
      <button class="btn primary" id="again">Refaire le quiz</button>
      <button class="btn" id="tochap">Revenir à la séance</button>
      <button class="btn" id="back">Tableau de bord</button>
    </div>
  </section>`;
}

/* ---------- Rendu et événements ---------- */
function checkAns(e,val){
  const v=parseFloat(String(val).replace(/\s/g,'').replace(',','.').replace(/[%€]/g,''));
  if(isNaN(v))return null;
  return Math.abs(v-e.ans)<=Math.abs(e.ans)*(e.tol||.02);
}
function refreshScore(){
  const sc=app.querySelector('#sc');if(sc)sc.textContent=chScore(view.i)+' %';
  const t=app.querySelector('#tab-td');if(t)t.textContent='Exercices TD ('+tdDone(view.i)+'/'+exOf(view.i).length+')';
  const o=app.querySelector('#tab-obj');if(o)o.textContent='Objectifs ('+objDone(view.i)+'/'+CH[view.i].obj.length+')';
}
function render(){
  app.innerHTML=view.name==='home'?home():view.name==='chapter'?chapter(view.i):view.name==='doc'?doc(view.key):view.name==='quiz'?(run.k>=CH[run.i].q.length?result():quiz()):'';
  const $=s=>app.querySelector(s);
  app.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>go({name:'chapter',i:+b.dataset.ch,tab:'cours'}));
  app.querySelectorAll('[data-doc]').forEach(b=>b.onclick=()=>go({name:'doc',key:b.dataset.doc}));
  if($('#back'))$('#back').onclick=()=>go(view.name==='quiz'&&run&&run.k<CH[run.i].q.length?{name:'chapter',i:run.i,tab:'quiz'}:{name:'home'});
  if(view.name==='doc')typeset($('#docbody'));
  if(view.name==='chapter')bindChapter();
  if(view.name==='quiz'){
    app.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{
      run.picked=+b.dataset.p;if(run.opts[run.k][run.picked].ok)run.ok++;render();
    });
    if($('#next'))$('#next').onclick=()=>{run.k++;run.picked=null;render();};
    if($('#again'))$('#again').onclick=()=>startQuiz(run.i);
    if($('#tochap'))$('#tochap').onclick=()=>go({name:'chapter',i:run.i,tab:'quiz'});
  }
  if(view.name==='home')bindHome();
}
function bindChapter(){
  const i=view.i, tab=view.tab||'cours', $=s=>app.querySelector(s);
  app.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go({name:'chapter',i,tab:b.dataset.tab}));
  if(tab==='cours'){
    const el=$('#lesson');
    if(!lessonCache[i])typeset(el).then(ok=>{if(ok)lessonCache[i]=el.innerHTML;});
    $('#lu').onclick=()=>{
      S.lu[i]=!S.lu[i];save();refreshScore();
      const b=$('#lu');b.textContent=S.lu[i]?'✓ Cours lu (annuler)':'Marquer le cours comme lu';b.classList.toggle('primary',!S.lu[i]);
    };
  }
  if(tab==='td'){
    typeset($('.ex')?$('.ex').parentNode:app);
    app.querySelectorAll('.ex').forEach(box=>{
      const k=+box.dataset.k, e=EX[k], inp=box.querySelector('input'), fb=box.querySelector('.fb');
      const verify=()=>{
        const r=checkAns(e,inp.value);
        fb.className='fb';
        if(r===null){fb.textContent='Entrez une valeur numérique.';return;}
        if(r){
          fb.textContent='Correct. Comparez avec la solution pour vérifier votre méthode.';fb.classList.add('good');
          if(!S.td[k]){S.td[k]=true;save();box.querySelector('.chip').hidden=false;refreshScore();}
        }else{
          fb.textContent='Ce n’est pas la valeur attendue. Revérifiez vos calculs ou ouvrez la solution.';fb.classList.add('bad');
        }
      };
      box.querySelector('.chk').onclick=verify;
      inp.onkeydown=ev=>{if(ev.key==='Enter')verify();};
      box.querySelector('.solbtn').onclick=ev=>{
        const s=box.querySelector('.expl');s.hidden=!s.hidden;ev.target.textContent=s.hidden?'Voir la solution':'Masquer la solution';
      };
    });
  }
  if(tab==='quiz')$('#start').onclick=()=>startQuiz(i);
  if(tab==='obj')app.querySelectorAll('[data-o]').forEach(cb=>cb.onchange=()=>{
    S.obj[i]=S.obj[i]||CH[i].obj.map(()=>false);S.obj[i][+cb.dataset.o]=cb.checked;save();refreshScore();
  });
}
function bindHome(){
  const $=s=>app.querySelector(s), say=t=>{$('#msg').textContent=t;};
  $('#exp').onclick=()=>{
    try{mem=btoa(unescape(encodeURIComponent(JSON.stringify(S))));}catch(e){mem='';}
    $('#code').value=mem;say('Code généré. Copiez-le pour le conserver.');
  };
  $('#cp').onclick=()=>{
    const t=$('#code').value;if(!t){say('Générez d’abord un code.');return;}
    const fb=()=>{$('#code').select();say('Copie automatique indisponible : le code est sélectionné, copiez-le à la main.');};
    try{navigator.clipboard.writeText(t).then(()=>say('Code copié.'),fb);}catch(e){fb();}
  };
  $('#imp').onclick=()=>{
    try{
      const o=JSON.parse(decodeURIComponent(escape(atob($('#code').value.trim()))));
      if(!o||typeof o!=='object'||!o.quiz)throw 0;
      S=Object.assign(blank(),o);save();mem='';render();
      app.querySelector('details').open=true;app.querySelector('#msg').textContent='Progression importée.';
    }catch(e){say('Code invalide : collez le code complet généré sur l’autre appareil.');}
  };
  let armed=false;
  $('#rst').onclick=()=>{
    if(!armed){armed=true;$('#rst').textContent='Confirmer l’effacement';say('Cliquez de nouveau pour tout effacer. Cette action est définitive.');return;}
    S=blank();save();mem='';render();
  };
}
render();

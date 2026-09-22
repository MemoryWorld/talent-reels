'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { canMutate, sameContext, visibleFeed } from './view-state';

type Evidence = { id: string; title: string; type: string; summary: string; details: string[]; tools: string[] };
type Job = { id: string; title: string; team: string; summary: string; required: string[]; preferred: string[]; evidence_types: string[] };
type Match = { score: number; parts: {required: number; preferred: number; evidence: number}; required_matches: string[]; preferred_matches: string[]; missing: string[]; summary: string; note: string };
type Candidate = { id: string; alias: string; code: string; headline: string; summary: string; focus: string; skills: string[]; theme: string; project: string; project_subtitle: string; visual: string; evidence: Evidence[]; state: string; match: Match };
type Preferences = { job_id: string; search: string; skill: string; evidence_type: string };
type Feed = { items: Candidate[]; total: number; total_candidates: number; shortlisted: number; skipped: number; undo_event_id: number | null; job: Job };
type Bootstrap = { jobs: Job[]; preferences: Preferences; skills: string[]; disclosure: string };
type IconName = 'arrow'|'up'|'down'|'search'|'bookmark'|'grid'|'close'|'check'|'skip'|'undo'|'code'|'play'|'document'|'filter'|'spark'|'chevron'|'external';

function Icon({name, size=20}:{name:IconName;size?:number}) {
  const paths:Record<IconName,React.ReactNode> = {
    arrow:<path d="M5 12h14m-6-6 6 6-6 6"/>, up:<path d="m6 14 6-6 6 6"/>, down:<path d="m6 10 6 6 6-6"/>, chevron:<path d="m9 5 7 7-7 7"/>,
    search:<><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/></>, bookmark:<path d="M6 4h12v17l-6-4-6 4Z"/>,
    grid:<><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></>,
    close:<path d="m6 6 12 12M6 18 18 6"/>, check:<path d="m5 12 4 4L19 6"/>, skip:<><path d="m5 5 11 7-11 7Z"/><path d="M19 5v14"/></>, undo:<><path d="M4 9h10a6 6 0 0 1 0 12M4 9l5-5M4 9l5 5"/></>,
    code:<><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18"/></>, play:<path d="m8 4 13 8-13 8Z"/>, document:<><path d="M6 3h9l4 4v14H6Z"/><path d="M14 3v5h5M9 12h7m-7 4h5"/></>,
    filter:<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>, spark:<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>, external:<><path d="M14 4h6v6m0-6L10 14M10 4H4v16h16v-6"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const labels:Record<string,string> = {code:'实现片段',demo:'产品演示',study:'实验说明'};
const evidenceIcons:Record<string,IconName> = {code:'code',demo:'play',study:'document'};
async function api<T>(path:string, options:RequestInit={}):Promise<T> {
  const response = await fetch(path, {...options, headers:{'Content-Type':'application/json',...options.headers}});
  if (!response.ok) {
    const problem = await response.json().catch(()=>({}));
    throw new Error(typeof problem.detail === 'string' ? problem.detail : `服务暂时无法响应（${response.status}），请重试。`);
  }
  return response.json();
}

function ProjectVisual({candidate}:{candidate:Candidate}) {
  const {visual}=candidate;
  return <div className={`project-visual ${candidate.theme}`} aria-label={`${candidate.project}，虚构作品示意`}>
    <div className="visual-grid"/>
    <div className="visual-header"><span><i/> WORK SAMPLE / {candidate.code}</span><span>DEMO ENVIRONMENT <span className="mini-dot"/></span></div>
    <div className="visual-title"><span className="visual-kicker">BUILT TO MAKE THINGS WORK.</span><h3>{candidate.project.split(' · ')[0]}<span>↗</span></h3><p>{candidate.project_subtitle}</p></div>
    {visual === 'pipeline' && <div className="pipeline-diagram">
      <div className="diagram-node"><span className="node-icon"><Icon name="search"/></span><b>Retrieve</b><small>可追溯的知识</small></div><div className="connector"><span>01</span></div>
      <div className="diagram-node feature"><span className="node-icon"><Icon name="spark"/></span><b>Reason</b><small>有边界的计划</small></div><div className="connector"><span>02</span></div>
      <div className="diagram-node"><span className="node-icon"><Icon name="check"/></span><b>Confirm</b><small>由人确认执行</small></div>
      <div className="diagram-caption"><span>● trace.ready</span><code>{'{ tools, sources, decisions }'}</code></div>
    </div>}
    {visual === 'retrieval' && <div className="retrieval-diagram"><div className="source-stack"><div>DOC / 01 <i/><i/><i/></div><div>DOC / 02 <i/><i/><i/></div></div><div className="retrieval-arrow">→</div><div className="answer-block"><span>ANSWER WITH CONTEXT</span><i/><i/><i/><div><b>[1] 来源片段</b><b>[2] 原文依据</b></div></div></div>}
    {visual === 'workspace' && <div className="workspace-diagram"><div className="window-top"><i/><i/><i/><span>workflow / review</span></div><div className="window-body"><div className="window-side"><span/><span/><span/></div><div className="window-tasks">{['理解任务与约束','调用工具并保留记录','交给人进行最终确认'].map((s,i)=><div key={s}><span>{i<2?'✓':'○'}</span>{s}<small>{i<2?'DONE':'REVIEW'}</small></div>)}</div></div></div>}
    {visual === 'metrics' && <div className="metrics-diagram"><div className="chart-heading"><span>OBSERVABILITY / 实验示意</span><b>Run #024</b></div><svg viewBox="0 0 400 100" preserveAspectRatio="none" aria-hidden="true"><path className="chart-grid" d="M0 25h400M0 50h400M0 75h400"/><path className="chart-line muted" d="M0 72 24 61 50 69 73 38 95 53 120 24 150 42 180 32 220 39 260 21 300 36 340 16 370 24 400 18"/><path className="chart-line" d="M0 85 30 79 60 84 90 63 120 71 150 54 180 57 210 34 240 40 270 22 300 30 330 16 360 23 400 8"/></svg><div className="chart-footer"><span>输入 · 运行 · 记录</span><span>数据曲线仅为视觉示意</span></div></div>}
    <div className="visual-footer"><span>HUMAN IN THE LOOP</span><span>作品结构预览 · 点击下方展开</span></div>
  </div>;
}

function MatchContent({candidate, job}:{candidate:Candidate;job:Job}) {
  const m=candidate.match;
  return <><div className="match-title"><div><span className="eyebrow">WHY THIS PROFILE</span><h2>为什么出现在这里</h2></div><span className="signal-dot"/></div>
    <div className="score-row"><div><b>{m.score}<small>/100</small></b><span>岗位内容相关度</span></div><div className="score-mark"><Icon name="spark" size={25}/></div></div>
    <p className="match-lead">{m.summary}</p>
    <div className="score-breakdown">{([{label:'核心技能覆盖',key:'required',max:65},{label:'加分技能覆盖',key:'preferred',max:20},{label:'工作样例类型',key:'evidence',max:15}] as const).map(p=><div key={p.key}><div><span>{p.label}</span><b>{m.parts[p.key]}<small> / {p.max}</small></b></div><div className="progress-track"><span style={{width:`${m.parts[p.key]/p.max*100}%`}}/></div></div>)}</div>
    <div className="match-section"><h3><Icon name="check" size={16}/>材料中已展示</h3><div className="small-tags">{m.required_matches.concat(m.preferred_matches).map(s=><span key={s}>{s}</span>)}</div></div>
    <div className="match-section gaps"><h3><span className="hollow-dot"/>建议进一步了解</h3><p>{m.missing.length ? `${m.missing.join('、')} 尚未在样例中展示，可在交流中进一步确认。` : '核心技能均有材料覆盖。可继续了解个人贡献、实现边界和真实使用场景。'}</p></div>
    <div className="method-note"><Icon name="document" size={16}/><p>规则排序 · 无模型推断<br/><span>技能 85 分 + 样例类型 15 分；与职位「{job.title}」对齐。</span></p></div>
    <p className="human-note">{m.note}</p></>;
}

export default function Home() {
  const [bootstrap,setBootstrap]=useState<Bootstrap|null>(null);
  const [prefs,setPrefs]=useState<Preferences>({job_id:'agent',search:'',skill:'',evidence_type:''});
  const [storedFeed,setFeed]=useState<Feed|null>(null);
  const [view,setView]=useState<'discover'|'shortlist'>('discover');
  const [activeIndex,setActiveIndex]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const [toast,setToast]=useState('');
  const [modal,setModal]=useState<{kind:'evidence';jobId:string;candidate:Candidate;evidence:Evidence}|{kind:'match';candidate:Candidate}|{kind:'about'}|null>(null);
  const [showFilters,setShowFilters]=useState(false);
  const scrollRef=useRef<HTMLDivElement>(null);
  const dialogRef=useRef<HTMLDialogElement>(null);
  const saveChain=useRef<Promise<unknown>>(Promise.resolve());
  const pendingRequest=useRef<{key:string;id:string}|null>(null);
  const currentJob=useRef(prefs.job_id);
  const feedSequence=useRef(0);
  currentJob.current=prefs.job_id;
  const feed=visibleFeed(storedFeed,prefs.job_id);
  const canAct=canMutate(storedFeed,prefs.job_id,loading,busy,error);

  useEffect(()=>{const screen=window.matchMedia('(min-width: 701px)');const update=()=>setShowFilters(screen.matches);update();screen.addEventListener('change',update);return()=>screen.removeEventListener('change',update);},[]);
  useEffect(()=>{let active=true; api<Bootstrap>('/api/bootstrap').then(data=>{if(active){setBootstrap(data);setPrefs(data.preferences);setError('');}}).catch(e=>{if(active){setError(e.message);setLoading(false);}});return()=>{active=false;};},[]);
  useEffect(()=>{
    if(!bootstrap)return;
    const sequence=++feedSequence.current;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      setLoading(true);setError('');
      const params=new URLSearchParams({...prefs,view});
      api<Feed>(`/api/feed?${params}`,{signal:controller.signal}).then(data=>{if(sequence!==feedSequence.current||!sameContext(prefs.job_id,currentJob.current))return;setFeed(data);setActiveIndex(i=>Math.min(i,Math.max(0,data.items.length-1)));setLoading(false);}).catch(e=>{if(e.name!=='AbortError'&&sequence===feedSequence.current&&sameContext(prefs.job_id,currentJob.current)){setError(e.message);setLoading(false);}});
    },prefs.search?180:0);
    return()=>{clearTimeout(timer);controller.abort();};
  },[bootstrap,prefs,view,refresh]);
  useEffect(()=>{
    if(!bootstrap)return;
    const timer=setTimeout(()=>{saveChain.current=saveChain.current.catch(()=>{}).then(()=>api('/api/preferences',{method:'PUT',body:JSON.stringify(prefs)})).catch(()=>setToast('偏好暂未保存，服务恢复后请重试。'));},250);
    return()=>clearTimeout(timer);
  },[bootstrap,prefs]);
  useEffect(()=>{setActiveIndex(0);scrollRef.current?.scrollTo({top:0});},[prefs.job_id,prefs.search,prefs.skill,prefs.evidence_type,view]);
  useEffect(()=>{setModal(null);setToast('');},[prefs.job_id]);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(''),5500);return()=>clearTimeout(timer);},[toast]);
  useEffect(()=>{if(modal&&!dialogRef.current?.open)dialogRef.current?.showModal();if(!modal&&dialogRef.current?.open)dialogRef.current.close();},[modal]);

  const active=feed?.items[activeIndex] || feed?.items[0];
  const job=feed?.job || bootstrap?.jobs.find(j=>j.id===prefs.job_id);
  const navigate=useCallback((direction:number)=>{
    if(!feed?.items.length)return;
    const next=Math.max(0,Math.min(feed.items.length-1,activeIndex+direction));
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const container=scrollRef.current;
    const target=container?.children[next];
    if(container&&target)container.scrollTo({top:container.scrollTop+target.getBoundingClientRect().top-container.getBoundingClientRect().top,behavior:reduced?'instant':'smooth'});
  },[feed,activeIndex]);
  useEffect(()=>{
    function handle(event:KeyboardEvent){
      if(modal || (event.target instanceof HTMLElement && (['INPUT','TEXTAREA','SELECT'].includes(event.target.tagName)||event.target.isContentEditable)))return;
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();navigate(event.key==='ArrowDown'?1:-1);}
    }
    window.addEventListener('keydown',handle);return()=>window.removeEventListener('keydown',handle);
  },[modal,navigate]);

  async function act(candidate:Candidate,action:'shortlist'|'remove'|'skip',expectedJob=prefs.job_id) {
    if(!canAct||!sameContext(expectedJob,currentJob.current)||!feed?.items.some(item=>item.id===candidate.id))return;
    const requestJob=prefs.job_id;
    setBusy(true);setError('');
    const key=`${prefs.job_id}:${candidate.id}:${action}`;
    if(pendingRequest.current?.key!==key)pendingRequest.current={key,id:crypto.randomUUID()};
    try{
      await api('/api/actions',{method:'POST',body:JSON.stringify({job_id:prefs.job_id,candidate_id:candidate.id,action,request_id:pendingRequest.current.id})});
      pendingRequest.current=null;
      setModal(current=>current?.kind==='evidence' && sameContext(requestJob,currentJob.current,current.jobId) && current.candidate.id===candidate.id ? {...current,candidate:{...current.candidate,state:action==='shortlist'?'shortlisted':action==='skip'?'skipped':'active'}} : current);
      if(sameContext(requestJob,currentJob.current))setToast(action==='shortlist'?`${candidate.alias} 已加入当前岗位短名单`:action==='skip'?`已跳过 ${candidate.alias}，可随时撤销`:`已将 ${candidate.alias} 移出短名单`);
      setRefresh(n=>n+1);
    }catch(e){if(sameContext(requestJob,currentJob.current))setError((e as Error).message);}finally{setBusy(false);}
  }
  async function undo(){
    if(!canAct||!feed?.undo_event_id||!sameContext(feed.job.id,currentJob.current))return;
    const requestJob=prefs.job_id;
    setBusy(true);
    try{await api(`/api/actions/${feed.undo_event_id}/undo`,{method:'POST'});if(sameContext(requestJob,currentJob.current))setToast('已撤销上一次操作');setRefresh(n=>n+1);}catch(e){if(sameContext(requestJob,currentJob.current))setError((e as Error).message);}finally{setBusy(false);}
  }
  function clearFilters(){setPrefs(p=>({...p,search:'',skill:'',evidence_type:''}));}

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="/" aria-label="Talent Reels 首页"><span className="brand-symbol"><i/><i/><i/></span><span>talent<span className="brand-light">reels</span><sup>↗</sup></span></a><div className="top-center"><span className="top-divider"/>让作品先开口</div><div className="top-actions"><button className="demo-pill" onClick={()=>setModal({kind:'about'})}><span/>虚构数据演示</button><div className="workspace-label">杉影实验室 <span>HR WORKSPACE</span></div><div className="profile-avatar" aria-label="演示招聘工作区">SY</div></div></header>
    <div className="workspace">
      <aside className="sidebar"><div><p className="nav-caption">WORKSPACE</p><nav aria-label="工作区导航"><button className={`nav-item ${view==='discover'?'selected':''}`} onClick={()=>setView('discover')}><Icon name="grid"/>发现人才 <span className="nav-tiny">01</span></button><button className={`nav-item ${view==='shortlist'?'selected':''}`} onClick={()=>setView('shortlist')}><Icon name="bookmark"/>我的短名单 <span className="count-badge">{feed?.shortlisted || 0}</span></button></nav>
      <div className="role-switcher"><p className="nav-caption">正在为这个岗位寻找</p><label className="sr-only" htmlFor="job-select">选择目标职位</label><select id="job-select" value={prefs.job_id} onChange={e=>setPrefs(p=>({...p,job_id:e.target.value}))} disabled={!bootstrap||busy}>{bootstrap?.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>) || <option value="agent">AI 应用 / Agent 工程师</option>}</select><span className="role-team">{job?.team || '产品研发 · 杉影实验室'}</span><p className="role-summary">{job?.summary || '寻找能把想法变成真实产品的人。'}</p><div className="role-tags">{job?.required.map(s=><span key={s}>{s}</span>)}</div></div>
      <div className="sidebar-metric"><div><b>{feed?.total_candidates || '—'}</b><span>作品型档案</span></div><div><b>{feed?.shortlisted || 0}<i>↗</i></b><span>当前岗位短名单</span></div></div></div>
      <div className="sidebar-bottom"><div className="human-card"><span className="human-symbol">✳</span><h3>推荐提供线索，<br/>判断交给你。</h3><p>从技能和作品出发，<br/>看见简历之外的可能。</p></div><button className="subtle-link" onClick={()=>setModal({kind:'about'})}>关于这次演示 <Icon name="external" size={14}/></button><span className="edition">TALENT REELS / REBUILT EDITION</span></div></aside>
      <main className="main-area"><section className="discovery-bar"><div><p className="eyebrow">{view==='discover'?'DISCOVER YOUR NEXT COLLABORATOR':'YOUR HANDPICKED PROFILES'}</p><h1>{view==='discover'?'下一位，一起创造的人。':'值得进一步聊聊的人。'}<span>{feed?.total ?? '—'}</span></h1></div><div className="bar-actions"><button className={`icon-button ${showFilters?'on':''}`} onClick={()=>setShowFilters(v=>!v)} aria-label="展开或收起筛选" aria-expanded={showFilters}><Icon name="filter"/></button><button className="undo-button" onClick={undo} disabled={!feed?.undo_event_id||!canAct} title="撤销当前岗位最近一次操作"><Icon name="undo" size={16}/><span>撤销</span></button></div></section>
      <div className="mobile-job"><label htmlFor="mobile-job">目标职位</label><select id="mobile-job" disabled={!bootstrap||busy} value={prefs.job_id} onChange={e=>setPrefs(p=>({...p,job_id:e.target.value}))}>{bootstrap?.jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
      <div className={`filter-row ${showFilters?'expanded':''}`}><div className="search-field"><Icon name="search" size={17}/><label className="sr-only" htmlFor="search">搜索技能或作品</label><input id="search" placeholder="搜索技能、作品或关键词" value={prefs.search} onChange={e=>setPrefs(p=>({...p,search:e.target.value}))} maxLength={80}/>{prefs.search&&<button aria-label="清空搜索" onClick={()=>setPrefs(p=>({...p,search:''}))}><Icon name="close" size={14}/></button>}</div><label className="sr-only" htmlFor="skill-filter">按技能筛选</label><select id="skill-filter" value={prefs.skill} onChange={e=>setPrefs(p=>({...p,skill:e.target.value}))}><option value="">全部技能</option>{bootstrap?.skills.map(s=><option key={s}>{s}</option>)}</select><label className="sr-only" htmlFor="evidence-filter">按作品类型筛选</label><select id="evidence-filter" value={prefs.evidence_type} onChange={e=>setPrefs(p=>({...p,evidence_type:e.target.value}))}><option value="">全部作品</option><option value="code">实现片段</option><option value="demo">产品演示</option><option value="study">实验说明</option></select><span className="sort-label"><span/>按内容相关度排序</span></div>
      {error&&<div className="error-banner" role="alert"><span>{error}</span><button onClick={()=>bootstrap?setRefresh(n=>n+1):window.location.reload()}>重试 <Icon name="undo" size={13}/></button></div>}
      <div className="content-columns"><div className="feed-column">
      {!feed&&error?<div className="empty-state"><span className="empty-graphic"><Icon name="undo" size={32}/></span><h2>暂时无法读取这个岗位</h2><p>请重试后继续浏览。其他岗位的档案不会出现在这里。</p><button className="primary" onClick={()=>bootstrap?setRefresh(n=>n+1):window.location.reload()}>重新加载<Icon name="undo" size={16}/></button></div>:!feed?<div className="loading-state" role="status"><div className="skeleton hero"/><div className="skeleton line"/><div className="skeleton line short"/><p>正在整理作品与岗位线索…</p></div>:feed?.items.length?<>
        <div className={`feed-scroll ${loading?'refreshing':''}`} ref={scrollRef} onScroll={e=>{const el=e.currentTarget;const top=el.getBoundingClientRect().top; const distances=Array.from(el.children).map(child=>Math.abs(child.getBoundingClientRect().top-top)); setActiveIndex(distances.indexOf(Math.min(...distances)));}} aria-label="候选人作品信息流" tabIndex={0} aria-busy={loading}>
          {feed.items.map((candidate,index)=><article className="reel-page" key={candidate.id} aria-label={`候选人 ${candidate.alias}，${index+1}/${feed.items.length}`}>
            <div className="candidate-card"><div className="candidate-top"><div className={`candidate-avatar ${candidate.theme}`}>{candidate.alias.slice(-1)}</div><div><div className="candidate-name"><h2>{candidate.alias}</h2><span>{candidate.code} / 作品档案</span></div><p>{candidate.focus}</p></div><div className="candidate-counter">{String(index+1).padStart(2,'0')} <span>/ {String(feed.items.length).padStart(2,'0')}</span></div></div>
            <ProjectVisual candidate={candidate}/><div className="candidate-body"><div className="headline-line"><h2>{candidate.headline}</h2><button className="mobile-match" disabled={!canAct} onClick={()=>setModal({kind:'match',candidate})}>{candidate.match.score}<small>相关度</small></button></div><p className="candidate-summary">{candidate.summary}</p><div className="skill-tags">{candidate.skills.slice(0,7).map(s=><span className={job?.required.includes(s)?'matched':''} key={s}>{job?.required.includes(s)&&<i/>}{s}</span>)}</div>
            <div className="evidence-heading"><span>让作品说话</span><small>{candidate.evidence.length} 份工作样例</small></div><div className="evidence-links">{candidate.evidence.map(e=><button key={e.id} disabled={!canAct} onClick={()=>setModal({kind:'evidence',jobId:prefs.job_id,candidate,evidence:e})}><span className="evidence-icon"><Icon name={evidenceIcons[e.type]} size={16}/></span><span><b>{e.title}</b><small>{labels[e.type]}</small></span><Icon name="external" size={14}/></button>)}</div></div>
            <div className="card-actions"><button className="skip-button" onClick={()=>act(candidate,'skip')} disabled={!canAct}><Icon name="skip" size={17}/>暂时跳过</button><span className="action-note">先看作品，再作判断</span><button className={`shortlist-button ${candidate.state==='shortlisted'?'saved':''}`} onClick={()=>act(candidate,candidate.state==='shortlisted'?'remove':'shortlist')} disabled={!canAct}><Icon name={candidate.state==='shortlisted'?'check':'bookmark'} size={17}/>{candidate.state==='shortlisted'?'已在短名单':'加入短名单'}<Icon name="arrow" size={17}/></button></div></div>
          </article>)}
        </div><div className="feed-footer"><span><kbd>↑</kbd><kbd>↓</kbd>或滚动，发现下一位</span><div><button aria-label="上一位候选人" onClick={()=>navigate(-1)} disabled={activeIndex===0}><Icon name="up" size={17}/></button><span>{activeIndex+1} <i>/ {feed.items.length}</i></span><button aria-label="下一位候选人" onClick={()=>navigate(1)} disabled={activeIndex>=feed.items.length-1}><Icon name="down" size={17}/></button></div></div>
      </>:<div className="empty-state"><span className="empty-graphic"><Icon name={view==='shortlist'?'bookmark':'search'} size={36}/></span><p className="eyebrow">A LITTLE ROOM FOR POSSIBILITY</p><h2>{view==='shortlist'?'短名单，留给你真正想了解的人。':'这一组线索，暂时没有结果。'}</h2><p>{view==='shortlist'?'在发现页把感兴趣的作品加入短名单，它们会保存在当前岗位下。':'试试其他技能、清空筛选，或撤销刚才的跳过。'}</p><div><button className="primary" onClick={()=>{clearFilters();if(view==='shortlist')setView('discover');}}> {view==='shortlist'?'去发现人才':'清空筛选'}<Icon name="arrow" size={17}/></button>{feed?.undo_event_id&&<button className="secondary" onClick={undo} disabled={!canAct}>撤销上次操作</button>}</div></div>}
      </div><aside className="match-panel" aria-label="排序依据与材料覆盖说明">{active&&job?<MatchContent candidate={active} job={job}/>:<div className="match-placeholder"><Icon name="spark" size={25}/><h2>每一份推荐，都有依据。</h2><p>选择档案后，这里会展示技能覆盖、作品类型及仍需了解的内容。</p></div>}<div className="paper-note"><span>✳</span><p>好的人才，不只是关键词。<br/><b>多看一份作品，多问一个为什么。</b></p></div></aside></div>
      </main>
    </div>
    {toast&&<div className="toast" role="status"><span className="toast-check"><Icon name="check" size={15}/></span>{toast}<button onClick={undo} disabled={!canAct||!feed?.undo_event_id}>撤销</button><button aria-label="关闭提示" onClick={()=>setToast('')}><Icon name="close" size={15}/></button></div>}
    <dialog ref={dialogRef} className="detail-dialog" aria-label={modal?.kind==='evidence'?modal.evidence.title:'详细说明'} onCancel={()=>setModal(null)} onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}><div className="dialog-top"><span className="eyebrow">{modal?.kind==='evidence'?'WORK SAMPLE / 作品证据':modal?.kind==='match'?'TRANSPARENT MATCHING':'ABOUT THE DEMO'}</span><button className="icon-button" aria-label="关闭详情" onClick={()=>setModal(null)}><Icon name="close"/></button></div>
      {modal?.kind==='evidence'&&<div className="evidence-detail"><span className="detail-label">{modal.candidate.alias} / {modal.candidate.code} · {labels[modal.evidence.type]}</span><h2>{modal.evidence.title}</h2><p className="detail-summary">{modal.evidence.summary}</p><div className="sample-preview"><div className="sample-preview-head"><span className="mini-dot"/>SAMPLE NOTES<span>虚构作品说明</span></div>{modal.evidence.details.map((d,i)=><div className="sample-line" key={d}><code>{String(i+1).padStart(2,'0')}</code><p>{d}</p></div>)}</div><div className="detail-skills">{modal.evidence.tools.map(t=><span key={t}>{t}</span>)}</div><div className="discussion-box"><h3>进一步交流，可以从这里开始</h3><p>这部分由你独立完成了什么？最难的一次失败是什么？如果用户量增长，哪一处会先遇到瓶颈？</p></div><p className="detail-disclosure">这是为演示设计的虚构作品结构，不链接真实仓库，也不代表已验证的候选人经历。</p><button className="primary" disabled={!canAct} onClick={()=>act(modal.candidate,modal.candidate.state==='shortlisted'?'remove':'shortlist',modal.jobId)}><Icon name="bookmark" size={17}/>{modal.candidate.state==='shortlisted'?'移出短名单':'加入短名单，稍后聊聊'}</button></div>}
      {modal?.kind==='match'&&job&&<MatchContent candidate={modal.candidate} job={job}/>}
      {modal?.kind==='about'&&<div className="about-detail"><span className="brand-symbol dark"><i/><i/><i/></span><h2>先看见作品，<br/>再认识作品背后的人。</h2><p>Talent Reels 是面向招聘方的候选人发现工作台，将 TikTok 式竖向浏览与技能、项目和工作样例结合。</p><div className="about-rules"><p><b>01 / 明确来源</b>根据项目作者描述重新实现的演示，不是当年黑客松获奖源码。全部候选人、公司及作品均为虚构。</p><p><b>02 / 透明排序</b>核心技能覆盖占 65 分，加分技能覆盖占 20 分，岗位期望的作品类型占 15 分。使用固定规则，不调用模型，不预测录用结果。</p><p><b>03 / 由人判断</b>没有年龄、性别、国籍等排序字段。收藏和跳过仅由当前使用者操作，不自动聘用或淘汰。</p><p><b>04 / 本地保存</b>偏好与短名单保存在本机 SQLite。当前是单工作区演示，不包含账号认证、真实招聘流程或多租户隔离。</p></div></div>}
    </dialog>
  </div>;
}

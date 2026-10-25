'use strict';
(function () {
  const data = window.CFB_DATA;
  if (!data || !Array.isArray(data.teams)) {
    document.getElementById('ratings-tbody').innerHTML = '<tr class="empty-row"><td>Unable to load data.js. Place it beside index.html and reload.</td></tr>';
    return;
  }

  const FIELDS = {
    rank: {label:'RK', full:'Original rating rank', type:'integer', best:'asc'},
    team: {label:'TEAM', full:'Team name', type:'text', best:'asc'},
    rating: {label:'RATING', full:'Predictive rating (points)', type:'rating', best:'desc'},
    tcs: {label:'TCS', full:'Title Contender Score', type:'score', best:'desc'},
    sor: {label:'SOR', full:'Strength of Record', type:'score', best:'desc'},
    sos: {label:'SOS', full:'Strength of Schedule', type:'score', best:'desc'},
    o_adj_epa_play: {label:'ADJ EPA/P', full:'Offense adjusted EPA per play', type:'epa', best:'desc'},
    o_epa_play: {label:'EPA/P', full:'Offensive EPA per play', type:'epa', best:'desc'},
    o_yards_play: {label:'YDS/P', full:'Offensive yards per play', type:'yards', best:'desc'},
    o_sr: {label:'SR%', full:'Offensive success rate', type:'percent', best:'desc'},
    o_epa_db: {label:'EPA/DB', full:'Offensive EPA per dropback', type:'epa', best:'desc'},
    o_yards_db: {label:'YDS/DB', full:'Offensive yards per dropback', type:'yards', best:'desc'},
    o_pass_sr: {label:'PASS SR%', full:'Offensive passing success rate', type:'percent', best:'desc'},
    o_epa_rush: {label:'EPA/RUSH', full:'Offensive EPA per rush', type:'epa', best:'desc'},
    o_yards_rush: {label:'YDS/RUSH', full:'Offensive yards per rush', type:'yards', best:'desc'},
    o_rush_sr: {label:'RUSH SR%', full:'Offensive rushing success rate', type:'percent', best:'desc'},
    o_havoc: {label:'HAVOC%', full:'Offensive havoc allowed rate (lower usually better)', type:'percent', best:'asc'},
    d_adj_epa_play: {label:'ADJ EPA/P', full:'Defense adjusted EPA allowed per play (lower is better)', type:'epa', best:'asc'},
    d_epa_play: {label:'EPA/P', full:'Defense EPA allowed per play (lower is better)', type:'epa', best:'asc'},
    d_yards_play: {label:'YDS/P', full:'Defense yards allowed per play (lower is better)', type:'yards', best:'asc'},
    d_sr: {label:'SR%', full:'Defensive success rate allowed (lower is better)', type:'percent', best:'asc'},
    d_epa_db: {label:'EPA/DB', full:'Defense EPA allowed per dropback (lower is better)', type:'epa', best:'asc'},
    d_yards_db: {label:'YDS/DB', full:'Defense yards allowed per dropback (lower is better)', type:'yards', best:'asc'},
    d_pass_sr: {label:'PASS SR%', full:'Defensive passing success rate allowed (lower is better)', type:'percent', best:'asc'},
    d_epa_rush: {label:'EPA/RUSH', full:'Defense EPA allowed per rush (lower is better)', type:'epa', best:'asc'},
    d_yards_rush: {label:'YDS/RUSH', full:'Defense yards allowed per rush (lower is better)', type:'yards', best:'asc'},
    d_rush_sr: {label:'RUSH SR%', full:'Defensive rushing success rate allowed (lower is better)', type:'percent', best:'asc'},
    d_havoc: {label:'HAVOC%', full:'Defensive havoc rate (higher is better)', type:'percent', best:'desc'},
  };
  const O_KEYS = Object.keys(FIELDS).filter(x => x.startsWith('o_'));
  const D_KEYS = Object.keys(FIELDS).filter(x => x.startsWith('d_'));
  const VIEWS = {
    overall: {name:'Overall', desc:'Overall ranking by predictive Rating; selective offense and defense metrics.', keys:['rank','team','rating','tcs','sor','sos','o_adj_epa_play','d_adj_epa_play','o_sr','d_sr'], sort:'rating'},
    offense: {name:'Offense', desc:'Offensive team performance. Higher is better except havoc allowed.', keys:['rank','team','rating',...O_KEYS], sort:'o_adj_epa_play'},
    defense: {name:'Defense', desc:'Defensive team performance. Lower EPA and success rates are better.', keys:['rank','team','rating',...D_KEYS], sort:'d_adj_epa_play'},
    full: {name:'All Metrics', desc:'All 26 numeric metrics from the original Excel workbook.', keys:['rank','team','rating','tcs','sor','sos',...O_KEYS,...D_KEYS], sort:'rating'},
  };
  const nf1 = new Intl.NumberFormat('en-US', {minimumFractionDigits:1, maximumFractionDigits:1});
  const nf2 = new Intl.NumberFormat('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
  const nf3 = new Intl.NumberFormat('en-US', {minimumFractionDigits:3, maximumFractionDigits:3});
  const teams = data.teams.slice();
  const state = {view:'overall', sortKey:'rating', direction:'desc', filter:''};
  const tbody = document.getElementById('ratings-tbody');
  const thead = document.getElementById('ratings-thead');
  const searchInput = document.getElementById('team-search');

  function format(key, value) {
    if (value === null || value === undefined || Number.isNaN(value)) return '—';
    if (key === 'team') return value;
    switch (FIELDS[key].type) {
      case 'integer': return String(value);
      case 'percent': return nf1.format(value * 100) + '%';
      case 'rating': case 'score': return nf1.format(value);
      case 'epa': return nf3.format(value);
      case 'yards': return nf2.format(value);
      default: return String(value);
    }
  }
  function compare(a, b, key, direction) {
    const x=a[key], y=b[key];
    let sign=0;
    if (typeof x === 'string' || typeof y === 'string') sign=String(x).localeCompare(String(y));
    else sign = x > y ? 1 : x < y ? -1 : 0;
    return (direction === 'asc' ? sign : -sign) || a.rank-b.rank;
  }
  function currentRows() {
    return teams.filter(row => row.team.toLowerCase().includes(state.filter))
      .sort((a,b)=>compare(a,b,state.sortKey,state.direction));
  }
  function currentKeys() { return VIEWS[state.view].keys; }
  function ele(tag,className,text) {
    const node = document.createElement(tag);
    if (className) node.className=className;
    if (text !== undefined) node.textContent=text;
    return node;
  }
  function buildHeaders() {
    thead.replaceChildren();
    const row=ele('tr');
    currentKeys().forEach(key => {
      const meta=FIELDS[key];
      const th=ele('th'); th.scope='col'; th.dataset.key=key;
      th.title=meta.full;
      th.setAttribute('aria-sort', state.sortKey===key ? (state.direction==='asc'?'ascending':'descending'):'none');
      const btn=ele('button'); btn.type='button'; btn.setAttribute('aria-label',`Sort by ${meta.full}`); btn.title=meta.full;
      const displayed = (state.view==='overall'||state.view==='full') && key.startsWith('o_') ? 'O '+meta.label :
                        (state.view==='overall'||state.view==='full') && key.startsWith('d_') ? 'D '+meta.label : meta.label;
      btn.appendChild(ele('span','',displayed));
      btn.appendChild(ele('span','sort-indicator',state.sortKey!==key?'⇅':state.direction==='asc'?'↑':'↓'));
      btn.addEventListener('click',()=>{
        if (state.sortKey===key) state.direction=state.direction==='asc'?'desc':'asc';
        else {state.sortKey=key; state.direction=meta.best;}
        render();
      });
      th.appendChild(btn); row.appendChild(th);
    });
    thead.appendChild(row);
  }
  function drawRows(rows) {
    tbody.replaceChildren();
    if (!rows.length) {
      const tr=ele('tr','empty-row'),td=ele('td','','No teams match your search.');
      td.colSpan=currentKeys().length; tr.appendChild(td); tbody.appendChild(tr); return;
    }
    const frag=document.createDocumentFragment();
    const keys=currentKeys();
    rows.forEach(team => {
      const row=ele('tr');
      keys.forEach(key => {
        const td=ele('td'); td.dataset.key=key;
        if (key==='rank') {
          if (team.rank<=10) td.classList.add('rank-top');
          td.appendChild(ele('span','rank-number',String(team.rank)));
        } else if (key==='team') {
          const wrap=ele('div','team-content');
          const swatch=ele('span','team-color'); swatch.style.setProperty('--team-color',team.primary);
          swatch.setAttribute('aria-hidden','true');
          wrap.append(swatch,ele('span','team-label',team.team));
          td.appendChild(wrap);
        } else {
          td.textContent=format(key,team[key]);
          td.title=`${FIELDS[key].full}: ${format(key,team[key])}`;
        }
        row.appendChild(td);
      });
      frag.appendChild(row);
    });
    tbody.appendChild(frag);
  }
  function render() {
    const rows = currentRows();
    buildHeaders(); drawRows(rows);
    document.querySelectorAll('.tab').forEach(btn=>{
      const active=btn.dataset.view===state.view;
      btn.classList.toggle('active',active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex=active?0:-1;
    });
    document.getElementById('view-description').textContent=VIEWS[state.view].desc;
    document.getElementById('team-counter').textContent=String(rows.length);
    document.getElementById('showing-count').textContent= rows.length===teams.length
      ? `Showing all ${rows.length} FBS teams · Sorted by ${FIELDS[state.sortKey].full}`
      : `Showing ${rows.length} of ${teams.length} FBS teams · Sorted by ${FIELDS[state.sortKey].full}`;
  }
  function leader(metric, descending, elementName, formatKey) {
    const winner=teams.slice().sort((a,b)=>compare(a,b,metric,descending?'desc':'asc'))[0];
    document.getElementById(`leader-${elementName}-team`).textContent=winner.team;
    document.getElementById(`leader-${elementName}-val`).textContent=format(formatKey||metric,winner[metric]);
  }
  function initialize() {
    leader('rating',true,'rating');
    leader('tcs',true,'tcs');
    leader('sor',true,'sor');
    leader('d_adj_epa_play',false,'defense');
    const isoDate = String(data.updated).slice(0,10);
    const parsed = new Date(isoDate+'T12:00:00');
    const formatted = Number.isNaN(parsed.getTime()) ? isoDate : parsed.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
    const shortDate = Number.isNaN(parsed.getTime()) ? isoDate : parsed.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
    document.getElementById('week-label').textContent='Through Week '+data.week;
    document.getElementById('date-label').textContent='Updated '+formatted;
    document.getElementById('header-season').textContent=data.season+' SEASON';
    document.getElementById('header-updated').textContent='UPDATED '+shortDate.toUpperCase();
    document.getElementById('footer-data').textContent=data.season+' SEASON · WEEK '+data.week;
    document.title=`CFB Ratings | ${data.season} Week ${data.week}`;
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
      state.view=btn.dataset.view;
      state.sortKey=VIEWS[state.view].sort;
      state.direction=FIELDS[state.sortKey].best;
      render();
      document.getElementById('table-scroller').scrollLeft=0;
    }));
    // Arrow-key operation of category tabs.
    const tablist = document.querySelector('.tabs');
    tablist.addEventListener('keydown',e=>{
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
      const buttons=[...tablist.querySelectorAll('.tab')];
      const idx=buttons.findIndex(b=>b.dataset.view===state.view);
      const nextIdx=e.key==='Home'?0:e.key==='End'?buttons.length-1:e.key==='ArrowRight'?(idx+1)%buttons.length:(idx+buttons.length-1)%buttons.length;
      e.preventDefault(); buttons[nextIdx].click(); buttons[nextIdx].focus();
    });
    searchInput.addEventListener('input',()=>{state.filter=searchInput.value.toLocaleLowerCase().trim();render();});
    document.addEventListener('keydown',e=>{
      if (e.key==='/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();searchInput.focus();
      }
      if (e.key==='Escape' && document.activeElement===searchInput) {
        searchInput.value='';state.filter='';searchInput.blur();render();
      }
    });
    document.getElementById('export-csv').addEventListener('click',()=>{
      const keys=currentKeys();
      const esc=x=>'"'+String(x??'').replaceAll('"','""')+'"';
      const head=keys.map(k=>FIELDS[k].full);
      const lines=[head,...currentRows().map(t=>keys.map(k=>t[k]))];
      const csv='\ufeff'+lines.map(row=>row.map(esc).join(',')).join('\r\n')+'\r\n';
      const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));
      const a=document.createElement('a'); a.href=url; a.download=`CFB_${data.season}_Week${data.week}_${state.view}.csv`;
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    render();
  }
  initialize();
})();

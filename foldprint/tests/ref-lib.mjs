// Foldprint rule sandbox (GF-20261021-01). Deterministic. Bits: R=1 Y=2 B=4. WAX=-1 (resist cell, never holds paint).
export const WAX = -1;
export function rng(seed){ let s = seed>>>0 || 1; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
// crease: {o:'V'|'H', k} V: between columns k-1 and k. H: between rows k-1 and k.
export function pairs(W,H,c){
  const P=[];
  if(c.o==='V'){ const n=Math.min(c.k,W-c.k); for(let y=0;y<H;y++) for(let i=0;i<n;i++) P.push([y*W+(c.k-1-i), y*W+(c.k+i)]); }
  else { const n=Math.min(c.k,H-c.k); for(let x=0;x<W;x++) for(let i=0;i<n;i++) P.push([(c.k-1-i)*W+x, (c.k+i)*W+x]); }
  return P;
}
export function fold(st, P){ // returns new state (both-way contact transfer)
  const s=st.slice();
  for(const [a,b] of P){ if(st[a]===WAX||st[b]===WAX) continue; const u=st[a]|st[b]; s[a]=u; s[b]=u; }
  return s;
}
export function violates(s,T){ for(let i=0;i<s.length;i++){ if(s[i]===WAX) continue; if(s[i] & ~T[i]) return true; } return false; }
export function eq(s,T){ for(let i=0;i<s.length;i++) if(s[i]!==T[i]) return false; return true; }
export function key(s,used){ return used+':'+s.join(','); }
// full solver: count winning orders; memo of solvable states
export function solve(L){
  const {W,H,creases,start,target}=L; const PP=creases.map(c=>pairs(W,H,c)); const n=creases.length; const full=(1<<n)-1;
  const memo=new Map(); let wins=0; const firstGood=new Set();
  function rec(s,used){ // returns number of winning completions
    const kk=key(s,used); if(memo.has(kk)) return memo.get(kk);
    if(used===full){ const r=eq(s,target)?1:0; memo.set(kk,r); return r; }
    let tot=0;
    for(let i=0;i<n;i++){ if(used>>i&1) continue; const t=fold(s,PP[i]); if(violates(t,target)) continue; tot+=rec(t,used|1<<i); }
    memo.set(kk,tot); return tot;
  }
  wins=rec(start,0);
  return {wins, memo, PP};
}
export function render(L,s){ const ch={'-1':'#',0:'.',1:'R',2:'Y',4:'B',3:'O',6:'G',5:'P',7:'M'}; let out=''; for(let y=0;y<L.H;y++){ let r=''; for(let x=0;x<L.W;x++) r+=ch[s[y*L.W+x]]; out+=r+'\n'; } return out; }
// policies. Each returns {win, smudges}
export function play(L, policy, R, hearts=3, sol=null){
  const {W,H,creases,start,target}=L; const PP=sol?sol.PP:creases.map(c=>pairs(W,H,c)); const n=creases.length; const full=(1<<n)-1;
  let s=start, used=0, sm=0;
  while(used!==full){
    const rem=[]; for(let i=0;i<n;i++) if(!(used>>i&1)) rem.push(i);
    const res=rem.map(i=>{ const t=fold(s,PP[i]); return {i,t,bad:violates(t,target),chg:t.reduce((a,v,j)=>a+(v!==s[j]?1:0),0)}; });
    const safe=res.filter(r=>!r.bad);
    let pick;
    if(policy==='RAND') pick=res[Math.floor(R()*res.length)];
    else {
      if(!safe.length) return {win:false,sm,stuck:true};
      let cand=safe;
      const c=i=>creases[i]; const flap=i=>{const cc=c(i); return cc.o==='V'?Math.min(cc.k,W-cc.k):Math.min(cc.k,H-cc.k);};
      const by=(f,dir)=>{ const vals=cand.map(r=>f(r)); const best=dir>0?Math.max(...vals):Math.min(...vals); cand=cand.filter((r,j)=>vals[j]===best); };
      switch(policy){
        case 'SAFE1': break;
        case 'MINCHG': by(r=>r.chg,-1); break;
        case 'MAXCHG': by(r=>r.chg,1); break;
        case 'OUTER': by(r=>flap(r.i),-1); break;
        case 'INNER': by(r=>flap(r.i),1); break;
        case 'VFIRST': by(r=>c(r.i).o==='V'?1:0,1); break;
        case 'HFIRST': by(r=>c(r.i).o==='H'?1:0,1); break;
        case 'LIST': by(r=>-r.i,1); break; // fold in listed (top-to-bottom, left-to-right) order
        case 'SAFE2': { // 2-step lookahead: prefer moves after which some safe move exists (or finishing)
          const ok=cand.filter(r=>{ const u2=used|1<<r.i; if(u2===full) return eq(r.t,target); for(let j=0;j<n;j++){ if(u2>>j&1) continue; if(!violates(fold(r.t,PP[j]),target)) return true;} return false; });
          if(ok.length) cand=ok; break; }
      }
      pick=cand[Math.floor(R()*cand.length)];
    }
    if(pick.bad){ sm++; if(sm>=hearts) return {win:false,sm}; continue; } // smudge: fold reverted, heart lost
    s=pick.t; used|=1<<pick.i;
  }
  return {win:eq(s,target), sm};
}

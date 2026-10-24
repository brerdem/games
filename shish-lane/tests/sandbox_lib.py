"""Shish Lane sandbox v2 (GF-20261024-01), Game Finder 2026-10-24.
Builds on the unfinished 2026-10-23 sandbox (sim/skewer/) and adds SLABS.
Board: string W*H row-major. '.' empty, '#' coal (stops every skewer),
'A'-'D' ingredient (pierced from any side), 'a'-'d' slab ingredient lying along its row:
pierced only by row thrusts (L/R); a column thrust (T/B) stops at it without taking it.
A thrust takes the first CAP=4 ingredients in travel order (skipping empty cells), stopping
early at a coal, a slab (column thrust only) or the far edge. The taken sequence (case-folded)
must equal an open ticket read either way; otherwise the thrust is rejected (free).
Skewer budget = tickets + 2; undo returns the food but not the skewer.
"""
import random, itertools
from collections import Counter
EMPTY='.'; COAL='#'; CAP=4
def lanes(W,H):
    L=[]
    for r in range(H):
        L.append(('L',r,tuple(r*W+c for c in range(W)))); L.append(('R',r,tuple(r*W+c for c in reversed(range(W)))))
    for c in range(W):
        L.append(('T',c,tuple(r*W+c for r in range(H)))); L.append(('B',c,tuple(r*W+c for r in reversed(range(H)))))
    return L
def skewer(b,lane):
    vert=lane[0] in 'TB'; got=[]; cells=[]
    for i in lane[2]:
        ch=b[i]
        if ch==COAL: break
        if ch==EMPTY: continue
        if vert and ch.islower(): break
        got.append(ch.upper()); cells.append(i)
        if len(got)==CAP: break
    return ''.join(got),tuple(cells)
def canon(s): return min(s,s[::-1])
def remove(b,cells):
    b=list(b)
    for i in cells: b[i]=EMPTY
    return ''.join(b)
def tkey(c): return tuple(sorted(c.elements()))
class Level:
    def __init__(s,W,H,board,tickets):
        s.W,s.H,s.board=W,H,board; s.tickets=tuple(sorted(canon(t) for t in tickets)); s.L=lanes(W,H); s._ok={}
    def legal(s,b,tk):
        oc=Counter(tk); out=[]; seen=set()
        for ln in s.L:
            sk,cs=skewer(b,ln)
            if sk and oc[canon(sk)]>0:
                fs=frozenset(cs)
                if fs in seen: continue
                seen.add(fs); out.append((ln,canon(sk),cs))
        return out
    def step(s,b,tk,mv):
        c=Counter(tk); c[mv[1]]-=1; return remove(b,mv[2]),tkey(+c)
    def ok(s,b,tk):
        k=(b,tk)
        if k in s._ok: return s._ok[k]
        r=True if not tk else any(s.ok(*s.step(b,tk,m)) for m in s.legal(b,tk))
        s._ok[k]=r; return r
    def count_solutions(s):
        memo={}
        def f(b,tk):
            if not tk: return 1
            k=(b,tk)
            if k not in memo: memo[k]=sum(f(*s.step(b,tk,m)) for m in s.legal(b,tk))
            return memo[k]
        return f(s.board,s.tickets)
    def reachable(s):
        seen=set(); st=[(s.board,s.tickets)]
        while st:
            x=st.pop()
            if x in seen: continue
            seen.add(x)
            for m in s.legal(*x): st.append(s.step(*x,m))
        return len(seen)
    def solution(s):
        b,tk=s.board,s.tickets; seq=[]
        while tk:
            for m in s.legal(b,tk):
                b2,t2=s.step(b,tk,m)
                if s.ok(b2,t2): seq.append(m); b,tk=b2,t2; break
        return seq
# ---------------- lazy / heuristic policies ----------------
def score_move(lv,b,tk,m,pol,opts):
    b2,t2=lv.step(b,tk,m)
    if pol=='RAND': return 0
    if pol=='PLY1': return len(lv.legal(b2,t2))                      # keep the most options open
    if pol=='COVER': return len({x[1] for x in lv.legal(b2,t2)})       # keep the most tickets servable
    if pol=='MINDIS':                                                   # break the fewest other matches
        before={x[2] for x in opts if x[2]!=m[2]}; after={x[2] for x in lv.legal(b2,t2)}; return -len(before-after)
    if pol=='LONG': return len(m[1])                                    # longest skewer first
    if pol=='SHORT': return -len(m[1])                                  # shortest first
    if pol=='ROWS': return 1 if m[0][0] in 'LR' else 0
    if pol=='COLS': return 1 if m[0][0] in 'TB' else 0
    if pol=='PLY2':                                                     # 2-ply: best option count after my best follow-up
        nx=lv.legal(b2,t2)
        if not t2: return 99
        return max((len(lv.legal(*lv.step(b2,t2,x))) for x in nx), default=-1)
    raise ValueError(pol)
def play(lv,pol,rng,undos=2,probe=False,hint=False):
    """Returns (cleared, undos_used, hint_used). Budget = tickets+undos skewers.
    probe: undo (spending a skewer) whenever the exact stuck banner shows, banning that thrust from that state.
    hint: one hint, used at the first state with >=4 legal thrusts; reveals one safe thrust."""
    b,tk=lv.board,lv.tickets; used=0; banned=set(); hint_left=1 if hint else 0; hint_used=False
    while tk:
        opts=[m for m in lv.legal(b,tk) if (b,m[2]) not in banned]
        if not opts: return (False,used,hint_used)
        mv=None
        if hint_left and len(opts)>=4:
            safe=[m for m in opts if lv.ok(*lv.step(b,tk,m))]
            if safe: mv=rng.choice(safe); hint_left=0; hint_used=True
        if mv is None:
            sc=[(score_move(lv,b,tk,m,pol,opts),rng.random(),m) for m in opts]
            sc.sort(key=lambda x:(x[0],x[1]),reverse=True); mv=sc[0][2]
        b2,t2=lv.step(b,tk,mv)
        if t2 and not lv.ok(b2,t2):
            if probe and used<undos:
                used+=1; banned.add((b,mv[2])); continue
            return (False,used,hint_used)
        b,tk=b2,t2
    return (True,used,hint_used)
POLS=['RAND','PLY1','COVER','MINDIS','LONG','SHORT','ROWS','COLS','PLY2']
def rates(lv,seeds=300,seed=0,pols=POLS):
    rng=random.Random(seed); out={}
    for p in pols:
        n=seeds if p!='PLY2' else max(60,seeds//4)
        out[p]=sum(play(lv,p,rng)[0] for _ in range(n))/n
        out[p+'+probe']=sum(play(lv,p,rng,probe=True)[0] for _ in range(n))/n
    out['PLY1+probe+hint']=sum(play(lv,'PLY1',rng,probe=True,hint=True)[0] for _ in range(seeds))/seeds
    return out
def lazy_max(r): return max(v for k,v in r.items() if 'hint' not in k)
def opening_safety(lv):
    o=lv.legal(lv.board,lv.tickets); return sum(lv.ok(*lv.step(lv.board,lv.tickets,m)) for m in o),len(o)
def fatal_density(lv):
    b,tk=lv.board,lv.tickets; tot=0;n=0
    for m in lv.solution():
        o=lv.legal(b,tk); tot+=sum(not lv.ok(*lv.step(b,tk,x)) for x in o)/len(o); n+=1; b,tk=lv.step(b,tk,m)
    return tot/n
def variant(lv,board): return Level(lv.W,lv.H,board,lv.tickets)
def no_coal(lv): return variant(lv,lv.board.replace(COAL,EMPTY))
def no_slab(lv): return variant(lv,lv.board.upper())
# ---------------- generator ----------------
def gen(W,H,K,rng,coals=0,slabs=0,minlen=3,tries=3000):
    L=lanes(W,H)
    for _ in range(tries):
        cells=[chr(65+rng.randrange(K)) for _ in range(W*H)]
        idx=rng.sample(range(W*H),coals+slabs)
        for i in idx[:coals]: cells[i]=COAL
        for i in idx[coals:]: cells[i]=cells[i].lower()
        if len(set(c.upper() for c in cells if c!=COAL))<K: continue
        board=''.join(cells); b=board; tk=[]
        while any(ch not in (EMPTY,COAL) for ch in b):
            opts=[(sk,cs) for sk,cs in (skewer(b,ln) for ln in L) if len(sk)>=minlen]
            if not opts: break
            sk,cs=rng.choice(opts); tk.append(sk); b=remove(b,cs)
        if all(ch in (EMPTY,COAL) for ch in b): return Level(W,H,board,tk)
    return None
# ---------------- isomorphism (mirror H/V, rot180; plus transpose for square boards swaps slab axis so excluded) ----------------
def canon_key(lv):
    W,H=lv.W,lv.H; g=[lv.board[r*W:(r+1)*W] for r in range(H)]
    outs=[g,[row[::-1] for row in g],g[::-1],[row[::-1] for row in g[::-1]]]
    letters=sorted(set(c.upper() for c in lv.board if c not in '.#')); best=None
    for gg in outs:
        b=''.join(gg)
        for perm in itertools.permutations(letters):
            mp=dict(zip(letters,perm))
            bb=''.join(mp[c] if c in mp else (mp[c.upper()].lower() if c.upper() in mp else c) for c in b)
            tt=tuple(sorted(canon(''.join(mp[c] for c in t)) for t in lv.tickets))
            k=(W,H,bb,tt)
            if best is None or k<best: best=k
    return best
def show(lv):
    return '\n'.join(lv.board[r*lv.W:(r+1)*lv.W] for r in range(lv.H))

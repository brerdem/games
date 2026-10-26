# Whisk v2 rules. Table W x H, cloths z-ordered rects with a fixed pull dir. Dishes stand on topmost cloth at their cell (or table).
# DRAG c: c + every cloth above it that overlaps (transitively) moves 1 cell in c's dir; dishes on moved cloths ride along.
#   illegal if a riding dish would leave the table, land on a standing dish, or land under a higher cloth;
#   illegal if a moved cloth would slide into a standing dish on a lower layer ("cloth can't pass through a dish").
#   a cloth fully off the table is gone.
# WHIP c: c leaves the table instantly in its dir. Everything on it stays (dishes drop to next layer), cloths above stay.
#   illegal if a standing dish on a lower layer lies in the swept lane (the whip would knock it over).
# GOAL: every dish on its mark AND no cloth left on the table.
from collections import deque
LANE=True
CARRY=True
D={'E':(1,0),'W':(-1,0),'N':(0,-1),'S':(0,1)}
class Lvl:
    def __init__(s,W,H,cloths,dishes,targets): s.W,s.H,s.cl,s.dishes,s.targets=W,H,cloths,dishes,targets
def covers(r,c): return r[0]<=c[0]<r[0]+r[2] and r[1]<=c[1]<r[1]+r[3]
def overlap(a,b): return a[0]<b[0]+b[2] and b[0]<a[0]+a[2] and a[1]<b[1]+b[3] and b[1]<a[1]+a[3]
def onboard(r,l): return not (r[0]>=l.W or r[1]>=l.H or r[0]+r[2]<=0 or r[1]+r[3]<=0)
def rect(l,i,st): x,y,w,h,d=l.cl[i]; ox,oy=st[0][i]; return (x+ox,y+oy,w,h)
def start(l):
    st=(tuple((0,0) for _ in l.cl),tuple(True for _ in l.cl),None)
    ds=[]
    for (x,y) in l.dishes:
        sup=-1
        for i in range(len(l.cl)):
            if covers(rect(l,i,st),(x,y)): sup=i
        ds.append((x,y,sup))
    return (st[0],st[1],tuple(ds))
def lane(l,r,d):
    x,y,w,h=r
    if d=='E': return (x,y,l.W-x,h)
    if d=='W': return (0,y,x+w,h)
    if d=='S': return (x,y,w,l.H-y)
    return (x,0,w,y+h)
def moves(l,st,allow_whip=True):
    offs,pres,ds=st; out=[]; n=len(l.cl)
    for c in range(n):
        if not pres[c]: continue
        rc=rect(l,c,st); d=l.cl[c][4]
        if allow_whip:
            ln=lane(l,rc,d)
            if (not LANE) or not any(s<c and covers(ln,(x,y)) for (x,y,s) in ds):
                npres=list(pres); npres[c]=False; nds=[]
                for (x,y,s) in ds:
                    if s==c:
                        ns=-1
                        for i in range(n):
                            if npres[i] and covers(rect(l,i,st),(x,y)): ns=i
                        nds.append((x,y,ns))
                    else: nds.append((x,y,s))
                out.append((('w',c),(offs,tuple(npres),tuple(nds))))
        M={c}
        for k in range(c+1,n):
            if CARRY and pres[k] and any(overlap(rect(l,k,st),rect(l,m,st)) for m in M): M.add(k)
        dx,dy=D[d]; newr={m:(lambda r:(r[0]+dx,r[1]+dy,r[2],r[3]))(rect(l,m,st)) for m in M}
        ok=True; nds=[]
        for (x,y,s) in ds:
            if s in M:
                nx,ny=x+dx,y+dy
                if not(0<=nx<l.W and 0<=ny<l.H): ok=False;break
                nds.append((nx,ny,s))
            else: nds.append((x,y,s))
        if not ok: continue
        stat=[nds[j] for j in range(len(ds)) if ds[j][2] not in M]
        mov=[nds[j] for j in range(len(ds)) if ds[j][2] in M]
        if any((a[0],a[1])==(b[0],b[1]) for a in mov for b in stat): continue
        if any(m>s and covers(newr[m],(x,y)) for (x,y,s) in stat for m in M): continue
        if any(pres[i] and i not in M and i>s and covers(rect(l,i,st),(x,y)) for (x,y,s) in mov for i in range(n)): continue
        noffs=list(offs); npres=list(pres)
        for m in M:
            noffs[m]=(offs[m][0]+dx,offs[m][1]+dy)
            if not onboard(newr[m],l): npres[m]=False
        out.append((('d',c),(tuple(noffs),tuple(npres),tuple(nds))))
    return out
def goal(l,st): return not any(st[1]) and all((d[0],d[1])==t for d,t in zip(st[2],l.targets))
def graph(l,allow_whip=True):
    s=start(l); seen={s}; q=deque([s]); edges={}
    while q:
        u=q.popleft(); edges[u]=moves(l,u,allow_whip)
        for m,v in edges[u]:
            if v not in seen: seen.add(v); q.append(v)
    rev={u:[] for u in seen}
    for u,vs in edges.items():
        for m,v in vs: rev[v].append(u)
    dg={}; q=deque()
    for u in seen:
        if goal(l,u): dg[u]=0; q.append(u)
    while q:
        u=q.popleft()
        for p in rev[u]:
            if p not in dg: dg[p]=dg[u]+1; q.append(p)
    return edges,dg

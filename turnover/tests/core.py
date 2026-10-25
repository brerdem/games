import random, itertools
from collections import deque
# pancake = color*2 + face (face 0 = golden up, 1 = burnt up). plate = tuple bottom->top
def moves(s, C, S, inplace):
    P=len(s); out=[]
    for i in range(P):
        L=len(s[i])
        for d in range(1, min(L, S)+1):
            for j in range(P):
                if j==i:
                    if not inplace or d<2: continue
                elif len(s[j])+d>C: continue
                out.append((i,d,j))
    return out
SIDED=None  # set of colours with a burnt side; None = all
def apply(s, m):
    i,d,j=m; s=list(s); chunk=s[i][-d:]; rest=s[i][:-d]
    flipped=tuple((p^1 if (SIDED is None or (p>>1) in SIDED) else p) for p in reversed(chunk))
    if i==j: s[i]=rest+flipped
    else: s[i]=rest; s[j]=s[j]+flipped
    return tuple(s)
def canon(s): return tuple(sorted(s))
def is_goal(s, n):
    for pl in s:
        if not pl: continue
        if len(pl)!=n: return False
        c=pl[0]>>1
        for p in pl:
            if p!=c*2: return False
    return True
def bfs_dist(start, n, C, S, inplace, limit=200000):
    # BFS from start; return dict dist, goal distance
    dist={start:0}; q=deque([start]); gd=None
    while q:
        u=q.popleft()
        if is_goal(u,n):
            gd=dist[u]; break
        if len(dist)>limit: return None,None
        for m in moves(u,C,S,inplace):
            v=apply(u,m)
            if v not in dist: dist[v]=dist[u]+1; q.append(v)
    return gd, dist
def goal_dist_map(n,K,P,C,S,inplace,limit=3_000_000):
    # multi-source BFS from all goal states (graph undirected since moves invertible)
    goals=set()
    for perm in itertools.permutations(range(P),K):
        s=[()]*P
        for c,pi in enumerate(perm): s[pi]=tuple([c*2]*n)
        goals.add(tuple(s))
    dist={g:0 for g in goals}; q=deque(goals)
    while q:
        u=q.popleft()
        for m in moves(u,C,S,inplace):
            v=apply(u,m)
            if v not in dist:
                dist[v]=dist[u]+1; q.append(v)
                if len(dist)>limit: return dist
    return dist

# v2: displacement. Pouring into a full glass: new liquid lands on top, the old top layer spills toward the tilt.
# Rocker glasses flip tilt each time they spill. Units leaving the tower are lost.
class Level:
    def __init__(s, glasses, bottles, target, slack=2):
        s.keys=sorted(glasses); s.idx={k:i for i,k in enumerate(s.keys)}
        s.cap=[glasses[k]['cap'] for k in s.keys]; s.rock=[glasses[k]['rocker'] for k in s.keys]
        s.tilt0=tuple(glasses[k]['tilt'] for k in s.keys)
        s.bottles=bottles; s.target=tuple(tuple(target[k]) for k in s.keys)
        s.slack=slack; s.budget=None
    def start(s): return (tuple(() for _ in s.keys), s.tilt0)
    def pour(s, st, b):
        cont=list(st[0]); tilt=list(st[1]); col,pos=s.bottles[b]; path=[]
        while True:
            if pos not in s.idx: return (tuple(cont),tuple(tilt)), ('spill',path)
            i=s.idx[pos]; path.append(i)
            if len(cont[i])<s.cap[i]:
                cont[i]=cont[i]+(col,); return (tuple(cont),tuple(tilt)), ('land',path)
            out=cont[i][-1]; cont[i]=cont[i][:-1]+(col,); col=out
            r,c=pos; t=tilt[i]
            if s.rock[i]: tilt[i]='R' if t=='L' else 'L'
            pos=(r+1,c) if t=='L' else (r+1,c+1)
    def won(s,st): return st[0]==s.target
    def score(s,st): return sum(1 for i,x in enumerate(st[0]) for j,v in enumerate(x) if j<len(s.target[i]) and s.target[i][j]==v)

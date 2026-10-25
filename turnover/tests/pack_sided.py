def sided(sd):
    return None if sd == 'all' else (set() if sd == 'none' else set(map(int, sd.split(','))))

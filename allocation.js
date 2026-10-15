import { CASES, MIN, MAX } from './data.js';
export function suggestGroups(submissions, minimum = MIN, maximum = MAX) {
    const subs = [...submissions].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt) || a.rosterId.localeCompare(b.rosterId));
    let best = null;
    for (let mask = 1; mask < (1 << CASES.length); mask++) {
        const active = CASES.filter((_, i) => mask & (1 << i));
        if (active.length * minimum > subs.length || active.length * maximum < subs.length)
            continue;
        const weeks = new Set(active.map(c => c.week));
        if (weeks.size < 5)
            continue;
        const source = 0, studentStart = 1, topicStart = 1 + subs.length, sink = topicStart + active.length;
        const graph = Array.from({ length: sink + 1 }, () => []);
        function edge(a, b, cap, cost) { const f = { to: b, rev: graph[b].length, cap, cost }, r = { to: a, rev: graph[a].length, cap: 0, cost: -cost }; graph[a].push(f); graph[b].push(r); return f; }
        const links = [];
        subs.forEach((s, i) => { edge(source, studentStart + i, 1, 0); links[i] = active.map((c, j) => edge(studentStart + i, topicStart + j, 1, s.first === c.id ? 0 : s.alt === c.id ? 10 : 100)); });
        active.forEach((_, j) => { edge(topicStart + j, sink, minimum, -10000); edge(topicStart + j, sink, maximum - minimum, 0); });
        let flow = 0;
        while (flow < subs.length) {
            const dist = Array(graph.length).fill(Infinity), prevN = Array(graph.length).fill(-1), prevE = Array(graph.length).fill(-1);
            dist[source] = 0;
            const queue = [source], inQ = Array(graph.length).fill(false);
            inQ[source] = true;
            for (let qi = 0; qi < queue.length; qi++) {
                const v = queue[qi];
                inQ[v] = false;
                graph[v].forEach((e, k) => { if (e.cap > 0 && dist[e.to] > dist[v] + e.cost) {
                    dist[e.to] = dist[v] + e.cost;
                    prevN[e.to] = v;
                    prevE[e.to] = k;
                    if (!inQ[e.to]) {
                        queue.push(e.to);
                        inQ[e.to] = true;
                    }
                } });
            }
            if (prevN[sink] < 0)
                break;
            for (let v = sink; v !== source; v = prevN[v]) {
                const e = graph[prevN[v]][prevE[v]];
                e.cap--;
                graph[v][e.rev].cap++;
            }
            flow++;
        }
        if (flow !== subs.length)
            continue;
        const groups = active.map((c, j) => ({ topic: c, members: subs.filter((_, i) => links[i][j].cap === 0).map(s => ({ ...s, placedOn: s.first === c.id ? 'First choice' : s.alt === c.id ? 'Alternative' : 'Instructor review' })) }));
        if (groups.some(g => g.members.length < minimum || g.members.length > maximum))
            continue;
        const first = groups.reduce((n, g) => n + g.members.filter(s => s.placedOn === 'First choice').length, 0), alt = groups.reduce((n, g) => n + g.members.filter(s => s.placedOn === 'Alternative').length, 0), review = subs.length - first - alt;
        const score = review * 10000 + alt * 10 + groups.length;
        if (!best || score < best.score)
            best = { score, groups, first, alt, review, closed: CASES.filter(c => !active.some(a => a.id === c.id)) };
    }
    return best;
}

// 采用相对路径，自动适配后端实际绑定的 host 与 port
export const API_BASE = "/api";

export async function fetchTransitions(state, maxDifficulty) {
    const res = await fetch(`${API_BASE}/transitions/${state}?max_difficulty=${maxDifficulty}`);
    if (!res.ok) throw new Error("获取可行转移失败");
    return await res.json();
}

export async function verifySequence(sequence) {
    const res = await fetch(`${API_BASE}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sequence })
    });
    if (!res.ok) throw new Error("验证失败");
    return await res.json();
}

export async function generateSequence(steps, maxDifficulty, startState) {
    const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            steps,
            max_difficulty: maxDifficulty,
            start_state: startState
        })
    });
    if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "自动规划算法未给出有效方案");
    }
    return await res.json();
}

export async function verifyMovesSequence(moveIds, startState) {
    const res = await fetch(`${API_BASE}/verify/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            move_ids: moveIds,
            start_state: startState || null
        })
    });
    if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "步法流序列校验失败");
    }
    return await res.json();
}

export async function searchPaths(startState, endState, intermediateCount, maxDifficulty, maxResults) {
    const res = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            start_state: startState,
            end_state: endState,
            intermediate_count: parseInt(intermediateCount),
            max_difficulty: parseInt(maxDifficulty),
            max_results: parseInt(maxResults)
        })
    });
    if (!res.ok) {
        const detail = await res.json();
        throw new Error(detail.detail || "路径检索失败");
    }
    return await res.json();
}
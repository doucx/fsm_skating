export const API_BASE = "http://127.0.0.1:8000/api";

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
def reward(before: dict, after: dict, weights=(0.4, 0.5, 0.1)) -> float:
    cost_delta = (before.get("cost", 0) - after.get("cost", 0)) / max(1, before.get("cost", 1))
    latency_delta = (before.get("p95", 0) - after.get("p95", 0)) / max(1, before.get("p95", 1))
    reliability_delta = after.get("uptime", 1.0) - before.get("uptime", 1.0)
    return weights[0] * cost_delta + weights[1] * latency_delta + weights[2] * reliability_delta


if __name__ == "__main__":
    before_state = {"cost": 60, "p95": 420, "uptime": 0.99}
    after_state = {"cost": 50, "p95": 310, "uptime": 0.995}
    print(f"reward={reward(before_state, after_state):.4f}")


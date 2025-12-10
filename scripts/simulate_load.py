"""
Minimal synthetic load script placeholder.
Extend with k6/vegeta integration or requests-based probes.
"""
import time
import random


def simulate(service: str, duration_seconds: int = 5) -> dict:
    latencies = [random.randint(80, 250) for _ in range(50)]
    errors = [0 if random.random() > 0.95 else 1 for _ in range(50)]
    time.sleep(duration_seconds / 10)
    return {
        "service": service,
        "p50": sorted(latencies)[25],
        "p95": sorted(latencies)[47],
        "error_rate": sum(errors) / len(errors),
    }


if __name__ == "__main__":
    print(simulate("auth"))


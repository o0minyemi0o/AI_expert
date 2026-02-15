# 동적 프로그래밍 기초

## 왜 동적 프로그래밍이 중요한가

동적 프로그래밍(DP)은 코딩 인터뷰에서 가장 어렵고 동시에 가장 자주 출제되는 주제입니다. DP의 핵심은 **중복 부분 문제(overlapping subproblems)**를 식별하고, 이미 계산한 결과를 재활용하여 지수적 시간 복잡도를 다항 시간으로 줄이는 것입니다. algorithm-design 과정에서 학습한 DP 이론을 인터뷰 실전에 적용합니다.

> **핵심 직관**: DP 문제를 만나면 "상태(state)가 무엇인가"와 "상태 전이(transition)가 무엇인가" 두 질문에 답하는 것이 출발점입니다.

## 1. DP 문제 식별 기준

| 신호 | 예시 | DP 가능성 |
|------|------|----------|
| "최소/최대를 구하라" | 최소 동전 수, 최대 이익 | 높음 |
| "방법의 수를 구하라" | 경로 수, 조합 수 | 높음 |
| "가능한지 판단하라" | 문자열 분할 가능 여부 | 중간 |
| "최적 구조를 찾아라" | 행렬 곱셈 순서 | 높음 |
| 그리디가 안 되는 경우 | 동전 교환 (임의 단위) | 높음 |

```
DP vs 그리디 판별:

  문제의 최적 부분구조? ──No──→ DP 불가, 다른 접근
       │ Yes
       ▼
  그리디 선택 속성? ──Yes──→ 그리디 (coi-08)
       │ No
       ▼
  중복 부분 문제? ──Yes──→ DP
       │ No
       ▼
  분할 정복
```

## 2. 탑다운 vs 바텀업

| 특성 | 탑다운 (메모이제이션) | 바텀업 (테이블) |
|------|---------------------|----------------|
| 접근 방식 | 재귀 + 캐시 | 반복문 + 테이블 |
| 구현 난이도 | 직관적 | 순서 설계 필요 |
| 공간 최적화 | 어려움 | 가능 (롤링 배열) |
| 불필요한 계산 | 필요한 것만 계산 | 모든 상태 계산 |
| 스택 오버플로 | 가능 (깊은 재귀) | 없음 |

```python
# 피보나치: 탑다운 — O(n) 시간, O(n) 공간
from functools import lru_cache

@lru_cache(maxsize=None)
def fib_top_down(n: int) -> int:
    if n <= 1:
        return n
    return fib_top_down(n - 1) + fib_top_down(n - 2)

# 피보나치: 바텀업 (공간 최적화) — O(n) 시간, O(1) 공간
def fib_bottom_up(n: int) -> int:
    if n <= 1:
        return n
    prev, curr = 0, 1
    for _ in range(2, n + 1):
        prev, curr = curr, prev + curr
    return curr
```

## 3. 배낭 문제 (Knapsack)

DP의 대표 문제로, 0/1 배낭과 무한 배낭 두 가지 변형이 있습니다.

```python
# 0/1 Knapsack — O(n*W) 시간, O(W) 공간 (1차원 최적화)
def knapsack_01(weights: list[int], values: list[int], W: int) -> int:
    dp = [0] * (W + 1)
    for i in range(len(weights)):
        for w in range(W, weights[i] - 1, -1):  # 역순 순회 (핵심!)
            dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[W]

# 무한 배낭 (Unbounded Knapsack) — O(n*W) 시간, O(W) 공간
def knapsack_unbounded(weights: list[int], values: list[int], W: int) -> int:
    dp = [0] * (W + 1)
    for w in range(1, W + 1):
        for i in range(len(weights)):
            if weights[i] <= w:
                dp[w] = max(dp[w], dp[w - weights[i]] + values[i])
    return dp[W]
```

> **핵심 직관**: 0/1 배낭에서 역순 순회는 각 아이템을 한 번만 사용하기 위함입니다. 정순 순회하면 무한 배낭이 됩니다. 이 차이를 명확히 이해해야 합니다.

| 배낭 유형 | 순회 방향 | 각 아이템 사용 | 대표 문제 |
|----------|----------|--------------|-----------|
| 0/1 배낭 | 역순 | 최대 1번 | 부분집합 합 |
| 무한 배낭 | 정순 | 무제한 | 동전 교환 |

## 4. 최장 증가 부분수열 (LIS)

```python
# LIS — O(n^2) 시간, O(n) 공간
def lis_dp(nums: list[int]) -> int:
    if not nums:
        return 0
    n = len(nums)
    dp = [1] * n  # dp[i] = nums[i]로 끝나는 LIS 길이
    for i in range(1, n):
        for j in range(i):
            if nums[j] < nums[i]:
                dp[i] = max(dp[i], dp[j] + 1)
    return max(dp)

# LIS — O(n log n) 시간, O(n) 공간 (이분 탐색 최적화)
import bisect

def lis_binary_search(nums: list[int]) -> int:
    tails = []  # tails[i] = 길이 i+1인 LIS의 최소 마지막 원소
    for num in nums:
        pos = bisect.bisect_left(tails, num)
        if pos == len(tails):
            tails.append(num)
        else:
            tails[pos] = num
    return len(tails)
```

## 5. 최장 공통 부분수열 (LCS)

```python
# LCS — O(n*m) 시간, O(n*m) 공간
def lcs(text1: str, text2: str) -> int:
    m, n = len(text1), len(text2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if text1[i - 1] == text2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    return dp[m][n]
```

```
LCS 테이블 예시: text1="ABCDE", text2="ACE"

      ""  A  C  E
  ""   0  0  0  0
  A    0  1  1  1
  B    0  1  1  1
  C    0  1  2  2
  D    0  1  2  2
  E    0  1  2  3   ← LCS 길이 = 3 ("ACE")
```

## 6. 동전 교환 문제

```python
# Coin Change (최소 동전 수) — O(n*amount) 시간, O(amount) 공간
def coin_change(coins: list[int], amount: int) -> int:
    dp = [float('inf')] * (amount + 1)
    dp[0] = 0

    for coin in coins:
        for a in range(coin, amount + 1):
            dp[a] = min(dp[a], dp[a - coin] + 1)

    return dp[amount] if dp[amount] != float('inf') else -1

# Coin Change 2 (조합의 수) — O(n*amount) 시간, O(amount) 공간
def coin_change_ways(coins: list[int], amount: int) -> int:
    dp = [0] * (amount + 1)
    dp[0] = 1

    for coin in coins:  # 동전 먼저 순회 → 조합 (순서 무관)
        for a in range(coin, amount + 1):
            dp[a] += dp[a - coin]

    return dp[amount]
```

## 7. 시나리오: DP 문제 설계 과정

**문제**: 계단을 1칸 또는 2칸씩 오를 수 있을 때, n번째 계단에 도달하는 방법의 수를 구하시오.

```
DP 설계 4단계:

  1. 상태 정의: dp[i] = i번째 계단에 도달하는 방법의 수
  2. 상태 전이: dp[i] = dp[i-1] + dp[i-2]
  3. 기저 조건: dp[0] = 1, dp[1] = 1
  4. 답: dp[n]
```

```python
# Climbing Stairs — O(n) 시간, O(1) 공간
def climb_stairs(n: int) -> int:
    if n <= 2:
        return n
    prev, curr = 1, 2
    for _ in range(3, n + 1):
        prev, curr = curr, prev + curr
    return curr
```

> **핵심 직관**: 모든 DP 문제는 "상태 정의 → 상태 전이 → 기저 조건 → 답 위치" 4단계로 체계적으로 설계할 수 있습니다. 이 프레임워크를 면접에서 소리 내어 설명하면 높은 평가를 받습니다.

DP 기초를 체화한 후 coi-07에서 구간 DP, 비트마스크 DP, 트리 DP 등 심화 주제로 확장합니다. deep-learning(dl-) 과정에서 역전파의 동적 계산 그래프도 DP의 일종이라는 관점이 흥미롭습니다.

## 핵심 정리

- DP 문제를 식별하는 신호는 **"최소/최대", "방법의 수", "가능 여부"** 키워드와 중복 부분 문제의 존재입니다
- **탑다운**(메모이제이션)은 직관적이고, **바텀업**(테이블)은 공간 최적화가 가능합니다
- **0/1 배낭**은 역순 순회, **무한 배낭**은 정순 순회가 핵심 차이이며, 동전 교환이 대표적입니다
- **LIS**는 O(n^2) DP와 O(n log n) 이분 탐색 두 가지 풀이를 모두 숙지해야 합니다
- DP 설계는 **상태 정의 → 상태 전이 → 기저 조건 → 답 위치** 4단계 프레임워크를 따릅니다

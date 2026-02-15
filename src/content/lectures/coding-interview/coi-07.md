# 동적 프로그래밍 심화

## 왜 동적 프로그래밍 심화가 중요한가

coi-06에서 학습한 기초 DP만으로는 해결할 수 없는 고급 문제들이 상위권 기업 인터뷰에서 출제됩니다. 구간 DP, 비트마스크 DP, 트리 DP는 각각 독자적인 상태 설계 기법을 요구하며, 이를 체화하면 DP 문제 전반에 대한 **패턴 인식 능력**이 비약적으로 향상됩니다.

> **핵심 직관**: 심화 DP의 핵심은 "어떤 차원의 상태를 추가해야 문제를 분해할 수 있는가"를 발견하는 것입니다. 구간의 양 끝, 비트마스크, 트리의 부모-자식 관계가 그 차원이 됩니다.

## 1. 구간 DP (Interval DP)

구간 DP는 **구간 [i, j]에 대한 최적해**를 더 작은 구간들로 분해하는 기법입니다. 행렬 곱셈 순서, 풍선 터뜨리기 등이 대표 문제입니다.

| 특징 | 설명 |
|------|------|
| 상태 | dp[i][j] = 구간 [i, j]의 최적값 |
| 전이 | 분할점 k를 순회하며 dp[i][k] + dp[k+1][j] + cost |
| 순서 | 구간 길이가 짧은 것부터 채움 |
| 복잡도 | 일반적으로 O(n^3) |

```python
# 행렬 체인 곱셈 최소 비용 — O(n^3) 시간, O(n^2) 공간
def matrix_chain_order(dims: list[int]) -> int:
    n = len(dims) - 1  # 행렬 개수
    dp = [[0] * n for _ in range(n)]

    # 구간 길이 순으로 채움
    for length in range(2, n + 1):
        for i in range(n - length + 1):
            j = i + length - 1
            dp[i][j] = float('inf')
            for k in range(i, j):
                cost = dp[i][k] + dp[k + 1][j] + dims[i] * dims[k + 1] * dims[j + 1]
                dp[i][j] = min(dp[i][j], cost)

    return dp[0][n - 1]
```

```
구간 DP 채움 순서 (n=4):

  길이 1: dp[0][0], dp[1][1], dp[2][2], dp[3][3]  (기저: 0)
  길이 2: dp[0][1], dp[1][2], dp[2][3]
  길이 3: dp[0][2], dp[1][3]
  길이 4: dp[0][3]  ← 최종 답
```

## 2. 비트마스크 DP

비트마스크 DP는 **집합의 상태를 정수의 비트로 표현**하여, 부분집합에 대한 DP를 수행합니다. n이 20 이하일 때 주로 사용합니다.

| 비트 연산 | 의미 | Python 코드 |
|-----------|------|------------|
| i번째 원소 포함 확인 | 집합에 i 존재? | `mask & (1 << i)` |
| i번째 원소 추가 | 집합에 i 추가 | `mask \| (1 << i)` |
| i번째 원소 제거 | 집합에서 i 제거 | `mask & ~(1 << i)` |
| 전체 집합 | {0, 1, ..., n-1} | `(1 << n) - 1` |
| 원소 개수 | 집합 크기 | `bin(mask).count('1')` |

```python
# TSP (외판원 문제) — O(n^2 * 2^n) 시간, O(n * 2^n) 공간
def tsp(dist: list[list[int]]) -> int:
    n = len(dist)
    full_mask = (1 << n) - 1
    dp = [[float('inf')] * n for _ in range(1 << n)]
    dp[1][0] = 0  # 시작점 0 방문

    for mask in range(1 << n):
        for u in range(n):
            if dp[mask][u] == float('inf'):
                continue
            if not (mask & (1 << u)):
                continue
            for v in range(n):
                if mask & (1 << v):
                    continue  # 이미 방문
                new_mask = mask | (1 << v)
                dp[new_mask][v] = min(dp[new_mask][v], dp[mask][u] + dist[u][v])

    # 모든 도시 방문 후 시작점으로 복귀
    return min(dp[full_mask][u] + dist[u][0] for u in range(n))
```

> **핵심 직관**: 비트마스크 DP에서 mask는 "현재까지 방문/선택한 원소의 집합"을 나타냅니다. n이 20 이하라는 제약이 보이면 비트마스크 DP를 의심하십시오.

## 3. 트리 DP

트리 DP는 **트리의 각 노드에서 서브트리에 대한 최적해**를 구하는 기법입니다. DFS 후위 순회로 자식의 결과를 모아 부모의 값을 계산합니다(coi-05 참고).

```python
# 트리에서 도둑 문제 (House Robber III) — O(n) 시간, O(h) 공간
# 인접한 노드를 동시에 선택할 수 없을 때 최대 합
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def rob_tree(root: TreeNode) -> int:
    def dfs(node: TreeNode) -> tuple[int, int]:
        # 반환: (노드 선택 시 최대값, 노드 미선택 시 최대값)
        if not node:
            return (0, 0)

        left = dfs(node.left)
        right = dfs(node.right)

        # 현재 노드 선택: 자식은 미선택
        rob = node.val + left[1] + right[1]
        # 현재 노드 미선택: 자식은 선택/미선택 중 최대
        skip = max(left) + max(right)

        return (rob, skip)

    return max(dfs(root))
```

```
트리 DP 흐름 (House Robber III):

        3              dfs(3) = (rob=3+0+0, skip=4+5) = (3, 9)
       / \             → max(3, 9) = 9 (3 미선택)
      4   5
     / \    \          dfs(4) = (rob=4+0+0, skip=1+3) = (4, 4)
    1   3    1         dfs(5) = (rob=5+0+0, skip=0+1) = (5, 1)

  답: 4+1+5 = ... 아니면 트리 구조에 따라 최적 계산
```

## 4. DP 상태 최적화 기법

| 기법 | 설명 | 공간 절감 |
|------|------|----------|
| 롤링 배열 | 이전 행만 유지 | O(n*m) → O(m) |
| 1차원 축소 | 역순 순회로 in-place | O(n*W) → O(W) |
| 상태 압축 | 불필요한 상태 제거 | 문제 종속적 |
| 매개변수 제거 | 한 상태로 다른 상태 유추 | 차원 축소 |

```python
# 2D DP를 1D로 최적화 — 고유 경로 문제
# 원래: dp[i][j] = dp[i-1][j] + dp[i][j-1], O(m*n) 공간
# 최적화: 한 행만 유지, O(n) 공간

def unique_paths(m: int, n: int) -> int:
    dp = [1] * n
    for i in range(1, m):
        for j in range(1, n):
            dp[j] += dp[j - 1]  # dp[j]는 위, dp[j-1]은 왼쪽
    return dp[n - 1]
```

## 5. 시나리오: 편집 거리 (Edit Distance)

**문제**: 두 문자열 word1을 word2로 변환하는 최소 연산 수 (삽입, 삭제, 교체).

```
DP 설계:
  상태: dp[i][j] = word1[:i]를 word2[:j]로 변환하는 최소 연산 수
  전이:
    word1[i-1] == word2[j-1] → dp[i][j] = dp[i-1][j-1]
    아니면 → dp[i][j] = 1 + min(dp[i-1][j],      # 삭제
                                dp[i][j-1],        # 삽입
                                dp[i-1][j-1])      # 교체
```

```python
# Edit Distance — O(n*m) 시간, O(n*m) 공간
def min_distance(word1: str, word2: str) -> int:
    m, n = len(word1), len(word2)
    dp = [[0] * (n + 1) for _ in range(m + 1)]

    for i in range(m + 1):
        dp[i][0] = i
    for j in range(n + 1):
        dp[0][j] = j

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if word1[i - 1] == word2[j - 1]:
                dp[i][j] = dp[i - 1][j - 1]
            else:
                dp[i][j] = 1 + min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])

    return dp[m][n]
```

> **핵심 직관**: 편집 거리는 NLP의 텍스트 유사도 측정(dl- 시리즈 참고)에도 직접 활용됩니다. 알고리즘 지식이 ML 영역과 연결되는 대표적 사례입니다.

## 6. DP 유형별 패턴 정리

```
DP 문제 키워드               적용 패턴
────────────────────────────────────────────────
"최소 비용으로 변환"        → 편집 거리 류 (2D DP)
"구간에서 최적값"           → 구간 DP (O(n^3))
"집합에서 최적 순서"        → 비트마스크 DP (n<=20)
"트리에서 선택/미선택"      → 트리 DP (DFS 후위)
"문자열 매칭"               → 2D DP (LCS/정규식, coi-03)
"격자에서 경로"             → 2D DP → 1D 최적화
"연속 부분배열 최대"        → 카데인 알고리즘 (1D DP)
```

이 강의에서 다룬 심화 DP 기법들은 algorithm-design 과정의 이론적 기반 위에 구축됩니다. coi-09의 백트래킹은 DP의 가지치기 버전으로 이해할 수 있으며, coi-10의 ML 코딩에서도 역전파 구현 시 동적 계산 그래프라는 DP 개념이 등장합니다.

## 핵심 정리

- **구간 DP**는 dp[i][j]로 구간의 최적해를 구하며, 구간 길이 순으로 채워 O(n^3)에 해결합니다
- **비트마스크 DP**는 집합을 정수 비트로 표현하여 O(n^2 * 2^n)에 부분집합 최적화를 수행합니다
- **트리 DP**는 DFS 후위 순회로 자식의 결과를 모아 부모의 최적값을 계산합니다
- **공간 최적화**는 롤링 배열, 1차원 축소, 역순 순회 등의 기법으로 O(n*m)을 O(m)으로 줄입니다
- DP 문제의 키워드(구간, 집합, 트리, 변환)를 패턴과 **즉시 매핑**하는 능력이 인터뷰 속도를 결정합니다

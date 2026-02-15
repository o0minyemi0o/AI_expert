# 세그먼트 트리

## 왜 세그먼트 트리가 중요한가

배열의 **구간 합, 구간 최솟값** 같은 쿼리를 반복적으로 처리해야 할 때, 단순 반복은 $O(N)$이고 누적합은 업데이트가 $O(N)$입니다. 세그먼트 트리는 **쿼리와 업데이트 모두 $O(\log N)$**으로 처리하는 자료구조입니다. 코딩 인터뷰와 경시 프로그래밍의 필수 도구이며, 데이터베이스 인덱스의 원리와도 연결됩니다.

> **핵심 직관**: 세그먼트 트리의 핵심 아이디어는 "구간을 반씩 나누어 트리 노드에 미리 계산해 두는 것"입니다. 어떤 구간이든 $O(\log N)$개의 노드 조합으로 표현할 수 있습니다.

## 1. 기본 구조

```
배열 [2, 5, 1, 4, 3, 6] 의 구간 합 세그먼트 트리:

            [21]              ← 전체 합 (0..5)
          /      \
       [8]       [13]         ← (0..2), (3..5)
      /    \    /    \
    [7]   [1] [7]   [6]      ← (0..1), (2), (3..4), (5)
   /  \       /  \
  [2] [5]   [4] [3]          ← 리프: 원래 배열 값

  노드가 담당하는 구간:
  - 루트: [0, N-1] 전체
  - 왼쪽 자식: [L, mid]
  - 오른쪽 자식: [mid+1, R]
  - 리프: 원소 하나 [i, i]

  크기: 배열 크기 N → 트리 크기 4N (넉넉하게)
```

## 2. 빌드, 쿼리, 업데이트

```python
class SegmentTree:
    def __init__(self, arr):
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self._build(arr, 1, 0, self.n - 1)

    def _build(self, arr, node, start, end):
        if start == end:
            self.tree[node] = arr[start]
            return
        mid = (start + end) // 2
        self._build(arr, 2 * node, start, mid)
        self._build(arr, 2 * node + 1, mid + 1, end)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]

    def query(self, node, start, end, l, r):
        """구간 [l, r]의 합"""
        if r < start or end < l:
            return 0  # 범위 밖
        if l <= start and end <= r:
            return self.tree[node]  # 완전히 포함
        mid = (start + end) // 2
        return (self.query(2 * node, start, mid, l, r) +
                self.query(2 * node + 1, mid + 1, end, l, r))

    def update(self, node, start, end, idx, val):
        """arr[idx] = val"""
        if start == end:
            self.tree[node] = val
            return
        mid = (start + end) // 2
        if idx <= mid:
            self.update(2 * node, start, mid, idx, val)
        else:
            self.update(2 * node + 1, mid + 1, end, idx, val)
        self.tree[node] = self.tree[2 * node] + self.tree[2 * node + 1]
```

## 3. 복잡도 분석

```
쿼리가 O(log N)인 이유:

  구간 [l, r] 쿼리 시:
  - 트리의 각 레벨에서 최대 4개 노드 방문
  - 그 중 "부분적으로 겹치는" 노드만 분할
  - 트리 높이 = O(log N)
  → 총 방문 노드: O(log N)

  예: [1, 4] 쿼리
  레벨 0: [0..5] → 부분 겹침, 분할
  레벨 1: [0..2] 부분, [3..5] 부분
  레벨 2: [0..1] 부분, [2] 포함, [3..4] 포함, [5] 밖
  레벨 3: [0] 밖, [1] 포함
  → 실제 사용 노드: [1], [2], [3..4] 합산
```

| 연산 | 시간 복잡도 | 설명 |
|------|-----------|------|
| Build | $O(N)$ | 모든 노드 1회 방문 |
| Query | $O(\log N)$ | 레벨당 상수 노드 |
| Update | $O(\log N)$ | 루트→리프 경로 |
| 공간 | $O(N)$ | 4N 배열 |

> **핵심 직관**: 세그먼트 트리는 **결합법칙을 만족하는 모든 연산**에 사용할 수 있습니다. 합, 최솟값, 최댓값, GCD, XOR 등 $a \oplus (b \oplus c) = (a \oplus b) \oplus c$이면 됩니다.

## 4. 다양한 응용

```
구간 최솟값 (Range Minimum Query):

  merge 함수만 변경:
  self.tree[node] = min(self.tree[2*node], self.tree[2*node+1])

  query에서 범위 밖 반환값: float('inf')


구간 GCD:

  from math import gcd
  self.tree[node] = gcd(self.tree[2*node], self.tree[2*node+1])


구간 최댓값 + 인덱스:

  노드에 (값, 인덱스) 저장
  merge: max로 비교
```

## 5. 반복적 구현

```python
# 반복적(iterative) 세그먼트 트리 - 더 빠름
class IterSegTree:
    def __init__(self, arr):
        self.n = len(arr)
        self.tree = [0] * (2 * self.n)
        # 리프 노드 채우기
        for i in range(self.n):
            self.tree[self.n + i] = arr[i]
        # 내부 노드 빌드
        for i in range(self.n - 1, 0, -1):
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]

    def update(self, i, val):
        i += self.n
        self.tree[i] = val
        while i > 1:
            i //= 2
            self.tree[i] = self.tree[2 * i] + self.tree[2 * i + 1]

    def query(self, l, r):  # [l, r)
        res = 0
        l += self.n
        r += self.n
        while l < r:
            if l & 1:
                res += self.tree[l]; l += 1
            if r & 1:
                r -= 1; res += self.tree[r]
            l >>= 1; r >>= 1
        return res
```

> **핵심 직관**: 반복적 구현은 재귀 오버헤드가 없어 2-3배 빠르며, 코드도 간결합니다. 경시 프로그래밍에서는 반복적 구현을 선호하고, 면접에서는 이해도를 보여주기 위해 재귀적 구현이 좋습니다.

## 6. 실전 문제 유형

```
유형 1: 구간 합 + 포인트 업데이트
  → 기본 세그먼트 트리

유형 2: 구간 합 + 구간 업데이트
  → Lazy Propagation (ads-02)

유형 3: K번째 작은 수 찾기
  → Merge Sort Tree 또는 Persistent Seg Tree (ads-02)

유형 4: 구간 내 서로 다른 수의 개수
  → 오프라인 쿼리 + 세그먼트 트리

유형 5: 2D 구간 합
  → 2D 세그먼트 트리 또는 2D BIT (ads-02)
```

세그먼트 트리의 Lazy Propagation과 Persistent 변형은 ads-02에서, 확률적 대안인 BIT(Fenwick Tree)는 더 단순한 구현이 필요할 때 사용합니다.

## 핵심 정리

- 세그먼트 트리는 **구간 쿼리와 포인트 업데이트를 $O(\log N)$**으로 처리하는 이진 트리 자료구조입니다
- **결합법칙을 만족하는 모든 연산**(합, 최소, 최대, GCD, XOR)에 범용적으로 사용할 수 있습니다
- 트리 크기는 $4N$이며, Build $O(N)$, Query/Update $O(\log N)$의 복잡도를 가집니다
- **반복적 구현**이 재귀보다 2-3배 빠르며 코드가 간결하여 실전에서 선호됩니다
- 구간 업데이트가 필요하면 **Lazy Propagation**(ads-02)으로 확장합니다

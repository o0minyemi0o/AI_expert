# 세그먼트 트리 고급

## 왜 Lazy Propagation이 필요한가

ads-01의 기본 세그먼트 트리는 **포인트 업데이트만** $O(\log N)$입니다. "구간 [l, r]의 모든 원소에 5를 더하라" 같은 **구간 업데이트**는 최악 $O(N \log N)$이 됩니다. Lazy Propagation은 업데이트를 즉시 전파하지 않고 **필요할 때까지 미루는** 기법으로, 구간 업데이트도 $O(\log N)$으로 만듭니다.

> **핵심 직관**: Lazy Propagation의 아이디어는 "지금 안 써도 되는 정보는 나중에 전파하자"입니다. 구간 전체가 업데이트 범위에 포함되면 자식에게 내려보내지 않고 해당 노드에 "메모"만 남깁니다.

## 1. Lazy Propagation 구현

```python
class LazySegTree:
    def __init__(self, arr):
        self.n = len(arr)
        self.tree = [0] * (4 * self.n)
        self.lazy = [0] * (4 * self.n)
        self._build(arr, 1, 0, self.n - 1)

    def _build(self, arr, node, s, e):
        if s == e:
            self.tree[node] = arr[s]; return
        mid = (s + e) // 2
        self._build(arr, 2*node, s, mid)
        self._build(arr, 2*node+1, mid+1, e)
        self.tree[node] = self.tree[2*node] + self.tree[2*node+1]

    def _push_down(self, node, s, e):
        """lazy 값을 자식에게 전파"""
        if self.lazy[node] != 0:
            mid = (s + e) // 2
            self._apply(2*node, s, mid, self.lazy[node])
            self._apply(2*node+1, mid+1, e, self.lazy[node])
            self.lazy[node] = 0

    def _apply(self, node, s, e, val):
        self.tree[node] += val * (e - s + 1)  # 구간 합 갱신
        self.lazy[node] += val                  # 메모 누적

    def range_update(self, node, s, e, l, r, val):
        """구간 [l, r]에 val 더하기"""
        if r < s or e < l: return
        if l <= s and e <= r:
            self._apply(node, s, e, val); return
        self._push_down(node, s, e)
        mid = (s + e) // 2
        self.range_update(2*node, s, mid, l, r, val)
        self.range_update(2*node+1, mid+1, e, l, r, val)
        self.tree[node] = self.tree[2*node] + self.tree[2*node+1]

    def query(self, node, s, e, l, r):
        if r < s or e < l: return 0
        if l <= s and e <= r: return self.tree[node]
        self._push_down(node, s, e)
        mid = (s + e) // 2
        return (self.query(2*node, s, mid, l, r) +
                self.query(2*node+1, mid+1, e, l, r))
```

## 2. Lazy의 동작 원리

```
[구간 [0,5]에 +3] 후 [구간 [2,4] 쿼리]:

  Step 1: range_update([0,5], +3)
  노드(0..5): tree += 3*6 = 18, lazy = 3
  자식에게 전파 안 함! (lazy에 메모)

  Step 2: query([2,4])
  노드(0..5): 부분 겹침 → push_down
    노드(0..2): tree += 3*3 = 9, lazy = 3
    노드(3..5): tree += 3*3 = 9, lazy = 3
  노드(0..2): 부분 겹침 → push_down
    노드(0..1): tree += 3*2 = 6, lazy = 3
    노드(2..2): tree += 3*1 = 3, lazy = 3
  노드(2): 완전 포함 → 반환
  노드(3..5): 부분 겹침 → push_down
    ...
  결과: arr[2]+3 + arr[3]+3 + arr[4]+3
```

| 연산 | 기본 Seg | Lazy Seg |
|------|---------|----------|
| 포인트 업데이트 | $O(\log N)$ | $O(\log N)$ |
| 구간 업데이트 | $O(N \log N)$ | $O(\log N)$ |
| 구간 쿼리 | $O(\log N)$ | $O(\log N)$ |

## 3. 복합 Lazy 연산

```
구간 대입 + 구간 합 쿼리:

  "구간 [l,r]을 모두 val로 바꿔라"

  lazy에 대입 값 저장, apply 시:
  tree[node] = val * (e - s + 1)
  lazy[node] = val  (0이 유효값이면 별도 flag 필요)


구간 덧셈 + 구간 곱셈 복합:

  lazy = (multiply, add)
  apply: tree = tree * multiply + add * size
  push_down 순서: 곱하기 먼저, 더하기 나중

  child.mul = parent.mul * child.mul
  child.add = parent.mul * child.add + parent.add
```

> **핵심 직관**: 복합 Lazy에서 가장 중요한 것은 **lazy 합성 순서**입니다. "새 lazy를 기존 lazy 위에 적용"할 때 교환 법칙이 성립하지 않으면 순서를 정확히 지켜야 합니다.

## 4. Persistent Segment Tree

```
Persistent (영속) 세그먼트 트리:

  업데이트 시 기존 트리를 보존하고 새 버전 생성
  → 모든 과거 버전에 쿼리 가능 (Time Travel)

  핵심: 변경된 경로만 새 노드 생성 (Path Copying)

  Version 0:        Version 1 (arr[2] = 10):
      [A]               [A']
     /   \              /    \
   [B]   [C]         [B]    [C']  ← C만 새로 생성
   / \   / \         / \    / \
  0   1 2   3       0   1 [10] 3  ← 리프도 새로

  새 노드: O(log N)개 (경로 길이)
  공간: O(N + Q log N)  (Q: 업데이트 횟수)

  응용:
  - K번째 작은 수 (온라인 쿼리)
  - 구간 내 K번째 수
  - 버전 관리가 필요한 자료구조
```

## 5. Merge Sort Tree

```
Merge Sort Tree:

  각 노드가 해당 구간의 정렬된 배열을 저장

            [1,2,3,4,5,6]          ← 전체 정렬
           /              \
      [1,2,5]          [3,4,6]     ← 왼/오 정렬
      /     \          /     \
    [2,5]  [1]      [4,3]  [6]
    /  \           /  \
   [2] [5]       [4] [3]

  쿼리: "구간 [l,r]에서 K보다 작은 수의 개수"
  → 해당 구간에 대응하는 O(log N)개 노드에서
    이분 탐색으로 K 미만 개수 합산
  → O(log² N)

  공간: O(N log N) (각 원소가 log N개 노드에 등장)
```

> **핵심 직관**: Persistent Segment Tree는 **공간을 시간으로 교환**하는 기법입니다. 전체를 복사하면 $O(N)$이지만, 변경 경로만 복사하면 $O(\log N)$입니다. 이 아이디어는 함수형 프로그래밍의 영속 자료구조(ads-09)와 같은 원리입니다.

## 6. 2D 세그먼트 트리

```
2D 구간 합 쿼리:

  방법 1: 세그먼트 트리의 세그먼트 트리
  - 외부 트리: 행 방향 세그먼트 트리
  - 각 노드: 열 방향 세그먼트 트리
  - 쿼리: O(log²N), 업데이트: O(log²N)
  - 공간: O(N²) 또는 O(N² log²N)

  방법 2: 2D BIT (Fenwick Tree)
  - 더 간단한 구현, 같은 복잡도
  - 구간 합에 한정

  방법 3: CDQ 분할 정복
  - 오프라인 쿼리 + 분할 정복
  - 공간 효율적
```

Lazy Propagation은 ga-07의 트리 DP에서 서브트리 업데이트에, Persistent Segment Tree는 ad-02의 DP 최적화에 활용됩니다.

## 핵심 정리

- **Lazy Propagation**은 구간 업데이트를 $O(\log N)$으로 처리하며, 핵심은 "필요할 때까지 전파를 미루는 것"입니다
- push_down에서 **lazy 합성 순서**가 정확해야 하며, 복합 연산(곱+합)은 특히 주의가 필요합니다
- **Persistent Segment Tree**는 변경 경로만 복사하여 $O(\log N)$ 공간으로 새 버전을 만듭니다
- **Merge Sort Tree**는 각 노드에 정렬 배열을 저장하여 구간 내 순위 쿼리를 $O(\log^2 N)$에 처리합니다
- 2D 구간 문제는 **세그먼트 트리의 세그먼트 트리** 또는 **2D BIT**로 해결합니다

# Union-Find와 DSU

## 왜 Union-Find가 중요한가

"두 원소가 같은 집합에 속하는가?"를 반복적으로 판단해야 하는 문제는 놀랍도록 자주 등장합니다. 네트워크 연결 확인, 크루스칼 MST(ga-03), 이미지 연결 요소, 동적 연결성 문제 모두 **Union-Find(Disjoint Set Union, DSU)**로 거의 상수 시간에 해결됩니다.

> **핵심 직관**: Union-Find의 핵심은 "각 집합을 트리로 표현하고, 루트가 같으면 같은 집합"입니다. 경로 압축과 랭크 합치기를 결합하면 연산당 $O(\alpha(N)) \approx O(1)$이 됩니다.

## 1. 기본 구조

```
Union-Find 동작:

  초기: 각 원소가 자기 자신이 루트
  [0] [1] [2] [3] [4]

  Union(0, 1): 1의 부모를 0으로
  [0←1] [2] [3] [4]

  Union(2, 3): 3의 부모를 2로
  [0←1] [2←3] [4]

  Union(0, 2): 2의 루트를 0의 루트에 연결
  [0←1, 0←2←3] [4]

  Find(3): 3→2→0 (루트)
  Find(1): 1→0 (루트)
  → 같은 루트 → 같은 집합!
```

```python
class UnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # 경로 압축
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        # 랭크 기반 합치기
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        return True
```

## 2. 최적화 기법

```
경로 압축 (Path Compression):

  Find(5): 5→3→1→0

  압축 전:     압축 후:
  0             0
  |           / | \
  1          1  3  5
  |
  3
  |
  5

  다음 Find(5): 5→0 (즉시!)


랭크 기반 합치기 (Union by Rank):

  항상 작은 트리를 큰 트리 아래에 연결
  → 트리 높이 = O(log N) 보장

  두 최적화 결합:
  → 연산당 O(α(N)) ≈ 실질적 O(1)
  α = 역 Ackermann 함수, 실질적으로 상수 (≤ 4)
```

| 최적화 | Find 복잡도 | 설명 |
|--------|-----------|------|
| 없음 | $O(N)$ | 체인 형태 가능 |
| 경로 압축만 | 상각 $O(\log N)$ | 반복 접근 시 빨라짐 |
| 랭크만 | $O(\log N)$ | 트리 높이 제한 |
| 둘 다 | $O(\alpha(N))$ | 사실상 상수 |

> **핵심 직관**: 역 Ackermann 함수 $\alpha(N)$은 우주의 원자 수($\approx 10^{80}$)에 대해서도 4 이하입니다. 실무에서 Union-Find는 **상수 시간**으로 취급해도 됩니다.

## 3. 크기 기반 합치기와 추가 정보

```python
class WeightedUnionFind:
    def __init__(self, n):
        self.parent = list(range(n))
        self.size = [1] * n  # 각 집합의 크기

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry: return False
        if self.size[rx] < self.size[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        self.size[rx] += self.size[ry]
        return True

    def get_size(self, x):
        return self.size[self.find(x)]
```

## 4. 응용: 크루스칼 MST

```python
def kruskal(n, edges):
    """edges: [(weight, u, v), ...]"""
    edges.sort()  # 가중치 순 정렬
    uf = UnionFind(n)
    mst = []
    for w, u, v in edges:
        if uf.union(u, v):  # 사이클 아니면 추가
            mst.append((w, u, v))
            if len(mst) == n - 1:
                break
    return mst
```

```
크루스칼에서 Union-Find 역할:

  간선을 가중치 순으로 처리
  각 간선 (u, v)에 대해:
  - Find(u) == Find(v) → 사이클! 건너뜀
  - Find(u) != Find(v) → MST에 추가, Union(u, v)

  → N-1개 간선 선택하면 MST 완성
  → 정렬 O(E log E) + Union-Find O(E·α(N)) ≈ O(E log E)
```

## 5. 고급 변형

```
가중치 Union-Find:

  "x와 y의 관계(차이)를 관리"
  예: x - y = w 형태의 관계

  포텐셜 배열 추가:
  dist[x] = x에서 루트까지의 가중치 합

  Find 시 경로 압축과 함께 dist 갱신
  Union(x, y, w): "x - y = w"를 저장


롤백 가능 Union-Find:

  Union을 되돌리기 (경로 압축 사용 불가)
  → 랭크 기반 합치기만 사용
  → 스택에 이전 상태 저장
  → 오프라인 분할 정복 문제에 사용
```

> **핵심 직관**: Union-Find에 경로 압축을 사용하면 **되돌리기(rollback)가 불가능**합니다. 롤백이 필요한 문제에서는 랭크 합치기만 사용하고, 스택으로 이전 상태를 저장합니다. 이 경우 연산당 $O(\log N)$입니다.

## 6. 실전 문제 유형

```
유형 1: 연결 요소 관련
  "그래프에서 연결 요소의 수/크기" → 기본 Union-Find

유형 2: 동적 연결성
  "간선 추가 후 연결 여부 쿼리" → Union-Find

유형 3: 크루스칼 MST
  "최소 신장 트리" → 정렬 + Union-Find (ga-03)

유형 4: 등가 관계
  "a=b, b=c이면 a=c인가?" → Union으로 같은 집합

유형 5: 오프라인 쿼리
  "간선 삭제 쿼리" → 역순으로 간선 추가 + Union-Find
```

Union-Find는 ga-03의 크루스칼 MST, ga-01의 연결 요소 판별, ad-05의 백트래킹 최적화에서 핵심적으로 사용됩니다.

## 핵심 정리

- **Union-Find**는 "같은 집합인가?" 질문을 경로 압축 + 랭크 합치기로 $O(\alpha(N)) \approx O(1)$에 답합니다
- **경로 압축**은 Find 시 모든 노드를 루트에 직접 연결하고, **랭크 합치기**는 작은 트리를 큰 트리에 연결합니다
- **크루스칼 MST**는 간선을 정렬 후 Union-Find로 사이클을 판별하여 $O(E \log E)$에 동작합니다
- **가중치 Union-Find**는 원소 간 관계(차이)를 추적하며, 포텐셜 배열로 구현합니다
- 롤백이 필요하면 경로 압축을 포기하고 **랭크 합치기만 + 스택**으로 이전 상태를 저장합니다

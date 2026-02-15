# 스킵 리스트와 Self-Balancing

## 왜 확률적 밸런싱이 중요한가

AVL, Red-Black Tree는 **결정론적** 회전으로 균형을 유지합니다. 하지만 구현이 복잡합니다. **스킵 리스트**는 동전 던지기(확률)로 균형을 유지하여, BST와 같은 $O(\log N)$ 성능을 **훨씬 간단한 구현**으로 달성합니다. Redis의 Sorted Set이 대표적 사용례입니다.

> **핵심 직관**: 스킵 리스트의 핵심 아이디어는 "연결 리스트에 고속도로를 추가하는 것"입니다. 레벨이 높을수록 노드 간격이 넓어져, 검색 시 먼 거리를 빠르게 건너뛸 수 있습니다.

## 1. 스킵 리스트 구조

```
Skip List (4레벨):

  Level 3: HEAD ─────────────────────────── 50 ──→ NIL
  Level 2: HEAD ────── 20 ──────────────── 50 ──→ NIL
  Level 1: HEAD ────── 20 ────── 35 ────── 50 ──→ NIL
  Level 0: HEAD → 10 → 20 → 25 → 35 → 42 → 50 → NIL

  검색 (42):
  L3: HEAD → 50 (너무 큼, 아래로)
  L2: HEAD → 20 → 50 (너무 큼, 아래로)
  L1: HEAD → 20 → 35 → 50 (너무 큼, 아래로)
  L0: 35 → 42 ✓ 찾음!

  → 상위 레벨에서 대략적 위치 찾고, 하위에서 정밀 검색
```

```python
import random

class SkipNode:
    def __init__(self, key, level):
        self.key = key
        self.forward = [None] * (level + 1)

class SkipList:
    def __init__(self, max_level=16, p=0.5):
        self.max_level = max_level
        self.p = p
        self.header = SkipNode(-float('inf'), max_level)
        self.level = 0

    def _random_level(self):
        lvl = 0
        while random.random() < self.p and lvl < self.max_level:
            lvl += 1
        return lvl  # 기대값: 1/(1-p) = 2 (p=0.5)

    def search(self, key):
        current = self.header
        for i in range(self.level, -1, -1):
            while current.forward[i] and current.forward[i].key < key:
                current = current.forward[i]
        current = current.forward[0]
        return current and current.key == key
```

| 연산 | 기대 시간 | 최악 시간 |
|------|----------|----------|
| Search | $O(\log N)$ | $O(N)$ |
| Insert | $O(\log N)$ | $O(N)$ |
| Delete | $O(\log N)$ | $O(N)$ |
| 공간 | $O(N)$ 기대 | $O(N \log N)$ |

> **핵심 직관**: 스킵 리스트의 최악 경우 $O(N)$은 "모든 동전이 앞면"인 경우로, 확률적으로 거의 불가능합니다. 기대 복잡도가 $O(\log N)$이며, **구현이 Red-Black Tree보다 훨씬 단순**합니다.

## 2. Treap

```
Treap = Tree + Heap

  각 노드에 (key, priority) 저장
  - key 기준: BST 성질 (왼쪽 < 루트 < 오른쪽)
  - priority 기준: Heap 성질 (부모 > 자식)
  - priority는 랜덤 → 기대 높이 O(log N)

  예: (key, priority)
        (30, 90)            ← max priority가 루트
       /        \
    (10, 70)   (50, 80)
      \         /
   (20, 50) (40, 60)

  삽입: BST 삽입 후 priority 기준으로 회전
  삭제: 삭제 노드를 리프까지 회전으로 내린 후 제거

  장점: 회전만으로 간단히 구현, split/merge 용이
  적합: 암묵적 키 Treap (배열 인덱스 기반, 구간 연산)
```

## 3. Splay Tree

```
Splay Tree:

  최근 접근한 원소를 루트로 올리는 자기 조정 BST

  핵심 연산: Splay(x) = x를 루트로 올림
  → 자주 접근하는 원소가 항상 위쪽에 위치

  Splay 회전 패턴:
  Zig: x가 루트의 자식 → 단일 회전
  Zig-Zig: x, 부모, 조부모가 같은 방향 → 조부모 먼저 회전
  Zig-Zag: x, 부모, 조부모가 다른 방향 → x를 2번 회전

  상각 복잡도: O(log N) per operation
  최악 단일 연산: O(N), 하지만 M번 연산의 총합 O(M log N)

  장점: 캐시 친화적 접근 패턴에 최적
  단점: 단일 연산 최악이 O(N), 멀티스레드 부적합
```

## 4. 비교와 선택

| 자료구조 | 보장 | 구현 난이도 | 동시성 | 사용 |
|---------|------|-----------|--------|------|
| Red-Black | 최악 $O(\log N)$ | 높음 | 가능 | Java TreeMap |
| AVL | 최악 $O(\log N)$ | 중간 | 가능 | 높이 최적화 |
| Skip List | 기대 $O(\log N)$ | 낮음 | 쉬움 | Redis Sorted Set |
| Treap | 기대 $O(\log N)$ | 낮음 | 가능 | 경시 프로그래밍 |
| Splay | 상각 $O(\log N)$ | 중간 | 어려움 | 캐시 워크로드 |

> **핵심 직관**: **동시성(concurrency)**이 필요하면 스킵 리스트가 최적입니다. 락 없는(lock-free) 구현이 가능하기 때문입니다. 이것이 Redis, LevelDB 등이 스킵 리스트를 선택한 이유입니다.

## 5. 스킵 리스트의 동시성

```
ConcurrentSkipListMap (Java):

  레벨별 독립적 CAS(Compare-And-Swap) 연산
  → 전역 락 없이 동시 삽입/삭제/검색

  Red-Black Tree의 회전은 여러 노드를 동시에 수정
  → 락 범위가 넓음

  Skip List는 로컬 포인터만 수정
  → CAS로 원자적 업데이트 가능
  → 높은 동시성
```

## 6. 실전 응용

```
Redis Sorted Set (ZSET):

  스킵 리스트 + 해시 테이블 결합
  - 스킵 리스트: 점수 기반 범위 쿼리 O(log N)
  - 해시 테이블: 키 기반 O(1) 조회

  ZADD leaderboard 100 "player_a"
  ZRANGEBYSCORE leaderboard 90 100  → 스킵 리스트 범위 검색
  ZSCORE leaderboard "player_a"     → 해시 테이블 O(1)
```

스킵 리스트는 dbi-03의 LSM 트리 Memtable에서 사용되며, Treap은 ad-02의 DP 최적화에서 구간 연산에 활용됩니다.

## 핵심 정리

- **스킵 리스트**는 확률적 레벨로 $O(\log N)$ 기대 성능을 달성하며, 구현이 간단하고 동시성에 유리합니다
- **Treap**는 BST + Heap 성질을 랜덤 우선순위로 결합하여, split/merge 기반 구간 연산에 적합합니다
- **Splay Tree**는 최근 접근 원소를 루트로 올려 캐시 지역성에 최적화되며, 상각 $O(\log N)$을 보장합니다
- **동시성이 필요하면 스킵 리스트**, 결정론적 보장이 필요하면 Red-Black Tree를 선택합니다
- Redis Sorted Set은 **스킵 리스트 + 해시 테이블**의 조합으로 범위 쿼리와 포인트 조회를 모두 최적화합니다

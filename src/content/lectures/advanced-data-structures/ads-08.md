# 힙과 우선순위 큐 변형

## 왜 힙 변형을 알아야 하는가

이진 힙은 삽입/삭제가 $O(\log N)$이지만, **Decrease-Key가 $O(\log N)$**입니다. Dijkstra(ga-02)에서 Decrease-Key가 $O(E)$번 호출되므로, 이 연산을 $O(1)$로 줄이면 전체 복잡도가 개선됩니다. Fibonacci Heap은 상각 $O(1)$ Decrease-Key를 제공하여 이론적 최적 Dijkstra를 가능하게 합니다.

> **핵심 직관**: 힙의 변형들은 모두 "특정 연산의 복잡도를 낮추기 위해 구조적 유연성을 추가한 것"입니다. 이진 힙은 단순하지만 경직되어 있고, Fibonacci Heap은 복잡하지만 유연합니다.

## 1. 이진 힙 복습

```
Min-Heap:
      1
    /   \
   3     2
  / \   /
 7   4 5

  배열 표현: [1, 3, 2, 7, 4, 5]
  parent(i) = (i-1)//2
  left(i)   = 2i + 1
  right(i)  = 2i + 2
```

| 연산 | 이진 힙 | 목표 |
|------|--------|------|
| Insert | $O(\log N)$ | - |
| Extract-Min | $O(\log N)$ | - |
| Decrease-Key | $O(\log N)$ | $O(1)$ |
| Merge | $O(N)$ | $O(1)$ |

## 2. Binomial Heap

```
Binomial Tree B_k:
  B_0: 단일 노드
  B_k: B_{k-1} 두 개를 합침 (한쪽 루트를 다른 쪽 자식으로)

  B_0: *    B_1: *     B_2:  *      B_3:    *
                |           / |          / | \
                *          *  *        *   *  *
                           |          / |  |
                           *         *  *  *
                                     |
                                     *

  B_k의 노드 수: 2^k

Binomial Heap:
  Binomial Tree들의 집합 (각 차수 최대 1개)
  → N = 13 = 1101₂ → B_3, B_2, B_0

  Merge: 이진수 덧셈과 동일! O(log N)
  Insert: 단일 노드와 Merge → O(log N)
  Extract-Min: 최소 루트 제거 → 자식들과 Merge → O(log N)
```

## 3. Fibonacci Heap

```
Fibonacci Heap:

  Binomial Heap을 "게으르게" 만든 것
  → 작업을 최대한 미루어 상각 비용 절감

  구조: 루트 리스트 (원형 이중 연결 리스트)
  min 포인터: 최소 루트를 가리킴

  핵심 연산:
  ├─ Insert: 루트 리스트에 추가 → O(1)
  ├─ Merge: 두 루트 리스트 연결 → O(1)
  ├─ Decrease-Key: 노드를 잘라서 루트로 → O(1) 상각
  └─ Extract-Min: 최소 제거 + 합병 정리 → O(log N) 상각

  Decrease-Key의 핵심 (Cascading Cut):
  1. 노드 x의 키 감소
  2. 부모보다 작아졌으면 x를 잘라서 루트로 이동
  3. 부모가 이미 자식을 잃은 적 있으면 부모도 잘라냄 (연쇄)
  → 이 "게으름 + 연쇄 절단"이 O(1) 상각의 핵심
```

| 연산 | 이진 힙 | Binomial | Fibonacci |
|------|--------|----------|-----------|
| Insert | $O(\log N)$ | $O(\log N)$ | $O(1)$ |
| Extract-Min | $O(\log N)$ | $O(\log N)$ | $O(\log N)$ 상각 |
| Decrease-Key | $O(\log N)$ | $O(\log N)$ | $O(1)$ 상각 |
| Merge | $O(N)$ | $O(\log N)$ | $O(1)$ |

> **핵심 직관**: Fibonacci Heap이 Dijkstra를 $O(V \log V + E)$로 만드는 이유는, Decrease-Key가 $O(1)$이므로 $E$번의 Decrease-Key가 $O(E)$, $V$번의 Extract-Min이 $O(V \log V)$가 되기 때문입니다.

## 4. Pairing Heap

```
Pairing Heap:

  Fibonacci Heap의 "실용적 대안"
  이론: 상각 복잡도 일부 미증명
  실전: Fibonacci보다 빠름 (상수 인자 작음)

  구조: 다진 트리, 힙 성질 유지
  삽입: 두 트리 합침 → O(1)
  Decrease-Key: 잘라서 합침 → O(1) 상각 (추정)
  Extract-Min: 루트 제거 → 자식들을 쌍으로 합침 → O(log N) 상각

  "쌍으로 합침" (Pairing):
  자식: [c1, c2, c3, c4, c5]
  Step 1: (c1,c2)→합, (c3,c4)→합, c5
  Step 2: 오른쪽부터 역순 합
  → 균형 잡힌 결과
```

## 5. 실전 선택 가이드

```
언제 무엇을 사용하는가:

  대부분의 경우: 이진 힙
  └─ 단순, 캐시 친화적, 충분히 빠름
     Python: heapq (배열 기반 이진 힙)

  Dijkstra 이론적 최적: Fibonacci Heap
  └─ 실무에서는 이진 힙 + lazy deletion이 더 빠름
     (상수 인자가 크고 캐시 비친화적)

  Merge가 잦은 경우: Binomial 또는 Pairing Heap
  └─ 두 우선순위 큐를 자주 합쳐야 할 때

  실무 Dijkstra:
  heapq + visited 체크 (lazy deletion)
  → Decrease-Key 대신 중복 삽입 + 방문 체크
```

> **핵심 직관**: Fibonacci Heap은 **이론적으로 최적**이지만, 실무에서는 이진 힙이 더 빠른 경우가 많습니다. 포인터 기반 구조의 캐시 미스가 $O(1)$ 상각의 이점을 상쇄하기 때문입니다. 실무 Dijkstra는 거의 항상 **이진 힙 + lazy deletion**을 사용합니다.

## 6. Indexed Priority Queue

```
Indexed Priority Queue:
  "어떤 키의 우선순위를 변경" → O(log N)

  이진 힙 + 인덱스 매핑 테이블

  pos[key] = 힙 내 위치
  → Decrease-Key 시 pos[key]에서 바로 접근

  Dijkstra에서:
  dist[v] 갱신 시 → pq.decrease_key(v, new_dist)
  → pos[v]에서 위치 찾고 → bubble up

  Python에서는 heapq가 지원 안 함
  → lazy deletion 또는 직접 구현
```

힙 변형은 ga-02의 Dijkstra, ga-03의 Prim MST에서 핵심적이며, ad-04의 Huffman 코딩에서도 사용됩니다.

## 핵심 정리

- **이진 힙**은 단순하고 캐시 친화적이며, 대부분의 실무 상황에서 최적 선택입니다
- **Fibonacci Heap**은 Decrease-Key $O(1)$ 상각으로 이론적 최적 Dijkstra($O(V \log V + E)$)를 가능하게 합니다
- **Pairing Heap**은 Fibonacci의 실용적 대안으로, 상수 인자가 작아 실전에서 더 빠릅니다
- 실무 Dijkstra는 **이진 힙 + lazy deletion**이 가장 흔하며, Fibonacci Heap보다 빠른 경우가 많습니다
- **Merge**가 핵심 연산이면 Binomial/Fibonacci/Pairing Heap을, 그 외에는 이진 힙을 선택합니다

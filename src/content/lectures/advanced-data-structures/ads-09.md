# 영속 자료구조

## 왜 영속 자료구조가 중요한가

일반 자료구조는 업데이트하면 이전 상태가 사라집니다. **영속(Persistent) 자료구조**는 모든 과거 버전을 보존하면서 업데이트할 수 있습니다. ads-02의 Persistent Segment Tree가 대표적이며, 함수형 프로그래밍, 데이터베이스 MVCC(dbi-06), Git의 버전 관리가 모두 같은 원리입니다.

> **핵심 직관**: 영속 자료구조의 핵심 기법은 **Path Copying**입니다. 변경된 노드부터 루트까지의 경로만 새로 만들고, 나머지는 이전 버전과 공유합니다. 트리 높이가 $O(\log N)$이면 버전당 $O(\log N)$ 추가 공간만 필요합니다.

## 1. 영속성의 종류

```
Ephemeral (일시적):
  v0: [1, 2, 3]
  update(idx=1, val=5)
  v0: [1, 5, 3]  ← v0이 변경됨, 과거 없음

Partially Persistent (부분 영속):
  v0: [1, 2, 3]
  v1 = update(v0, idx=1, val=5)
  v0: [1, 2, 3]  ← 읽기 가능
  v1: [1, 5, 3]  ← 최신 버전만 수정 가능

Fully Persistent (완전 영속):
  v0: [1, 2, 3]
  v1 = update(v0, idx=1, val=5)  → [1, 5, 3]
  v2 = update(v0, idx=2, val=7)  → [1, 2, 7]  ← v0에서 분기!
  → v0, v1, v2 모두 읽기/수정 가능

Confluently Persistent (합류 영속):
  두 버전을 합칠 수 있음 (가장 어려움)
```

## 2. Path Copying

```
Persistent BST (Path Copying):

  v0:        5
           /   \
          3     8
         / \
        1   4

  v1 = insert(v0, 6):

  v0:        5              v1:      5'
           /   \                   /   \
          3     8                3     8'    ← 경로만 새로
         / \                   / \   /
        1   4                1   4  6

  공유: 노드 1, 3, 4 (변경 안 된 부분)
  새로: 5', 8', 6 (변경 경로 + 새 노드)

  공간: 버전당 O(log N) (트리 높이)
  시간: 업데이트 O(log N), 쿼리 O(log N)
```

## 3. Persistent Array

```
Persistent Array:

  배열을 이진 트리로 표현 → Path Copying 적용

       [1,2,3,4] → 트리로:
            *
          /   \
         *     *
        / \   / \
       1   2 3   4

  update(idx=2, val=7):
  인덱스 2 → 오른쪽 → 왼쪽 경로만 복사

  v0:     *           v1:     *'
        /   \               /   \
       *     *             *     *'
      / \   / \           / \   / \
     1   2 3   4         1   2 7   4

  시간: O(log N) per operation
  공간: O(log N) per version
```

## 4. Fat Node 기법

```
Fat Node:

  각 노드에 모든 버전의 값을 저장

  노드: {
    versions: [(t=0, val=3), (t=2, val=5), (t=5, val=1)]
  }

  쿼리(version=3): 이분 탐색 → t=2의 val=5 반환

  장점: 구현 단순, 포인터 복사 불필요
  단점: 노드 크기 증가, 쿼리 O(log V) 추가 (V=버전 수)
  적합: 업데이트가 적고 쿼리가 많을 때
```

| 기법 | 업데이트 | 쿼리 | 공간/버전 |
|------|---------|------|----------|
| Path Copying | $O(\log N)$ | $O(\log N)$ | $O(\log N)$ |
| Fat Node | $O(1)$ | $O(\log N + \log V)$ | $O(1)$ |
| 결합 | $O(\log N)$ | $O(\log N)$ | $O(\log N)$ |

> **핵심 직관**: Path Copying이 영속 자료구조의 표준 기법인 이유는, **함수형 프로그래밍의 불변성(immutability)**과 자연스럽게 결합하기 때문입니다. Haskell, Clojure의 모든 자료구조가 이 원리로 동작합니다.

## 5. 함수형 자료구조와의 연결

```
함수형 프로그래밍에서:

  Haskell/Clojure의 "불변 자료구조"
  = 영속 자료구조의 완전 영속 버전

  업데이트 = 새 버전 생성 (이전 버전 유지)
  → 자연스러운 동시성 (락 불필요)
  → 디버깅 용이 (상태 추적)
  → GC가 참조 없는 버전 자동 정리

  실무 예:
  ├─ Clojure PersistentVector: 32진 트리, Path Copying
  │   → 업데이트 O(log₃₂ N) ≈ O(1) 실질적
  ├─ Immutable.js: JavaScript 영속 컬렉션
  └─ Scala: 기본 컬렉션이 영속적
```

## 6. 실전 응용

```
응용 1: Git
  커밋 = 파일 트리의 영속 버전
  변경 파일만 새 blob, 나머지는 이전 트리 공유
  → Path Copying과 정확히 같은 원리

응용 2: MVCC (dbi-06)
  트랜잭션마다 데이터의 다른 버전을 봄
  → 인덱스의 영속적 스냅샷

응용 3: 온라인 K번째 수
  배열을 하나씩 추가하며 Persistent Seg Tree 구축
  → 구간 [l, r]의 K번째 수 = version[r] - version[l-1]

응용 4: Undo/Redo
  각 상태를 영속 자료구조로 관리
  Undo = 이전 버전으로 전환
  → O(1) Undo (이전 루트 포인터 사용)
```

> **핵심 직관**: 영속 자료구조가 실무에서 빛나는 순간은 **"상태의 스냅샷이 필요할 때"**입니다. Git, MVCC, Undo/Redo, 함수형 프로그래밍 모두 같은 원리이며, Path Copying이 그 기반입니다.

## 핵심 정리

- **영속 자료구조**는 업데이트 시 이전 버전을 보존하며, 부분/완전/합류 영속성으로 구분됩니다
- **Path Copying**은 변경 경로만 새로 만들어 버전당 $O(\log N)$ 공간으로 새 버전을 생성합니다
- **Fat Node**는 노드에 모든 버전의 값을 저장하는 대안으로, 구현은 단순하지만 쿼리에 $O(\log V)$ 추가 비용이 있습니다
- 함수형 프로그래밍의 **불변 자료구조**는 영속 자료구조와 동일한 원리이며, 동시성과 디버깅에 유리합니다
- Git, MVCC, Undo/Redo 모두 **영속 자료구조의 실용적 응용**이며, Path Copying이 핵심 기법입니다

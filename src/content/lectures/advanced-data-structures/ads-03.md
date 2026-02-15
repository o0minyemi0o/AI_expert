# 트라이와 변형

## 왜 트라이가 중요한가

문자열 검색에서 해시 테이블은 정확한 매칭만 가능합니다. "auto"로 시작하는 모든 단어를 찾으려면? **트라이(Trie)**는 접두사 기반 검색에 최적화된 트리 자료구조로, 자동 완성, 사전 검색, IP 라우팅, XOR 최댓값 등 다양한 문제에 핵심적으로 사용됩니다.

> **핵심 직관**: 트라이는 "공통 접두사를 공유하는 트리"입니다. "apple"과 "application"은 "appl"까지 같은 경로를 사용합니다. 이 공유가 공간 절약과 접두사 검색 효율의 핵심입니다.

## 1. 기본 트라이 구조

```
"cat", "car", "card", "dog" 삽입:

  (root)
  ├── c
  │   └── a
  │       ├── t*       ← "cat" 끝
  │       └── r*       ← "car" 끝
  │           └── d*   ← "card" 끝
  └── d
      └── o
          └── g*       ← "dog" 끝

  * = 단어 끝 표시 (is_end)
```

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        node = self.root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.is_end = True

    def search(self, word):
        node = self._find(word)
        return node is not None and node.is_end

    def starts_with(self, prefix):
        return self._find(prefix) is not None

    def _find(self, s):
        node = self.root
        for ch in s:
            if ch not in node.children:
                return None
            node = node.children[ch]
        return node
```

| 연산 | 시간 | 설명 |
|------|------|------|
| Insert | $O(L)$ | L = 문자열 길이 |
| Search | $O(L)$ | 정확한 매칭 |
| Prefix | $O(P)$ | P = 접두사 길이 |
| 공간 | $O(\Sigma \cdot N)$ | $\Sigma$ = 알파벳 크기, N = 전체 문자 수 |

## 2. 압축 트라이 (Radix Tree)

```
일반 트라이 문제: 분기 없는 긴 경로 → 메모리 낭비

  일반 트라이 ("romane", "romanus", "romulus"):
  r → o → m → a → n → e*
                  └→ u → s*
            └→ u → l → u → s*

  압축 트라이 (Radix Tree):
  rom → an → e*
        │  → us*
        └→ ulus*

  간선에 문자열을 저장하여 분기 없는 경로를 압축
  → 노드 수 = 키 수의 2배 이하
  → Linux 커널 라우팅 테이블에 사용
```

## 3. Ternary Search Tree

```
Ternary Search Tree (TST):

  각 노드에 3개 자식: left(작음), mid(같음), right(큼)

  "cat", "car", "cup" 삽입:

       c
      /|\
       a
      /|\
     r* t*
         u
        /|\
         p*

  장점: 해시 테이블의 속도 + 트라이의 접두사 검색
  공간: 일반 트라이보다 훨씬 효율적 (포인터 3개/노드)
  적합: 사전 크기가 크고 알파벳이 넓을 때
```

> **핵심 직관**: TST는 "트라이와 BST의 하이브리드"입니다. 같은 위치의 문자를 BST로 비교하므로 알파벳 크기에 독립적이며, 불균형 시 회전으로 밸런싱도 가능합니다.

## 4. XOR 트라이

```
XOR 트라이:
  정수의 이진 표현을 트라이에 저장
  → "주어진 수와 XOR이 최대인 수" 쿼리를 O(32)에 처리

  문제: 배열에서 x XOR arr[i]가 최대인 i를 찾아라

  아이디어: XOR을 최대화하려면 상위 비트부터 다른 비트 선택

  x = 5 (101), 트라이에 [3(011), 6(110), 7(111)] 저장:

  비트 2 (MSB): x=1 → 0을 선택 (다른 쪽) → 3(011)과 매칭
  비트 1: x=0 → 1을 선택 → 3의 비트1=1 ✓
  비트 0: x=1 → 0을 선택 → 3의 비트0=1 ✗, 가능한 0 없음

  → 5 XOR 3 = 6, 5 XOR 6 = 3, 5 XOR 7 = 2
  → 최대: 5 XOR 3 = 6 ✓
```

```python
class XORTrie:
    def __init__(self):
        self.root = [None, None]  # [0-child, 1-child]

    def insert(self, num):
        node = self.root
        for i in range(30, -1, -1):  # 31비트
            bit = (num >> i) & 1
            if node[bit] is None:
                node[bit] = [None, None]
            node = node[bit]

    def max_xor(self, num):
        node = self.root
        result = 0
        for i in range(30, -1, -1):
            bit = (num >> i) & 1
            want = 1 - bit  # 반대 비트
            if node[want] is not None:
                result |= (1 << i)
                node = node[want]
            else:
                node = node[bit]
        return result
```

## 5. 자동 완성 구현

```python
class AutoComplete(Trie):
    def suggest(self, prefix, limit=5):
        node = self._find(prefix)
        if not node:
            return []
        results = []
        self._dfs(node, prefix, results, limit)
        return results

    def _dfs(self, node, current, results, limit):
        if len(results) >= limit:
            return
        if node.is_end:
            results.append(current)
        for ch in sorted(node.children):
            self._dfs(node.children[ch], current + ch, results, limit)
```

```
자동 완성에서의 트라이 최적화:

  1. 빈도수 저장: 노드에 count → 인기 단어 우선
  2. 가지치기: 접두사 매칭 후 상위 K개만 반환
  3. 퍼지 매칭: 편집 거리 1 이내 단어도 제안
  4. 인메모리 캐시: 자주 검색되는 접두사 결과 캐싱
```

> **핵심 직관**: 실제 검색 엔진의 자동 완성은 트라이 + 빈도수 + 개인화의 조합입니다. 순수 트라이는 기본 골격이고, **빈도수 기반 정렬**이 사용자 경험의 핵심입니다.

## 6. 트라이 vs 해시 테이블

| 특성 | 트라이 | 해시 테이블 |
|------|--------|-----------|
| 정확 매칭 | $O(L)$ | $O(L)$ 평균 |
| 접두사 검색 | $O(P + K)$ | 불가능 |
| 정렬 순회 | 가능 | 불가능 |
| 공간 | 높음 | 낮음 |
| 최악 경우 | $O(L)$ 보장 | $O(N)$ 해시 충돌 |
| 캐시 효율 | 낮음 (포인터 추적) | 높음 (연속 메모리) |

트라이는 ad-06의 문자열 알고리즘(Aho-Corasick)에서 다중 패턴 매칭의 기반이 됩니다.

## 핵심 정리

- **트라이**는 공통 접두사를 공유하여 접두사 검색을 $O(P)$에 처리하는 트리 자료구조입니다
- **압축 트라이(Radix Tree)**는 분기 없는 경로를 하나의 간선으로 합쳐 공간을 크게 절약합니다
- **XOR 트라이**는 정수를 이진 표현으로 저장하여 "XOR 최대 쌍"을 $O(32)$에 찾습니다
- 자동 완성은 트라이 + **빈도수 정렬**이 핵심이며, 실무에서는 캐싱과 개인화가 추가됩니다
- 트라이는 접두사/정렬이 필요할 때, 해시 테이블은 정확 매칭만 필요할 때 선택합니다

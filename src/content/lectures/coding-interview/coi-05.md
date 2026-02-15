# 트리와 그래프 탐색

## 왜 트리와 그래프 탐색이 중요한가

트리와 그래프 문제는 코딩 인터뷰에서 가장 난이도 분포가 넓은 영역입니다. 기본적인 이진 트리 순회부터 위상 정렬, 최단 경로까지, 구조적 사고력과 재귀적 분해 능력을 동시에 검증합니다. graph-algorithms 과정에서 학습한 이론적 기반을 인터뷰 실전에 적용하는 것이 이 강의의 목표입니다.

> **핵심 직관**: 트리 문제의 90%는 "현재 노드에서 무엇을 하고, 자식에게 무엇을 위임하느냐"로 귀결됩니다. 이것이 재귀적 사고의 본질입니다.

## 1. DFS와 BFS 비교

| 특성 | DFS (깊이 우선) | BFS (너비 우선) |
|------|----------------|----------------|
| 자료구조 | 스택/재귀 | 큐 (deque) |
| 순회 방식 | 깊이 우선 탐색 | 레벨 순서 탐색 |
| 공간 복잡도 | O(h) 트리 높이 | O(w) 최대 너비 |
| 적합한 문제 | 경로 탐색, 백트래킹 | 최단 거리, 레벨 순회 |
| 그래프 적용 | 사이클 탐지, 연결 요소 | 최단 경로 (가중치 없음) |

```
DFS vs BFS 탐색 순서:

        1                DFS (전위): 1-2-4-5-3-6
       / \               BFS:        1-2-3-4-5-6
      2   3
     / \   \
    4   5   6
```

## 2. 이진 트리 순회 패턴

```python
# 이진 트리 노드 정의
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

# 재귀 DFS 순회 — O(n) 시간, O(h) 공간
def inorder(root: TreeNode) -> list[int]:
    if not root:
        return []
    return inorder(root.left) + [root.val] + inorder(root.right)

# 반복 DFS (중위 순회) — O(n) 시간, O(h) 공간
def inorder_iterative(root: TreeNode) -> list[int]:
    result, stack = [], []
    curr = root
    while curr or stack:
        while curr:
            stack.append(curr)
            curr = curr.left
        curr = stack.pop()
        result.append(curr.val)
        curr = curr.right
    return result
```

| 순회 | 순서 | 활용 |
|------|------|------|
| 전위(Preorder) | 루트→좌→우 | 트리 복사, 직렬화 |
| 중위(Inorder) | 좌→루트→우 | BST 정렬 순서 |
| 후위(Postorder) | 좌→우→루트 | 트리 삭제, 높이 계산 |

## 3. 트리 DFS 핵심 패턴

```python
# 트리 최대 깊이 — O(n) 시간, O(h) 공간
def max_depth(root: TreeNode) -> int:
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))

# 경로 합 존재 여부 — O(n) 시간, O(h) 공간
def has_path_sum(root: TreeNode, target: int) -> bool:
    if not root:
        return False
    if not root.left and not root.right:
        return root.val == target
    remaining = target - root.val
    return (has_path_sum(root.left, remaining) or
            has_path_sum(root.right, remaining))

# 최저 공통 조상 (LCA) — O(n) 시간, O(h) 공간
def lowest_common_ancestor(root: TreeNode, p: TreeNode, q: TreeNode) -> TreeNode:
    if not root or root == p or root == q:
        return root
    left = lowest_common_ancestor(root.left, p, q)
    right = lowest_common_ancestor(root.right, p, q)
    if left and right:
        return root
    return left or right
```

> **핵심 직관**: 트리 DFS에서는 "반환값이 무엇을 의미하는가"를 명확히 정의하는 것이 핵심입니다. LCA에서 반환값은 "이 서브트리에서 p 또는 q를 찾았는가"를 의미합니다.

## 4. 그래프 탐색

그래프는 인접 리스트로 표현하고, 방문 배열로 사이클을 방지합니다.

```python
from collections import defaultdict, deque

# 그래프 DFS (연결 요소 개수) — O(V+E) 시간
def count_components(n: int, edges: list[list[int]]) -> int:
    graph = defaultdict(list)
    for u, v in edges:
        graph[u].append(v)
        graph[v].append(u)

    visited = set()
    count = 0

    def dfs(node: int):
        visited.add(node)
        for neighbor in graph[node]:
            if neighbor not in visited:
                dfs(neighbor)

    for i in range(n):
        if i not in visited:
            dfs(i)
            count += 1
    return count
```

## 5. 위상 정렬 (Topological Sort)

위상 정렬은 DAG(유향 비순환 그래프)에서 선행 관계를 만족하는 순서를 구합니다. 과목 선수과목, 빌드 의존성 등의 문제에 적용됩니다.

```
위상 정렬 결정 흐름:

  "순서가 있는 관계"
       │
  ├── "사이클 가능?" ──Yes──→ 사이클 탐지 (DFS 색칠)
  │                    No
  │                     │
  └── BFS (Kahn)  or  DFS (후위 역순)
```

```python
# 위상 정렬 (Kahn's BFS) — O(V+E) 시간, O(V) 공간
def topological_sort(n: int, prerequisites: list[list[int]]) -> list[int]:
    graph = defaultdict(list)
    in_degree = [0] * n

    for course, prereq in prerequisites:
        graph[prereq].append(course)
        in_degree[course] += 1

    queue = deque([i for i in range(n) if in_degree[i] == 0])
    order = []

    while queue:
        node = queue.popleft()
        order.append(node)
        for neighbor in graph[node]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    return order if len(order) == n else []  # 빈 리스트 = 사이클 존재
```

## 6. 트라이 (Trie)

트라이는 문자열 집합의 접두사 검색에 특화된 트리 자료구조입니다.

```python
# Trie 구현 — 삽입/탐색 O(m), m=문자열 길이
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end = False

class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
        node.is_end = True

    def search(self, word: str) -> bool:
        node = self._find(word)
        return node is not None and node.is_end

    def starts_with(self, prefix: str) -> bool:
        return self._find(prefix) is not None

    def _find(self, prefix: str) -> TrieNode:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return None
            node = node.children[char]
        return node
```

## 7. 시나리오: 섬의 개수

**문제**: 2D 격자에서 '1'(땅)로 연결된 섬의 개수를 구하시오.

```python
# Number of Islands — O(m*n) 시간, O(m*n) 공간 (최악)
def num_islands(grid: list[list[str]]) -> int:
    if not grid:
        return 0

    rows, cols = len(grid), len(grid[0])
    count = 0

    def dfs(r: int, c: int):
        if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'  # 방문 표시
        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            dfs(r + dr, c + dc)

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                dfs(r, c)
                count += 1

    return count
```

> **핵심 직관**: 2D 격자 탐색 문제는 "각 셀이 노드, 인접 셀이 간선"인 그래프 문제로 변환됩니다. 이 관점 전환이 핵심입니다.

이 강의의 그래프 탐색 패턴은 graph-algorithms 과정에서 더 깊이 다루며, coi-06/coi-07의 트리 DP, coi-09의 백트래킹과도 밀접하게 연결됩니다.

## 핵심 정리

- **DFS**는 경로 탐색/백트래킹에, **BFS**는 최단 거리/레벨 순회에 적합하며, 문제 유형에 따라 선택합니다
- 이진 트리 문제는 **"현재 노드에서 할 일"과 "자식에게 위임할 일"**을 명확히 분리하여 재귀로 해결합니다
- **위상 정렬**은 선행 관계가 있는 순서 결정 문제의 표준 해법이며, Kahn's BFS로 구현합니다
- **트라이**는 접두사 검색에 O(m) 성능을 제공하며, 자동완성/사전 검색에 필수적입니다
- 2D 격자 문제는 **그래프로 변환**하여 DFS/BFS를 적용하는 관점 전환이 핵심입니다

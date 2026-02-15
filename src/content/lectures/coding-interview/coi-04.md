# 스택과 큐 응용

## 왜 스택과 큐 응용이 중요한가

스택과 큐는 단순한 자료구조처럼 보이지만, 코딩 인터뷰에서 **모노톤 스택**, **우선순위 큐**, **BFS 패턴** 등 고급 응용이 빈번하게 출제됩니다. 특히 "다음으로 큰 원소", "최소값 추적", "레벨 순회" 같은 문제는 스택과 큐 없이는 효율적으로 풀 수 없습니다.

> **핵심 직관**: 스택은 "최근 것부터 처리"해야 할 때, 큐는 "오래된 것부터 처리"해야 할 때 사용합니다. 이 LIFO/FIFO 특성이 문제 유형을 결정합니다.

## 1. 괄호 매칭 패턴

스택의 가장 기본적인 응용으로, 여는 괄호를 push하고 닫는 괄호를 만나면 pop하여 매칭합니다.

```python
# 유효한 괄호 검사 — O(n) 시간, O(n) 공간
def is_valid_parentheses(s: str) -> bool:
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in mapping:
            if not stack or stack[-1] != mapping[char]:
                return False
            stack.pop()
        else:
            stack.append(char)
    return len(stack) == 0
```

| 괄호 문제 유형 | 핵심 아이디어 | 복잡도 |
|--------------|-------------|--------|
| 유효성 검사 | 스택 매칭 | O(n) |
| 최소 제거 | 스택 + 인덱스 추적 | O(n) |
| 최장 유효 부분 | 스택 + DP (coi-06) | O(n) |
| 괄호 생성 | 백트래킹 (coi-09) | O(4^n/sqrt(n)) |

## 2. 모노톤 스택

모노톤(단조) 스택은 "다음으로 큰/작은 원소"를 O(n)에 찾는 핵심 기법입니다.

```
모노톤 스택 동작 (Next Greater Element):

  배열: [2, 1, 2, 4, 3]

  스택 상태 변화:
  i=0: push 2        스택: [2]
  i=1: push 1        스택: [2, 1]       (1 < 2, 단조감소 유지)
  i=2: pop 1→결과2   스택: [2]          (2 >= 1, pop)
       push 2        스택: [2, 2]
  i=3: pop 2→결과4   스택: [2]          (4 >= 2, pop)
       pop 2→결과4   스택: []           (4 >= 2, pop)
       push 4        스택: [4]
  i=4: push 3        스택: [4, 3]

  결과: [4, 2, 4, -1, -1]
```

```python
# Next Greater Element — O(n) 시간, O(n) 공간
def next_greater_element(nums: list[int]) -> list[int]:
    n = len(nums)
    result = [-1] * n
    stack = []  # 인덱스를 저장

    for i in range(n):
        while stack and nums[stack[-1]] < nums[i]:
            idx = stack.pop()
            result[idx] = nums[i]
        stack.append(i)

    return result
```

> **핵심 직관**: 모노톤 스택에서 각 원소는 최대 한 번 push되고 한 번 pop되므로, 전체 시간 복잡도는 O(n)입니다. 이것이 O(n^2) 브루트포스를 이기는 비결입니다.

## 3. 히스토그램에서 최대 직사각형

모노톤 스택의 대표 응용 문제입니다.

```python
# Largest Rectangle in Histogram — O(n) 시간, O(n) 공간
def largest_rectangle_area(heights: list[int]) -> int:
    stack = []  # 인덱스 저장 (단조증가 스택)
    max_area = 0
    heights.append(0)  # 센티널 값

    for i, h in enumerate(heights):
        while stack and heights[stack[-1]] > h:
            height = heights[stack.pop()]
            width = i if not stack else i - stack[-1] - 1
            max_area = max(max_area, height * width)
        stack.append(i)

    heights.pop()  # 센티널 제거
    return max_area
```

## 4. 우선순위 큐 (힙)

Python의 `heapq` 모듈은 최소 힙을 제공합니다. 최대 힙이 필요하면 음수를 사용합니다.

| 연산 | 시간 복잡도 | Python 코드 |
|------|-----------|-------------|
| 삽입 | O(log n) | `heapq.heappush(h, val)` |
| 최소값 추출 | O(log n) | `heapq.heappop(h)` |
| 최소값 조회 | O(1) | `h[0]` |
| 힙 생성 | O(n) | `heapq.heapify(lst)` |

```python
import heapq

# K번째로 큰 원소 — O(n log k) 시간, O(k) 공간
def find_kth_largest(nums: list[int], k: int) -> int:
    min_heap = []
    for num in nums:
        heapq.heappush(min_heap, num)
        if len(min_heap) > k:
            heapq.heappop(min_heap)
    return min_heap[0]

# K개 정렬된 리스트 병합 — O(N log k) 시간
def merge_k_sorted(lists: list[list[int]]) -> list[int]:
    heap = []
    for i, lst in enumerate(lists):
        if lst:
            heapq.heappush(heap, (lst[0], i, 0))

    result = []
    while heap:
        val, list_idx, elem_idx = heapq.heappop(heap)
        result.append(val)
        if elem_idx + 1 < len(lists[list_idx]):
            next_val = lists[list_idx][elem_idx + 1]
            heapq.heappush(heap, (next_val, list_idx, elem_idx + 1))
    return result
```

## 5. BFS 패턴 (큐 기반)

큐 기반 BFS는 "최단 경로", "레벨 순회" 문제의 핵심 패턴입니다. coi-05에서 그래프 탐색으로 확장됩니다.

```python
from collections import deque

# 이진 트리 레벨 순회 — O(n) 시간, O(n) 공간
def level_order(root) -> list[list[int]]:
    if not root:
        return []

    result = []
    queue = deque([root])

    while queue:
        level_size = len(queue)
        level = []
        for _ in range(level_size):
            node = queue.popleft()
            level.append(node.val)
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)
        result.append(level)

    return result
```

```
BFS 레벨 순회 흐름:

       1          Level 0: [1]
      / \
     2   3        Level 1: [2, 3]
    / \   \
   4   5   6      Level 2: [4, 5, 6]

  큐 상태: [1] → [2,3] → [3,4,5] → [4,5,6] → ...
```

## 6. 시나리오: 일일 온도 문제

**문제**: 각 날에 대해 더 따뜻한 날이 며칠 후에 오는지 구하시오.

```
패턴 인식:
  "다음으로 큰 값까지의 거리" → 모노톤 스택 (인덱스 차이)
```

```python
# Daily Temperatures — O(n) 시간, O(n) 공간
def daily_temperatures(temperatures: list[int]) -> list[int]:
    n = len(temperatures)
    result = [0] * n
    stack = []  # 인덱스 저장 (단조감소 스택)

    for i in range(n):
        while stack and temperatures[stack[-1]] < temperatures[i]:
            prev_idx = stack.pop()
            result[prev_idx] = i - prev_idx
        stack.append(i)

    return result

# 입력: [73, 74, 75, 71, 69, 72, 76, 73]
# 출력: [1,  1,  4,  2,  1,  1,  0,  0]
```

> **핵심 직관**: 모노톤 스택 문제를 만나면 "스택에 무엇을 저장할 것인가"를 먼저 결정하십시오. 값 자체를 저장할지, 인덱스를 저장할지에 따라 풀이가 달라집니다.

## 7. 스택/큐 패턴 선택 가이드

```
문제 키워드                    적용 패턴
──────────────────────────────────────────────
"괄호 매칭/유효성"            → 스택
"다음으로 큰/작은 원소"       → 모노톤 스택
"히스토그램, 직사각형"        → 모노톤 스택
"K번째 큰/작은"               → 힙 (우선순위 큐)
"K개 정렬 리스트 병합"        → 힙
"최단 거리/레벨 순회"         → BFS (큐)
"계산기/수식 평가"            → 스택 (연산자 스택)
"최소값 추적 스택"            → 보조 스택 (Min Stack)
```

이러한 스택/큐 패턴은 advanced-data-structures 과정에서 학습한 기초를 실전 인터뷰에 적용하는 과정입니다. 우선순위 큐는 coi-05의 다익스트라 알고리즘, coi-08의 그리디 문제에서도 핵심적으로 활용됩니다.

## 핵심 정리

- **괄호 매칭**은 스택의 가장 기본적인 응용으로, 여는 괄호 push / 닫는 괄호 pop 패턴을 따릅니다
- **모노톤 스택**은 "다음으로 큰/작은 원소"를 O(n)에 찾으며, 각 원소가 최대 1번 push/pop되어 선형 시간을 보장합니다
- **우선순위 큐(힙)**는 K번째 원소, K개 리스트 병합 등에 활용하며, Python `heapq`는 최소 힙만 지원합니다
- **BFS(큐)**는 최단 경로와 레벨 순회의 표준 패턴으로, `deque`의 O(1) popleft가 핵심입니다
- 문제의 키워드를 보고 **스택(LIFO) vs 큐(FIFO) vs 힙(우선순위)**를 즉시 구분하는 능력이 필요합니다

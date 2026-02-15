# 그리디와 이분 탐색

## 왜 그리디와 이분 탐색이 중요한가

그리디와 이분 탐색은 코딩 인터뷰에서 **간결하지만 정당성 논증이 까다로운** 유형입니다. 그리디는 매 순간 최적의 선택을 하여 전체 최적에 도달하고, 이분 탐색은 탐색 공간을 절반으로 줄여 O(log n)을 달성합니다. 특히 파라메트릭 서치는 최적화 문제를 결정 문제로 변환하는 강력한 기법입니다.

> **핵심 직관**: 그리디는 "이 선택이 나중에 후회되지 않음"을 증명할 수 있을 때, 이분 탐색은 "답이 단조 성질을 가질 때" 적용합니다.

## 1. 그리디 전략

그리디가 성립하려면 **그리디 선택 속성**(지역 최적이 전역 최적)과 **최적 부분 구조**가 필요합니다.

| 그리디 유형 | 전략 | 대표 문제 |
|------------|------|-----------|
| 정렬 기반 | 기준으로 정렬 후 선택 | 활동 선택, 회의실 배정 |
| 우선순위 기반 | 힙으로 최적 선택 | 허프만 코딩, 작업 스케줄링 |
| 교환 논증 | 두 원소 교환 시 손해 증명 | 문자열 정렬 |
| 수학적 관찰 | 수학적 성질 활용 | 점프 게임, 가스 스테이션 |

```python
# 활동 선택 (Meeting Rooms II — 최소 회의실 수) — O(n log n) 시간
import heapq

def min_meeting_rooms(intervals: list[list[int]]) -> int:
    if not intervals:
        return 0

    intervals.sort(key=lambda x: x[0])  # 시작 시간 정렬
    heap = []  # 각 회의실의 종료 시간

    for start, end in intervals:
        if heap and heap[0] <= start:
            heapq.heappop(heap)  # 기존 회의실 재사용
        heapq.heappush(heap, end)

    return len(heap)
```

## 2. 그리디 정당성 검증

```
그리디 정당성 검증 흐름:

  그리디 선택 A를 했다고 가정
       │
  최적해에 A가 포함되지 않는다면?
       │
  A를 포함하도록 교환(exchange argument)
       │
  교환 후에도 최적성이 유지되는가? ──Yes──→ 그리디 정당
                                   No──→ DP 필요 (coi-06)
```

```python
# 점프 게임 — O(n) 시간, O(1) 공간
# 그리디: 현재까지 도달 가능한 최대 위치를 추적
def can_jump(nums: list[int]) -> bool:
    max_reach = 0
    for i in range(len(nums)):
        if i > max_reach:
            return False
        max_reach = max(max_reach, i + nums[i])
    return True

# 점프 게임 II (최소 점프 수) — O(n) 시간, O(1) 공간
def jump(nums: list[int]) -> int:
    jumps = 0
    curr_end = 0
    farthest = 0
    for i in range(len(nums) - 1):
        farthest = max(farthest, i + nums[i])
        if i == curr_end:
            jumps += 1
            curr_end = farthest
    return jumps
```

> **핵심 직관**: 그리디가 맞는지 확신이 안 서면, 먼저 DP로 풀고 DP 테이블에서 패턴을 관찰하여 그리디로 전환하는 것이 안전한 전략입니다.

## 3. 이분 탐색 기본

이분 탐색은 **정렬된 배열**에서 O(log n) 탐색을 수행합니다. 경계 처리가 핵심입니다.

| 변형 | 조건 | 반환값 |
|------|------|--------|
| 정확한 값 | `nums[mid] == target` | mid |
| lower bound | 최초로 `>= target` | 삽입 위치 |
| upper bound | 최초로 `> target` | 삽입 위치 |

```python
# 이분 탐색 (lower bound) — O(log n) 시간, O(1) 공간
def lower_bound(nums: list[int], target: int) -> int:
    left, right = 0, len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid + 1
        else:
            right = mid
    return left

# 회전 정렬 배열에서 탐색 — O(log n) 시간, O(1) 공간
def search_rotated(nums: list[int], target: int) -> int:
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target:
            return mid
        # 왼쪽 절반이 정렬됨
        if nums[left] <= nums[mid]:
            if nums[left] <= target < nums[mid]:
                right = mid - 1
            else:
                left = mid + 1
        # 오른쪽 절반이 정렬됨
        else:
            if nums[mid] < target <= nums[right]:
                left = mid + 1
            else:
                right = mid - 1
    return -1
```

## 4. 파라메트릭 서치 (결정 문제 변환)

파라메트릭 서치는 **최적화 문제를 결정 문제로 변환**하여 이분 탐색을 적용하는 기법입니다. "최소의 최대" 또는 "최대의 최소" 유형에서 강력합니다.

```
파라메트릭 서치 흐름:

  원래 문제: "최소의 최대값은?"
       │
  결정 문제로 변환: "최대값이 X일 때 가능한가?"
       │
  X에 대해 이분 탐색
       │
  ┌─ check(X) = True  → right = mid (더 작은 X 시도)
  └─ check(X) = False → left = mid + 1 (더 큰 X 시도)
```

```python
# 나무 자르기 — 파라메트릭 서치
# M 미터 이상의 나무를 가져가려면 절단기 높이를 최대 얼마로?
# O(n log H) 시간, H = 최대 높이
def cut_trees(trees: list[int], M: int) -> int:
    def can_get_enough(height: int) -> bool:
        total = sum(max(0, t - height) for t in trees)
        return total >= M

    left, right = 0, max(trees)
    while left < right:
        mid = (left + right + 1) // 2  # 상한 이분탐색
        if can_get_enough(mid):
            left = mid
        else:
            right = mid - 1
    return left
```

## 5. 시나리오: 공유기 설치 (최대의 최소)

**문제**: N개의 집에 C개의 공유기를 설치할 때, 가장 가까운 두 공유기 사이 거리의 최대값을 구하시오.

```python
# 공유기 설치 — O(n log D) 시간, D = 최대 거리
def install_routers(houses: list[int], C: int) -> int:
    houses.sort()

    def can_install(min_dist: int) -> bool:
        count = 1
        last = houses[0]
        for i in range(1, len(houses)):
            if houses[i] - last >= min_dist:
                count += 1
                last = houses[i]
        return count >= C

    left, right = 1, houses[-1] - houses[0]
    while left < right:
        mid = (left + right + 1) // 2
        if can_install(mid):
            left = mid
        else:
            right = mid - 1
    return left
```

| 문제 유형 | 이분 탐색 대상 | check 함수 |
|----------|--------------|------------|
| 최소의 최대 | 최대값 후보 | 가능 여부 (최소 조건) |
| 최대의 최소 | 최소값 후보 | 가능 여부 (최대 조건) |
| K번째 원소 | 값 후보 | count <= K |

> **핵심 직관**: 파라메트릭 서치의 핵심은 "답을 먼저 가정하고, 그 답이 가능한지 검증"하는 역발상입니다. "답에 대해 이분 탐색"이라고 기억하십시오.

## 6. 이분 탐색 경계 처리 가이드

```
이분 탐색 경계 패턴:

  패턴 1: left <= right (정확한 값 탐색)
    → mid = (left + right) // 2
    → left = mid + 1, right = mid - 1

  패턴 2: left < right (범위 축소)
    → mid = (left + right) // 2       (하한 탐색)
    → mid = (left + right + 1) // 2   (상한 탐색)
    → left = mid + 1 or left = mid
    → right = mid or right = mid - 1
```

그리디와 이분 탐색은 algorithm-design 과정의 핵심 기법이며, coi-06의 DP와 대비하여 문제 유형을 구분하는 능력이 중요합니다. 우선순위 큐 기반 그리디는 coi-04에서, 그래프에서의 그리디(다익스트라)는 graph-algorithms 과정에서 깊이 다룹니다.

## 핵심 정리

- **그리디**는 지역 최적이 전역 최적을 보장할 때 적용하며, 교환 논증으로 정당성을 증명합니다
- 그리디와 DP의 구분이 어려우면 **먼저 DP로 풀고 패턴을 관찰**하여 그리디로 전환하는 것이 안전합니다
- **이분 탐색**의 핵심은 경계 처리이며, `left < right` vs `left <= right` 패턴을 구분합니다
- **파라메트릭 서치**는 최적화 문제를 "답을 가정하고 검증"하는 결정 문제로 변환합니다
- "최소의 최대", "최대의 최소" 키워드가 보이면 **파라메트릭 서치**를 즉시 떠올려야 합니다

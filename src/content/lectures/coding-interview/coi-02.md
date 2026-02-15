# 배열과 해시맵 패턴

## 왜 배열과 해시맵 패턴이 중요한가

배열과 해시맵은 코딩 인터뷰에서 가장 빈번하게 출제되는 자료구조입니다. 전체 인터뷰 문제의 약 40% 이상이 이 두 자료구조를 기반으로 합니다. 투 포인터, 슬라이딩 윈도우, 빈도 카운팅 등의 **핵심 패턴**을 체화하면 대부분의 배열 문제를 체계적으로 풀 수 있습니다.

> **핵심 직관**: 배열 문제의 핵심은 O(n^2) 브루트포스를 O(n) 또는 O(n log n)으로 최적화하는 것이며, 그 도구가 바로 투 포인터와 해시맵입니다.

## 1. 투 포인터 패턴

투 포인터는 정렬된 배열에서 두 개의 포인터를 활용하여 탐색 범위를 줄이는 기법입니다.

| 유형 | 포인터 이동 방식 | 대표 문제 |
|------|----------------|-----------|
| 양끝 수렴 | left→, ←right | Two Sum (정렬), 물 담기 |
| 같은 방향 | slow→, fast→ | 중복 제거, 사이클 탐지 |
| 다중 배열 | 각 배열에 포인터 | 배열 병합, 교집합 |

```
양끝 수렴 투 포인터 흐름:

  [1, 2, 3, 5, 8, 11, 15]
   L→                 ←R     합 < target → L 이동
      L→           ←R        합 > target → R 이동
      L→        ←R           합 == target → 반환
```

```python
# Container With Most Water — O(n) 시간, O(1) 공간
def max_area(height: list[int]) -> int:
    left, right = 0, len(height) - 1
    max_water = 0
    while left < right:
        w = right - left
        h = min(height[left], height[right])
        max_water = max(max_water, w * h)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return max_water
```

## 2. 슬라이딩 윈도우 패턴

슬라이딩 윈도우는 **연속 부분 배열(subarray)** 관련 문제에서 O(n^2)을 O(n)으로 줄이는 핵심 기법입니다.

| 윈도우 유형 | 특징 | 대표 문제 |
|------------|------|-----------|
| 고정 크기 | 윈도우 크기 k 고정 | 크기 k인 부분배열 최대합 |
| 가변 크기 | 조건 만족 시 축소 | 합이 target 이상인 최소 길이 |
| 문자열 윈도우 | 해시맵과 결합 | 모든 문자 포함하는 최소 윈도우 |

```
가변 크기 슬라이딩 윈도우 흐름:

  조건 불만족 → right 확장 →→→
  [■ ■ ■ □ □ □ □ □ □]
   L     R

  조건 만족 → left 축소 →→→
  [□ ■ ■ ■ □ □ □ □ □]
      L     R
```

```python
# 합이 target 이상인 최소 길이 부분배열 — O(n) 시간, O(1) 공간
def min_subarray_len(target: int, nums: list[int]) -> int:
    left = 0
    curr_sum = 0
    min_len = float('inf')
    for right in range(len(nums)):
        curr_sum += nums[right]
        while curr_sum >= target:
            min_len = min(min_len, right - left + 1)
            curr_sum -= nums[left]
            left += 1
    return min_len if min_len != float('inf') else 0
```

## 3. 해시맵 활용 패턴

해시맵은 O(1) 조회를 통해 탐색 문제를 극적으로 최적화합니다. Python의 `dict`와 `collections.Counter`, `defaultdict`를 능숙하게 사용해야 합니다(py- 시리즈 참고).

> **핵심 직관**: "이 값을 본 적 있는가?"라는 질문이 나오면, 해시맵을 떠올려야 합니다. 존재 여부 확인, 빈도 카운팅, 인덱스 매핑 모두 해시맵의 영역입니다.

```python
# Subarray Sum Equals K — O(n) 시간, O(n) 공간
# 누적합 + 해시맵 패턴
def subarray_sum(nums: list[int], k: int) -> int:
    prefix_count = {0: 1}  # 누적합 0이 1번 등장
    curr_sum = 0
    count = 0
    for num in nums:
        curr_sum += num
        # curr_sum - k가 이전에 등장했다면, 그 구간의 합이 k
        if curr_sum - k in prefix_count:
            count += prefix_count[curr_sum - k]
        prefix_count[curr_sum] = prefix_count.get(curr_sum, 0) + 1
    return count
```

## 4. 빈도 카운팅 패턴

`collections.Counter`를 활용한 빈도 분석은 문자열 및 배열 문제에서 매우 자주 등장합니다.

```python
from collections import Counter

# Top K Frequent Elements — O(n) 시간 (버킷 정렬)
def top_k_frequent(nums: list[int], k: int) -> list[int]:
    count = Counter(nums)
    # 버킷 정렬: 인덱스가 빈도, 값이 원소 리스트
    buckets = [[] for _ in range(len(nums) + 1)]
    for num, freq in count.items():
        buckets[freq].append(num)

    result = []
    for freq in range(len(buckets) - 1, 0, -1):
        for num in buckets[freq]:
            result.append(num)
            if len(result) == k:
                return result
    return result
```

| 빈도 카운팅 접근법 | 시간 복잡도 | 사용 시점 |
|-------------------|-----------|-----------|
| Counter + 정렬 | O(n log n) | 간단한 구현 |
| Counter + 힙 | O(n log k) | k가 n보다 작을 때 |
| 버킷 정렬 | O(n) | 최적 성능 필요 시 |

## 5. 시나리오: 연속 부분 배열 문제 접근

**문제**: 길이가 정확히 k인 부분배열 중 서로 다른 원소 수가 최대인 것을 구하시오.

```
접근법 선택 흐름:

  "연속 부분배열" ──→ 슬라이딩 윈도우
       │
  "길이 k 고정" ──→ 고정 크기 윈도우
       │
  "서로 다른 원소" ──→ 해시맵(Counter) 결합
```

```python
# 고정 크기 슬라이딩 윈도우 + Counter — O(n) 시간, O(k) 공간
from collections import defaultdict

def max_distinct_in_window(nums: list[int], k: int) -> int:
    freq = defaultdict(int)
    distinct = 0
    max_distinct = 0

    for i in range(len(nums)):
        # 오른쪽 원소 추가
        freq[nums[i]] += 1
        if freq[nums[i]] == 1:
            distinct += 1
        # 윈도우 크기 초과 시 왼쪽 원소 제거
        if i >= k:
            freq[nums[i - k]] -= 1
            if freq[nums[i - k]] == 0:
                distinct -= 1
        # 윈도우가 k 크기가 되면 갱신
        if i >= k - 1:
            max_distinct = max(max_distinct, distinct)

    return max_distinct
```

## 6. 패턴 인식 가이드

```
문제 키워드               →  적용 패턴
────────────────────────────────────────────
"정렬된 배열에서 두 수"   →  투 포인터 (양끝 수렴)
"연속 부분배열의 최대/최소" → 슬라이딩 윈도우
"합이 k인 부분배열 개수"   → 누적합 + 해시맵
"가장 빈번한 원소"         → 빈도 카운팅
"중복 제거"                → 투 포인터 (같은 방향)
"구간 합 쿼리"             → 누적합 배열 (prefix sum)
```

이 패턴들은 algorithms 과정의 기본 자료구조를 실전에 적용하는 것이며, 이후 coi-06(동적 프로그래밍)과 coi-08(이분 탐색)에서 더 복잡한 배열 문제로 확장됩니다.

> **핵심 직관**: 슬라이딩 윈도우의 핵심은 "윈도우를 확장할 때와 축소할 때의 조건"을 명확히 정의하는 것입니다. 이 조건이 곧 문제의 제약 조건과 일치합니다.

## 핵심 정리

- **투 포인터**는 정렬된 배열에서 O(n^2)을 O(n)으로 줄이는 핵심 기법으로, 양끝 수렴/같은 방향/다중 배열 세 가지 유형이 있습니다
- **슬라이딩 윈도우**는 "연속 부분배열" 키워드가 보이면 즉시 적용해야 하며, 고정/가변 크기를 구분합니다
- **누적합 + 해시맵** 조합은 "합이 k인 부분배열 개수" 유형의 표준 해법입니다
- **빈도 카운팅**에서 `Counter` + 버킷 정렬 조합은 O(n) 최적 성능을 달성합니다
- 문제의 키워드(정렬, 연속, 빈도 등)를 패턴과 매핑하는 **패턴 인식 능력**이 속도의 핵심입니다

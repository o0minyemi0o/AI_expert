# 문자열과 패턴 매칭

## 왜 문자열과 패턴 매칭이 중요한가

문자열 문제는 코딩 인터뷰에서 배열 다음으로 자주 출제되는 영역입니다. 단순 조작부터 KMP와 같은 고급 패턴 매칭까지, 문자열 문제는 **구현력과 알고리즘 지식을 동시에 검증**합니다. 특히 아나그램, 팰린드롬, 부분 문자열 탐색은 인터뷰 단골 주제입니다.

> **핵심 직관**: 문자열 문제의 80%는 해시맵(빈도 카운팅)과 투 포인터/슬라이딩 윈도우(coi-02)의 조합으로 해결됩니다. 나머지 20%가 KMP, Trie 같은 전문 알고리즘 영역입니다.

## 1. 문자열 기본 조작 패턴

Python의 문자열은 불변(immutable)이므로, 효율적인 조작을 위해 리스트 변환이 자주 필요합니다(py- 시리즈 참고).

| 연산 | 직접 구현 | Python 내장 | 시간 복잡도 |
|------|----------|-------------|-----------|
| 뒤집기 | `s[::-1]` | `reversed()` | O(n) |
| 비교 | 문자별 비교 | `==` 연산자 | O(n) |
| 탐색 | 직접 순회 | `s.find()`, `in` | O(n*m) |
| 치환 | 리스트 변환 | `s.replace()` | O(n) |
| 분할 | 직접 파싱 | `s.split()` | O(n) |

```python
# 문자열 뒤집기 (in-place, 리스트 기반) — O(n) 시간, O(1) 공간
def reverse_string(s: list[str]) -> None:
    left, right = 0, len(s) - 1
    while left < right:
        s[left], s[right] = s[right], s[left]
        left += 1
        right -= 1
```

## 2. 아나그램 패턴

아나그램은 두 문자열의 문자 빈도가 동일한지를 확인하는 문제입니다. 해시맵 기반 빈도 카운팅이 표준 접근법입니다.

```python
from collections import Counter

# 아나그램 판별 — O(n) 시간, O(1) 공간 (알파벳 26자 고정)
def is_anagram(s: str, t: str) -> bool:
    return Counter(s) == Counter(t)

# 문자열 내 아나그램 찾기 (슬라이딩 윈도우) — O(n) 시간
def find_anagrams(s: str, p: str) -> list[int]:
    if len(p) > len(s):
        return []

    p_count = Counter(p)
    s_count = Counter(s[:len(p)])
    result = []

    if s_count == p_count:
        result.append(0)

    for i in range(len(p), len(s)):
        s_count[s[i]] += 1           # 오른쪽 추가
        left_char = s[i - len(p)]
        s_count[left_char] -= 1      # 왼쪽 제거
        if s_count[left_char] == 0:
            del s_count[left_char]
        if s_count == p_count:
            result.append(i - len(p) + 1)

    return result
```

> **핵심 직관**: Counter 객체의 동등 비교(`==`)는 O(26) = O(1)이므로, 슬라이딩 윈도우와 결합하면 전체 O(n)에 모든 아나그램 위치를 찾을 수 있습니다.

## 3. 팰린드롬 패턴

팰린드롬 문제는 투 포인터(양끝 수렴)와 DP(coi-06) 두 가지 접근이 있습니다.

```
팰린드롬 접근법 선택:

  "팰린드롬 판별"         →  투 포인터 O(n)
  "가장 긴 팰린드롬 부분문자열" →  중심 확장 O(n^2) or Manacher O(n)
  "팰린드롬 분할"          →  DP + 백트래킹 (coi-06, coi-09)
  "팰린드롬 만들기 최소 삽입" →  LCS 기반 DP (coi-06)
```

```python
# 가장 긴 팰린드롬 부분문자열 (중심 확장) — O(n^2) 시간, O(1) 공간
def longest_palindrome(s: str) -> str:
    def expand(left: int, right: int) -> str:
        while left >= 0 and right < len(s) and s[left] == s[right]:
            left -= 1
            right += 1
        return s[left + 1:right]

    result = ""
    for i in range(len(s)):
        # 홀수 길이 팰린드롬
        odd = expand(i, i)
        # 짝수 길이 팰린드롬
        even = expand(i, i + 1)
        result = max(result, odd, even, key=len)
    return result
```

## 4. KMP 패턴 매칭 알고리즘

KMP는 텍스트에서 패턴을 O(n+m)에 찾는 알고리즘입니다. 실패 함수(failure function)가 핵심입니다.

| 알고리즘 | 시간 복잡도 | 공간 복잡도 | 특징 |
|---------|-----------|-----------|------|
| 브루트포스 | O(n*m) | O(1) | 단순 구현 |
| KMP | O(n+m) | O(m) | 실패 함수 기반 |
| Rabin-Karp | O(n+m) 평균 | O(1) | 해시 기반, 다중 패턴 |

```python
# KMP 패턴 매칭 — O(n+m) 시간, O(m) 공간
def kmp_search(text: str, pattern: str) -> list[int]:
    # 1. 실패 함수 구축
    def build_lps(pattern: str) -> list[int]:
        lps = [0] * len(pattern)
        length = 0
        i = 1
        while i < len(pattern):
            if pattern[i] == pattern[length]:
                length += 1
                lps[i] = length
                i += 1
            elif length > 0:
                length = lps[length - 1]
            else:
                lps[i] = 0
                i += 1
        return lps

    lps = build_lps(pattern)
    results = []
    i = j = 0  # i: text 인덱스, j: pattern 인덱스

    # 2. 매칭
    while i < len(text):
        if text[i] == pattern[j]:
            i += 1
            j += 1
        if j == len(pattern):
            results.append(i - j)
            j = lps[j - 1]
        elif i < len(text) and text[i] != pattern[j]:
            if j > 0:
                j = lps[j - 1]  # 실패 함수로 점프
            else:
                i += 1
    return results
```

## 5. 정규표현식 활용

인터뷰에서 정규표현식을 직접 구현하라는 문제도 출제됩니다(예: `.`과 `*` 매칭).

```python
# 간단한 정규표현식 매칭 (DP) — O(n*m) 시간, O(n*m) 공간
# '.' = 임의 한 문자, '*' = 앞 문자 0회 이상 반복
def is_match(s: str, p: str) -> bool:
    m, n = len(s), len(p)
    dp = [[False] * (n + 1) for _ in range(m + 1)]
    dp[0][0] = True

    # 패턴의 a* 같은 형태가 빈 문자열과 매칭 가능
    for j in range(2, n + 1):
        if p[j - 1] == '*':
            dp[0][j] = dp[0][j - 2]

    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if p[j - 1] == '*':
                dp[i][j] = dp[i][j - 2]  # 0회 매칭
                if p[j - 2] == '.' or p[j - 2] == s[i - 1]:
                    dp[i][j] |= dp[i - 1][j]  # 1회 이상 매칭
            elif p[j - 1] == '.' or p[j - 1] == s[i - 1]:
                dp[i][j] = dp[i - 1][j - 1]

    return dp[m][n]
```

## 6. 시나리오: 최소 윈도우 부분 문자열

**문제**: 문자열 s에서 문자열 t의 모든 문자를 포함하는 최소 길이 부분 문자열을 찾으시오.

```
접근법 흐름:

  "부분 문자열" → 슬라이딩 윈도우 (coi-02)
       │
  "모든 문자 포함" → Counter로 빈도 추적
       │
  "최소 길이" → 가변 크기 윈도우 (조건 만족 시 축소)
```

```python
# Minimum Window Substring — O(n) 시간, O(t) 공간
from collections import Counter

def min_window(s: str, t: str) -> str:
    need = Counter(t)
    missing = len(t)
    left = 0
    start, end = 0, float('inf')

    for right, char in enumerate(s):
        if need[char] > 0:
            missing -= 1
        need[char] -= 1

        while missing == 0:
            if right - left < end - start:
                start, end = left, right
            need[s[left]] += 1
            if need[s[left]] > 0:
                missing += 1
            left += 1

    return s[start:end + 1] if end != float('inf') else ""
```

이 문제는 coi-02의 슬라이딩 윈도우와 해시맵 패턴의 종합 응용이며, 실제 인터뷰에서 높은 난이도로 자주 출제됩니다.

> **핵심 직관**: 문자열 문제에서 "포함", "빈도", "아나그램" 키워드가 보이면 Counter + 슬라이딩 윈도우 조합을 먼저 떠올리십시오. 이 패턴 하나로 수십 가지 문제를 커버합니다.

## 핵심 정리

- **아나그램** 판별은 Counter 동등 비교로 O(n)에 해결하며, 슬라이딩 윈도우와 결합하여 위치 탐색도 가능합니다
- **팰린드롬** 문제는 투 포인터(판별)와 중심 확장(최장 부분문자열), DP(분할) 등 유형별 접근법이 다릅니다
- **KMP 알고리즘**은 실패 함수를 통해 O(n+m) 패턴 매칭을 달성하며, 면접에서 직접 구현을 요구받을 수 있습니다
- **정규표현식 매칭**은 `.`과 `*`를 처리하는 2차원 DP 문제로, coi-06의 DP 패턴이 직접 적용됩니다
- 대부분의 문자열 인터뷰 문제는 **Counter + 슬라이딩 윈도우** 패턴으로 해결 가능하므로 이 조합을 완벽히 체화해야 합니다

# 백트래킹과 조합 탐색

## 왜 백트래킹과 조합 탐색이 중요한가

백트래킹은 **모든 가능한 해를 체계적으로 탐색**하되, 불필요한 경우를 조기에 가지치기(pruning)하는 기법입니다. 순열, 조합, 부분집합 생성과 같은 조합 문제뿐만 아니라, N-Queens, 스도쿠 같은 제약 만족 문제에도 적용됩니다. coi-01에서 다룬 완전 탐색의 체계적 구현 방법입니다.

> **핵심 직관**: 백트래킹은 "선택 → 탐색 → 되돌리기" 3단계의 반복입니다. DFS(coi-05)에 "가지치기"를 추가한 것이 백트래킹입니다.

## 1. 백트래킹 프레임워크

모든 백트래킹 문제는 동일한 템플릿을 따릅니다.

```python
def backtrack(candidates, path, result, start):
    # 기저 조건: 답을 찾았을 때
    if is_solution(path):
        result.append(path[:])  # 복사 저장
        return

    for i in range(start, len(candidates)):
        # 가지치기: 유망하지 않으면 건너뜀
        if not is_valid(candidates[i], path):
            continue

        # 선택
        path.append(candidates[i])

        # 탐색 (재귀)
        backtrack(candidates, path, result, i + 1)  # or i (중복 허용)

        # 되돌리기
        path.pop()
```

```
백트래킹 트리 (부분집합 {1,2,3}):

                    []
           /        |        \
         [1]       [2]       [3]
        /   \       |
     [1,2] [1,3]  [2,3]
       |
    [1,2,3]
```

## 2. 순열, 조합, 부분집합

| 유형 | 순서 중요 | 중복 허용 | 개수 | 시간 복잡도 |
|------|----------|----------|------|-----------|
| 순열 | O | X | n! | O(n * n!) |
| 조합 (nCr) | X | X | C(n,r) | O(C(n,r)) |
| 부분집합 | X | X | 2^n | O(n * 2^n) |
| 중복 순열 | O | O | n^r | O(n^r) |
| 중복 조합 | X | O | C(n+r-1,r) | O(C(n+r-1,r)) |

```python
# 순열 — O(n * n!) 시간
def permutations(nums: list[int]) -> list[list[int]]:
    result = []
    def backtrack(path, used):
        if len(path) == len(nums):
            result.append(path[:])
            return
        for i in range(len(nums)):
            if used[i]:
                continue
            used[i] = True
            path.append(nums[i])
            backtrack(path, used)
            path.pop()
            used[i] = False
    backtrack([], [False] * len(nums))
    return result

# 조합 — O(C(n,k)) 시간
def combinations(n: int, k: int) -> list[list[int]]:
    result = []
    def backtrack(start, path):
        if len(path) == k:
            result.append(path[:])
            return
        for i in range(start, n + 1):
            path.append(i)
            backtrack(i + 1, path)
            path.pop()
    backtrack(1, [])
    return result

# 부분집합 — O(n * 2^n) 시간
def subsets(nums: list[int]) -> list[list[int]]:
    result = []
    def backtrack(start, path):
        result.append(path[:])  # 모든 경로가 답
        for i in range(start, len(nums)):
            path.append(nums[i])
            backtrack(i + 1, path)
            path.pop()
    backtrack(0, [])
    return result
```

## 3. 가지치기 (Pruning) 기법

가지치기는 백트래킹의 효율을 결정짓는 핵심 기법입니다.

| 가지치기 유형 | 설명 | 예시 |
|-------------|------|------|
| 값 기반 | 현재 합이 초과 시 중단 | 조합 합 문제 |
| 대칭 제거 | 동일 구조 중복 방지 | N-Queens |
| 정렬 활용 | 정렬 후 연속 중복 건너뜀 | 중복 원소 조합 |
| 상한/하한 | 남은 원소로 답 불가 시 중단 | 배낭 문제 |

```python
# 조합 합 (중복 원소, 각 원소 1회 사용) — 가지치기 적용
def combination_sum2(candidates: list[int], target: int) -> list[list[int]]:
    candidates.sort()  # 정렬 → 가지치기 가능
    result = []

    def backtrack(start, path, remaining):
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            # 가지치기 1: 남은 값 초과
            if candidates[i] > remaining:
                break
            # 가지치기 2: 같은 레벨에서 중복 방지
            if i > start and candidates[i] == candidates[i - 1]:
                continue
            path.append(candidates[i])
            backtrack(i + 1, path, remaining - candidates[i])
            path.pop()

    backtrack(0, [], target)
    return result
```

> **핵심 직관**: 가지치기의 효과를 극대화하려면 "정렬 후 탐색"이 거의 항상 유리합니다. 정렬된 상태에서는 임계값 초과 시 즉시 break할 수 있기 때문입니다.

## 4. N-Queens 문제

```python
# N-Queens — O(n!) 시간 (가지치기 후 실제로는 훨씬 적음)
def solve_n_queens(n: int) -> list[list[str]]:
    result = []
    cols = set()
    diag1 = set()  # row - col
    diag2 = set()  # row + col

    def backtrack(row, board):
        if row == n:
            result.append(["".join(r) for r in board])
            return

        for col in range(n):
            if col in cols or (row - col) in diag1 or (row + col) in diag2:
                continue

            cols.add(col)
            diag1.add(row - col)
            diag2.add(row + col)
            board[row][col] = 'Q'

            backtrack(row + 1, board)

            board[row][col] = '.'
            cols.remove(col)
            diag1.remove(row - col)
            diag2.remove(row + col)

    board = [['.' for _ in range(n)] for _ in range(n)]
    backtrack(0, board)
    return result
```

```
N-Queens 가지치기 (N=4):

  행 0: Q 배치 가능 열 = {0,1,2,3}
  행 1: 열, 대각선 제외 → 후보 감소
  행 2: 추가 제약 → 후보 더 감소
  행 3: 유일한 후보 or 없음 → 백트래킹

  가지치기 없이: 4^4 = 256 탐색
  가지치기 후:   실제 탐색 << 256
```

## 5. 시나리오: 단어 탐색 (Word Search)

**문제**: 2D 격자에서 인접 셀을 따라 주어진 단어를 찾을 수 있는지 판별하시오.

```python
# Word Search — O(m*n*4^L) 시간, L=단어 길이
def exist(board: list[list[str]], word: str) -> bool:
    rows, cols = len(board), len(board[0])

    def backtrack(r: int, c: int, idx: int) -> bool:
        if idx == len(word):
            return True
        if (r < 0 or r >= rows or c < 0 or c >= cols or
                board[r][c] != word[idx]):
            return False

        temp = board[r][c]
        board[r][c] = '#'  # 방문 표시

        for dr, dc in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
            if backtrack(r + dr, c + dc, idx + 1):
                return True

        board[r][c] = temp  # 되돌리기
        return False

    for r in range(rows):
        for c in range(cols):
            if backtrack(r, c, 0):
                return True
    return False
```

> **핵심 직관**: 백트래킹에서 "되돌리기(undo)"를 빠뜨리면 다른 경로 탐색에 영향을 줍니다. 선택-탐색-되돌리기 패턴을 기계적으로 적용하십시오.

## 6. 백트래킹 vs DP 결정 기준

```
문제 분석
  │
  ├─ "모든 해를 열거"           → 백트래킹
  │
  ├─ "최적해 1개"
  │     │
  │     ├─ 중복 부분 문제 있음   → DP (coi-06, coi-07)
  │     └─ 중복 없음            → 백트래킹 + 가지치기
  │
  └─ "해의 존재 여부"
        │
        ├─ 제약 만족 문제        → 백트래킹
        └─ 최적화 관점           → DP or 그리디 (coi-08)
```

백트래킹은 coi-05의 DFS를 기반으로 하며, 비트마스크 DP(coi-07)와 결합하면 더욱 효율적인 탐색이 가능합니다. Python의 제너레이터(py- 시리즈)를 활용하면 메모리 효율적인 백트래킹 구현도 가능합니다.

## 핵심 정리

- 백트래킹의 핵심 패턴은 **선택 → 탐색(재귀) → 되돌리기**이며, 모든 문제에 동일한 템플릿을 적용합니다
- **순열**(n!), **조합**(C(n,r)), **부분집합**(2^n)은 재귀의 시작점과 사용 조건으로 구분합니다
- **가지치기**는 정렬 후 탐색, 값 초과 시 break, 중복 건너뛰기 등으로 탐색 공간을 극적으로 줄입니다
- N-Queens에서 열/대각선을 집합으로 관리하면 O(1) 유효성 검사가 가능합니다
- "모든 해를 열거"하면 백트래킹, "최적해 1개"면 DP와의 **구분 기준**을 명확히 합니다

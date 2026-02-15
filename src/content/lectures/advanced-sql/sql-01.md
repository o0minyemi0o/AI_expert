# Window Functions 기초

## 왜 Window Functions가 중요한가

일반적인 GROUP BY 집계는 행을 그룹으로 합쳐서 원본 행 정보를 잃어버립니다. Window Functions는 **원본 행을 유지하면서 집계/순위/비교 연산**을 수행할 수 있어, 데이터 분석과 리포팅의 핵심 도구입니다. 면접에서도 Window Functions를 자유자재로 쓰는지가 SQL 실력의 척도가 됩니다.

> **핵심 직관**: GROUP BY는 "행을 합친다", Window Functions는 "행을 유지하면서 주변 행의 정보를 가져온다"입니다.

## 1. Window Functions의 기본 구조

```sql
-- Window Function 기본 문법
SELECT
    column,
    FUNCTION() OVER (
        PARTITION BY partition_column    -- 그룹 분할 (선택)
        ORDER BY order_column            -- 정렬 기준 (선택)
        ROWS BETWEEN ... AND ...         -- 윈도우 프레임 (선택)
    ) AS result
FROM table;
```

```
GROUP BY vs Window Function:

  GROUP BY:
  ┌──────────────┐       ┌──────────┐
  │ A | 10       │       │ A | 30   │
  │ A | 20       │  ──→  │ B | 70   │   행이 합쳐짐
  │ B | 30       │       └──────────┘
  │ B | 40       │
  └──────────────┘

  Window Function:
  ┌──────────────┐       ┌──────────────────┐
  │ A | 10       │       │ A | 10 | 30      │
  │ A | 20       │  ──→  │ A | 20 | 30      │   원본 행 유지 + 집계값 추가
  │ B | 30       │       │ B | 30 | 70      │
  │ B | 40       │       │ B | 40 | 70      │
  └──────────────┘       └──────────────────┘
```

## 2. ROW_NUMBER, RANK, DENSE_RANK

세 함수 모두 순위를 매기지만, **동점(tie) 처리 방식**이 다릅니다.

```sql
-- 점수별 순위 비교
SELECT
    name, score,
    ROW_NUMBER() OVER (ORDER BY score DESC) AS row_num,
    RANK()       OVER (ORDER BY score DESC) AS rank,
    DENSE_RANK() OVER (ORDER BY score DESC) AS dense_rank
FROM students;
```

| name | score | row_num | rank | dense_rank |
|------|-------|---------|------|------------|
| 김철수 | 95 | 1 | 1 | 1 |
| 이영희 | 90 | 2 | 2 | 2 |
| 박민수 | 90 | 3 | 2 | 2 |
| 정수진 | 85 | 4 | **4** | **3** |

| 함수 | 동점 처리 | 건너뛰기 | 사용 사례 |
|------|----------|---------|----------|
| ROW_NUMBER | 동점이어도 다른 번호 | — | 고유 번호 부여, 중복 제거 |
| RANK | 같은 순위 부여 | 다음 순위 건너뜀 | 경쟁 순위 (올림픽) |
| DENSE_RANK | 같은 순위 부여 | 건너뛰지 않음 | 연속 순위 필요 시 |

> **핵심 직관**: "그룹 내 Top-N"을 뽑을 때는 ROW_NUMBER를 서브쿼리에 넣고 WHERE rn <= N으로 필터링하는 패턴이 면접 단골 문제입니다.

## 3. PARTITION BY

PARTITION BY는 Window Function의 **연산 범위를 그룹별로 분할**합니다. GROUP BY와 비슷하지만 행을 합치지 않습니다.

```sql
-- 부서별 급여 순위
SELECT
    department, name, salary,
    RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank
FROM employees;
```

| department | name | salary | dept_rank |
|-----------|------|--------|-----------|
| 개발 | 김철수 | 8000 | 1 |
| 개발 | 이영희 | 7000 | 2 |
| 개발 | 박민수 | 6000 | 3 |
| 마케팅 | 정수진 | 7500 | 1 |
| 마케팅 | 한지민 | 6500 | 2 |

```sql
-- 부서별 Top-2 급여자 조회 (핵심 패턴)
WITH ranked AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY department ORDER BY salary DESC
    ) AS rn
    FROM employees
)
SELECT * FROM ranked WHERE rn <= 2;
```

## 4. 집계 Window Functions

SUM, AVG, COUNT, MIN, MAX도 OVER 절과 함께 Window Function으로 사용할 수 있습니다.

```sql
-- 각 행에 부서 평균 급여와 전체 평균 급여를 함께 표시
SELECT
    department, name, salary,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg,
    AVG(salary) OVER () AS total_avg,  -- PARTITION BY 없으면 전체
    salary - AVG(salary) OVER (PARTITION BY department) AS diff_from_dept_avg
FROM employees;
```

## 5. 윈도우 프레임 기초

ORDER BY가 있을 때, 프레임은 **현재 행 기준으로 어느 범위까지 연산할지**를 정의합니다.

```
프레임 키워드:

  UNBOUNDED PRECEDING ─── 파티션의 첫 행
  N PRECEDING          ─── 현재 행에서 N행 앞
  CURRENT ROW          ─── 현재 행
  N FOLLOWING          ─── 현재 행에서 N행 뒤
  UNBOUNDED FOLLOWING  ─── 파티션의 마지막 행

  기본 프레임 (ORDER BY 있을 때):
  RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  → 누적 합계가 기본 동작!
```

```sql
-- 누적 합계 (Running Total) — 프레임 기본 동작
SELECT
    date, revenue,
    SUM(revenue) OVER (ORDER BY date) AS running_total
FROM daily_sales;

-- 최근 3일 이동 평균
SELECT
    date, revenue,
    AVG(revenue) OVER (
        ORDER BY date
        ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS moving_avg_3d
FROM daily_sales;
```

| date | revenue | running_total | moving_avg_3d |
|------|---------|--------------|---------------|
| 1/1 | 100 | 100 | 100.0 |
| 1/2 | 150 | 250 | 125.0 |
| 1/3 | 200 | 450 | 150.0 |
| 1/4 | 120 | 570 | 156.7 |

> **핵심 직관**: ORDER BY만 쓰면 "처음부터 현재까지"의 누적 연산이 기본입니다. 명시적 프레임을 쓰면 "최근 N행"과 같은 이동 연산이 가능합니다. sql-02에서 프레임을 더 깊이 다룹니다.

## 핵심 정리

- Window Functions는 **원본 행을 유지하면서** 집계/순위 연산을 수행하며, GROUP BY와 근본적으로 다릅니다
- ROW_NUMBER(고유 번호), RANK(건너뛰는 순위), DENSE_RANK(연속 순위)는 **동점 처리 방식**이 다릅니다
- **PARTITION BY**는 Window Function의 연산 범위를 그룹별로 분할하며, "그룹 내 Top-N" 패턴의 핵심입니다
- SUM, AVG 등 집계 함수도 OVER 절과 함께 사용하면 **각 행에 집계값을 추가**할 수 있습니다
- 윈도우 **프레임**(ROWS BETWEEN)으로 누적 합계, 이동 평균 등 범위 기반 연산을 정의합니다

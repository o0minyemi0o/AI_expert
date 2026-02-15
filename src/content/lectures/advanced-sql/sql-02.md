# 고급 Window Functions

## 왜 고급 Window Functions가 중요한가

sql-01에서 기본적인 순위와 집계 Window Functions를 배웠다면, 여기서는 **시간축 비교, 분위 분석, 정밀한 프레임 제어**를 다룹니다. LEAD/LAG는 시계열 데이터 분석의 핵심이고, NTILE은 세그먼트 분석에, 프레임 명세는 이동 통계 계산에 필수적입니다.

> **핵심 직관**: LEAD/LAG는 "시간을 앞뒤로 이동하는 능력"을 SQL에 부여합니다. 별도의 self join 없이 이전/다음 행의 값을 참조할 수 있습니다.

## 1. LEAD와 LAG

```sql
-- LAG: 이전 행 값, LEAD: 다음 행 값
SELECT
    date, revenue,
    LAG(revenue, 1)  OVER (ORDER BY date) AS prev_day,    -- 1일 전
    LEAD(revenue, 1) OVER (ORDER BY date) AS next_day,    -- 1일 후
    revenue - LAG(revenue, 1) OVER (ORDER BY date) AS day_over_day  -- 전일 대비
FROM daily_sales;
```

| date | revenue | prev_day | next_day | day_over_day |
|------|---------|----------|----------|-------------|
| 1/1 | 100 | NULL | 150 | NULL |
| 1/2 | 150 | 100 | 200 | +50 |
| 1/3 | 200 | 150 | 120 | +50 |
| 1/4 | 120 | 200 | NULL | -80 |

```sql
-- LAG/LEAD 고급 사용: 기본값 지정, N행 이동
SELECT
    month, revenue,
    LAG(revenue, 1, 0) OVER (ORDER BY month) AS prev_month,  -- NULL 대신 0
    LAG(revenue, 12)   OVER (ORDER BY month) AS same_month_last_year,  -- 전년 동월
    ROUND(100.0 * (revenue - LAG(revenue, 12) OVER (ORDER BY month))
          / NULLIF(LAG(revenue, 12) OVER (ORDER BY month), 0), 1) AS yoy_growth
FROM monthly_sales;
```

## 2. NTILE

NTILE은 결과를 **N개의 동일 크기 버킷**으로 나눕니다.

```sql
-- 고객을 매출 기준 4분위로 나누기
SELECT
    customer_id, total_spend,
    NTILE(4) OVER (ORDER BY total_spend DESC) AS quartile
FROM customer_summary;
```

| customer_id | total_spend | quartile |
|------------|-------------|----------|
| C001 | 50000 | 1 (상위 25%) |
| C002 | 42000 | 1 |
| C003 | 35000 | 2 |
| C004 | 28000 | 2 |
| C005 | 15000 | 3 |
| C006 | 8000 | 3 |
| C007 | 5000 | 4 (하위 25%) |
| C008 | 2000 | 4 |

```sql
-- 분위별 통계 집계
WITH quartiled AS (
    SELECT *, NTILE(4) OVER (ORDER BY total_spend DESC) AS q
    FROM customer_summary
)
SELECT
    q AS quartile,
    COUNT(*) AS customer_count,
    ROUND(AVG(total_spend)) AS avg_spend,
    MIN(total_spend) AS min_spend,
    MAX(total_spend) AS max_spend
FROM quartiled
GROUP BY q ORDER BY q;
```

> **핵심 직관**: NTILE은 "백분위"보다 유연합니다. NTILE(10)이면 십분위, NTILE(100)이면 백분위입니다. 고객 세그멘테이션, 급여 분포 분석 등에서 핵심 도구입니다.

## 3. FIRST_VALUE, LAST_VALUE, NTH_VALUE

파티션 내에서 **특정 위치의 값**을 가져옵니다.

```sql
-- 부서 내 최고/최저 급여자의 이름
SELECT
    department, name, salary,
    FIRST_VALUE(name) OVER (
        PARTITION BY department ORDER BY salary DESC
    ) AS highest_earner,
    LAST_VALUE(name) OVER (
        PARTITION BY department ORDER BY salary DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) AS lowest_earner
FROM employees;
```

| 함수 | 설명 | 프레임 주의사항 |
|------|------|---------------|
| FIRST_VALUE | 프레임 내 첫 번째 값 | 기본 프레임으로 충분 |
| LAST_VALUE | 프레임 내 마지막 값 | UNBOUNDED FOLLOWING 필요! |
| NTH_VALUE | 프레임 내 N번째 값 | UNBOUNDED FOLLOWING 필요 |

> **핵심 직관**: LAST_VALUE는 기본 프레임이 "현재 행까지"이므로, 항상 현재 행 자신을 반환합니다. 파티션 전체의 마지막 값을 원하면 반드시 `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`을 명시해야 합니다.

## 4. ROWS vs RANGE 프레임

sql-01에서 기본을 다뤘다면, 여기서는 ROWS와 RANGE의 **결정적 차이**를 다룹니다.

```
ROWS vs RANGE 차이:

  ROWS:  물리적 행 단위 (정확히 N행 앞/뒤)
  RANGE: 논리적 값 단위 (ORDER BY 값 기준 범위)

  ORDER BY date 일 때:
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  → 현재 행 포함 3개 행 (날짜 갭 무시)

  RANGE BETWEEN INTERVAL '2 days' PRECEDING AND CURRENT ROW
  → 현재 날짜 - 2일 범위의 모든 행 (행 수 가변)
```

```sql
-- ROWS: 정확히 이전 2행 (물리적)
SELECT date, revenue,
    AVG(revenue) OVER (
        ORDER BY date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
    ) AS rows_avg
FROM daily_sales;

-- RANGE: 값 범위 기준 (논리적) — PostgreSQL
SELECT date, revenue,
    AVG(revenue) OVER (
        ORDER BY date RANGE BETWEEN
        INTERVAL '2 days' PRECEDING AND CURRENT ROW
    ) AS range_avg
FROM daily_sales;
```

| 상황 | ROWS 사용 | RANGE 사용 |
|------|----------|-----------|
| 날짜 갭 없는 연속 데이터 | 동일 결과 | 동일 결과 |
| 날짜 갭 있는 데이터 | 갭 무시, 3행 평균 | 2일 범위 내만 평균 |
| 동점값 존재 | 각 행 개별 처리 | 동점 행 모두 포함 |

## 5. 복합 Window Functions 패턴

여러 Window Functions를 조합하면 강력한 분석이 가능합니다.

```sql
-- 매출 성장률 + 순위 + 누적 점유율 (종합 분석)
SELECT
    product, revenue,
    -- 전월 대비 성장률
    ROUND(100.0 * (revenue - LAG(revenue) OVER w) /
          NULLIF(LAG(revenue) OVER w, 0), 1) AS mom_growth,
    -- 매출 순위
    RANK() OVER (ORDER BY revenue DESC) AS revenue_rank,
    -- 누적 매출 점유율
    ROUND(100.0 * SUM(revenue) OVER (ORDER BY revenue DESC) /
          SUM(revenue) OVER (), 1) AS cumulative_pct
FROM product_monthly
WINDOW w AS (PARTITION BY product ORDER BY month);
-- WINDOW 절로 반복 정의를 줄일 수 있음
```

```
WINDOW 절 (Named Window):

  여러 Window Functions가 같은 OVER 절을 공유할 때:

  -- 중복 코드 (비효율)
  SELECT LAG(x) OVER (PARTITION BY a ORDER BY b),
         LEAD(x) OVER (PARTITION BY a ORDER BY b) ...

  -- WINDOW 절로 간결하게
  SELECT LAG(x) OVER w, LEAD(x) OVER w ...
  WINDOW w AS (PARTITION BY a ORDER BY b)
```

## 6. 실전: 연속 로그인 일수 계산

```sql
-- 사용자별 현재 연속 로그인 일수 (Gaps and Islands 변형)
WITH login_ranked AS (
    SELECT
        user_id, login_date,
        login_date - INTERVAL '1 day' *
            ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date)
            AS group_key
    FROM user_logins
),
streaks AS (
    SELECT user_id, group_key,
        COUNT(*) AS streak_length,
        MAX(login_date) AS last_date
    FROM login_ranked
    GROUP BY user_id, group_key
)
SELECT user_id, streak_length
FROM streaks
WHERE last_date = CURRENT_DATE
ORDER BY streak_length DESC;
```

이 강의의 LEAD/LAG, NTILE, 프레임 제어는 sql-09의 분석 쿼리 패턴에서 실전 분석 시나리오에 바로 적용됩니다.

## 핵심 정리

- **LEAD/LAG**는 self join 없이 이전/다음 행의 값을 참조하며, 시계열 비교(전일 대비, 전년 동기)에 필수입니다
- **NTILE(N)**은 결과를 N개 동일 버킷으로 분할하여, 분위 분석과 고객 세그멘테이션에 활용합니다
- **LAST_VALUE**는 기본 프레임 함정이 있으므로 반드시 `UNBOUNDED FOLLOWING`을 명시해야 합니다
- **ROWS는 물리적 행, RANGE는 논리적 값** 범위이며, 날짜 갭이 있는 데이터에서 결과가 달라집니다
- **WINDOW 절**로 반복되는 OVER 정의를 한 곳에서 관리하면 가독성과 유지보수성이 향상됩니다

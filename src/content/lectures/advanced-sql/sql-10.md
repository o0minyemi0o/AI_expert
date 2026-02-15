# 실전 SQL 문제 풀이

## 왜 실전 문제 풀이가 중요한가

sql-01~09에서 배운 기법들을 **종합적으로 적용**하는 능력을 키우는 것이 이 강의의 목표입니다. 면접에서 출제되는 SQL 문제는 단일 기법이 아니라 여러 기법의 조합을 요구합니다. 문제를 보고 어떤 패턴을 적용할지 빠르게 판단하는 것이 핵심입니다.

> **핵심 직관**: SQL 면접 문제의 80%는 Window Functions + CTE + 조인 패턴의 조합입니다. 문제를 읽고 "이것은 Top-N 문제다", "이것은 Gaps and Islands다"라고 분류할 수 있으면 풀이가 자동으로 따라옵니다.

## 1. 연속 일수 문제 (Gaps and Islands)

**문제**: 각 사용자의 최장 연속 로그인 일수를 구하시오.

```sql
-- 핵심 아이디어: 날짜 - ROW_NUMBER = 그룹 키
WITH numbered AS (
    SELECT DISTINCT user_id, login_date,
        login_date - (ROW_NUMBER() OVER (
            PARTITION BY user_id ORDER BY login_date
        ))::int AS group_key
    FROM logins
),
streaks AS (
    SELECT user_id, group_key,
        COUNT(*) AS streak_days,
        MIN(login_date) AS start_date,
        MAX(login_date) AS end_date
    FROM numbered
    GROUP BY user_id, group_key
)
SELECT user_id, MAX(streak_days) AS max_streak
FROM streaks
GROUP BY user_id
ORDER BY max_streak DESC;
```

```
Gaps and Islands 원리:

  날짜      ROW_NUMBER   날짜 - RN = 그룹키
  1/1       1            12/31  ← 같은 그룹
  1/2       2            12/31  ← 같은 그룹
  1/3       3            12/31  ← 같은 그룹 (연속 3일)
  1/5       4            1/1    ← 새 그룹 (1/4 빠짐)
  1/6       5            1/1    ← 같은 그룹 (연속 2일)
```

## 2. 누적 합계와 조건 리셋

**문제**: 재고가 0 이하가 되면 리셋하는 누적 재고 계산.

```sql
-- 순서대로 입출고를 반영하되, 음수가 되면 0으로 리셋
WITH ordered AS (
    SELECT *, ROW_NUMBER() OVER (ORDER BY txn_date) AS rn
    FROM inventory_txns
)
SELECT txn_date, quantity,
    GREATEST(0, SUM(quantity) OVER (ORDER BY rn)) AS running_stock
FROM ordered;
-- 주의: 단순 SUM OVER는 음수 허용. GREATEST로 0 하한 적용.
-- 완전한 리셋은 재귀 CTE 필요 (고급)
```

## 3. 중앙값 계산

**문제**: 부서별 급여 중앙값을 구하시오.

```sql
-- 방법 1: PERCENTILE_CONT (PostgreSQL, 가장 간단)
SELECT department,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median_salary
FROM employees
GROUP BY department;

-- 방법 2: Window Function (범용)
WITH ranked AS (
    SELECT department, salary,
        ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary) AS rn,
        COUNT(*) OVER (PARTITION BY department) AS cnt
    FROM employees
)
SELECT department,
    AVG(salary) AS median_salary  -- 짝수일 때 평균
FROM ranked
WHERE rn IN (FLOOR((cnt + 1) / 2.0), CEIL((cnt + 1) / 2.0))
GROUP BY department;
```

> **핵심 직관**: 중앙값 계산은 면접 빈출 문제입니다. PERCENTILE_CONT가 있는 DB에서는 한 줄로 끝나지만, 없는 DB에서는 ROW_NUMBER + COUNT 조합으로 구현해야 합니다. 두 방법 모두 알아두세요.

## 4. 피벗 + 비교 문제

**문제**: 각 제품의 월별 매출과 전월 대비 성장률을 피벗 형태로 표시하시오.

```sql
WITH monthly AS (
    SELECT
        product,
        DATE_TRUNC('month', order_date) AS month,
        SUM(amount) AS revenue
    FROM orders
    GROUP BY product, month
),
with_growth AS (
    SELECT
        product, month, revenue,
        LAG(revenue) OVER (PARTITION BY product ORDER BY month) AS prev_revenue,
        ROUND(100.0 * (revenue - LAG(revenue) OVER (
            PARTITION BY product ORDER BY month
        )) / NULLIF(LAG(revenue) OVER (
            PARTITION BY product ORDER BY month
        ), 0), 1) AS growth_pct
    FROM monthly
)
SELECT
    product,
    MAX(CASE WHEN EXTRACT(MONTH FROM month) = 1 THEN revenue END) AS jan,
    MAX(CASE WHEN EXTRACT(MONTH FROM month) = 2 THEN revenue END) AS feb,
    MAX(CASE WHEN EXTRACT(MONTH FROM month) = 3 THEN revenue END) AS mar
FROM with_growth
GROUP BY product;
```

## 5. 성능 튜닝 시나리오

**문제**: 다음 쿼리가 30초 걸립니다. 원인과 개선 방안을 제시하시오.

```sql
-- 느린 쿼리
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE LOWER(u.email) LIKE '%@gmail.com'
  AND o.created_at > NOW() - INTERVAL '30 days'
GROUP BY u.name
HAVING COUNT(o.id) > 5
ORDER BY order_count DESC;
```

```
문제점 분석:

  1. LOWER(u.email) → 함수 적용으로 인덱스 무효 (sql-08)
     → 해결: 함수 인덱스 CREATE INDEX ON users (LOWER(email))
             또는 ILIKE '%@gmail.com' + pg_trgm GIN 인덱스

  2. LIKE '%@gmail.com' → 선행 와일드카드로 인덱스 사용 불가
     → 해결: email LIKE '%@gmail.com' → 역순 인덱스
             또는 도메인 컬럼 별도 저장

  3. LEFT JOIN + WHERE o.created_at → LEFT가 INNER로 변환됨
     → 의도 확인: LEFT JOIN이 정말 필요한지?
     → 필요하다면: AND 조건을 ON 절로 이동

  4. ORDER BY + GROUP BY → 정렬 + 집계 이중 비용
     → order_count에 대한 정렬은 불가피, 인덱스 불가
```

> **핵심 직관**: LEFT JOIN + WHERE 조건은 가장 흔한 실수입니다. WHERE 절에서 오른쪽 테이블의 컬럼을 필터링하면 LEFT JOIN이 실질적으로 INNER JOIN이 됩니다. NULL인 행이 WHERE에서 제거되기 때문입니다.

## 6. SQL 면접 팁

```
SQL 면접 접근 전략:

  1. 문제 분류
     ├─ 순위/Top-N → Window Functions (sql-01)
     ├─ 시간축 비교 → LEAD/LAG (sql-02)
     ├─ 계층 탐색 → 재귀 CTE (sql-03)
     ├─ 존재/불일치 → EXISTS/Anti Join (sql-04, sql-06)
     ├─ 연속/갭 → Gaps and Islands (이 강의)
     └─ 집계/리포트 → GROUPING SETS (sql-05)

  2. 쿼리 작성 순서
     FROM → WHERE → GROUP BY → SELECT → ORDER BY
     (실행 순서대로 생각)

  3. 엣지 케이스 체크
     ├─ NULL 값 처리
     ├─ 중복 행 존재 시
     ├─ 빈 결과 (0건)
     └─ 동점(tie) 처리

  4. 최적화 언급
     "이 쿼리는 O(n log n)이며, customer_id에
      인덱스가 있으면 더 효율적입니다"
```

이 과정(advanced-sql)은 dbi(database-internals)에서 DB 내부 동작을 배우고, dp(data-pipelines)에서 대규모 파이프라인을 설계하는 기초가 됩니다.

## 핵심 정리

- **Gaps and Islands**(날짜 - ROW_NUMBER = 그룹키)는 연속 일수, 세션 분석 등의 핵심 패턴입니다
- **중앙값 계산**은 PERCENTILE_CONT(간편)와 ROW_NUMBER+COUNT(범용) 두 방법을 모두 알아야 합니다
- **LEFT JOIN + WHERE**에서 오른쪽 테이블 조건을 WHERE에 넣으면 INNER JOIN으로 변환되는 함정에 주의합니다
- SQL 면접은 **문제 분류 → 패턴 매핑 → 구현** 순서로 접근하며, sql-01~09의 패턴이 직접 활용됩니다
- 쿼리 최적화를 자발적으로 언급하면(인덱스, 복잡도 분석) **시니어 수준의 평가**를 받을 수 있습니다

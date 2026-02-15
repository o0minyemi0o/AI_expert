# 집합 연산과 피봇

## 왜 집합 연산과 피봇이 중요한가

데이터 분석에서 여러 결과를 합치거나, 행/열을 전환하거나, 다차원 집계를 수행하는 것은 일상적인 작업입니다. **UNION, PIVOT, GROUPING SETS**는 이런 작업을 SQL 레벨에서 효율적으로 처리하는 도구입니다. 특히 GROUPING SETS/CUBE/ROLLUP은 한 번의 쿼리로 여러 수준의 집계를 동시에 생성합니다.

> **핵심 직관**: GROUPING SETS는 "여러 GROUP BY를 UNION ALL로 합치는 것"의 최적화된 버전입니다. 데이터를 한 번만 스캔하면서 다중 수준 집계를 생성합니다.

## 1. 집합 연산

```sql
-- UNION: 두 쿼리 결과 합치기 (중복 제거)
SELECT name FROM employees_kr
UNION
SELECT name FROM employees_us;

-- UNION ALL: 중복 유지 (더 빠름)
SELECT name FROM employees_kr
UNION ALL
SELECT name FROM employees_us;

-- INTERSECT: 교집합
SELECT customer_id FROM orders_2023
INTERSECT
SELECT customer_id FROM orders_2024;  -- 두 해 모두 주문한 고객

-- EXCEPT (MINUS): 차집합
SELECT customer_id FROM orders_2023
EXCEPT
SELECT customer_id FROM orders_2024;  -- 2023엔 주문했지만 2024엔 안 한 고객
```

| 연산 | 중복 처리 | 용도 |
|------|----------|------|
| UNION | 제거 | 합집합 (고유값) |
| UNION ALL | 유지 | 합집합 (전체, 빠름) |
| INTERSECT | 제거 | 교집합 |
| EXCEPT | 제거 | 차집합 (A - B) |

> **핵심 직관**: UNION은 내부적으로 정렬/해싱으로 중복을 제거하므로 UNION ALL보다 느립니다. 중복이 없다고 확신하거나 중복을 허용한다면 반드시 UNION ALL을 사용하세요.

## 2. PIVOT (행 → 열 전환)

표준 SQL에는 PIVOT 키워드가 없지만, **CASE WHEN + 집계**로 구현할 수 있습니다.

```sql
-- 원본 데이터 (행 형태)
-- sales(product, quarter, revenue)
-- | 노트북 | Q1 | 100 |
-- | 노트북 | Q2 | 150 |
-- | 태블릿 | Q1 |  80 |
-- | 태블릿 | Q2 | 120 |

-- PIVOT: 분기를 열로 전환
SELECT
    product,
    SUM(CASE WHEN quarter = 'Q1' THEN revenue END) AS q1,
    SUM(CASE WHEN quarter = 'Q2' THEN revenue END) AS q2,
    SUM(CASE WHEN quarter = 'Q3' THEN revenue END) AS q3,
    SUM(CASE WHEN quarter = 'Q4' THEN revenue END) AS q4
FROM sales
GROUP BY product;
```

```
PIVOT 결과:
  product  | q1  | q2  | q3  | q4
  ---------+-----+-----+-----+-----
  노트북    | 100 | 150 | ... | ...
  태블릿    |  80 | 120 | ... | ...
```

## 3. UNPIVOT (열 → 행 전환)

PIVOT의 역연산으로, 넓은 테이블을 긴 테이블로 변환합니다.

```sql
-- UNPIVOT: UNION ALL 활용 (표준 SQL)
SELECT product, 'Q1' AS quarter, q1 AS revenue FROM quarterly_sales
UNION ALL
SELECT product, 'Q2', q2 FROM quarterly_sales
UNION ALL
SELECT product, 'Q3', q3 FROM quarterly_sales
UNION ALL
SELECT product, 'Q4', q4 FROM quarterly_sales;

-- PostgreSQL: LATERAL + VALUES로 더 간결하게
SELECT qs.product, t.quarter, t.revenue
FROM quarterly_sales qs
CROSS JOIN LATERAL (
    VALUES ('Q1', qs.q1), ('Q2', qs.q2), ('Q3', qs.q3), ('Q4', qs.q4)
) AS t(quarter, revenue);
```

## 4. GROUPING SETS

한 번의 쿼리로 **여러 GROUP BY 조합**을 실행합니다.

```sql
-- 전통적 방법: 3개의 GROUP BY를 UNION ALL
SELECT department, NULL AS region, SUM(salary) FROM employees GROUP BY department
UNION ALL
SELECT NULL, region, SUM(salary) FROM employees GROUP BY region
UNION ALL
SELECT NULL, NULL, SUM(salary) FROM employees;

-- GROUPING SETS: 한 번에 (데이터 1회 스캔)
SELECT department, region, SUM(salary) AS total_salary
FROM employees
GROUP BY GROUPING SETS (
    (department),    -- 부서별 합계
    (region),        -- 지역별 합계
    ()               -- 전체 합계
);
```

| department | region | total_salary |
|-----------|--------|-------------|
| 개발 | NULL | 25000 |
| 마케팅 | NULL | 18000 |
| NULL | 서울 | 30000 |
| NULL | 부산 | 13000 |
| NULL | NULL | 43000 |

## 5. CUBE와 ROLLUP

GROUPING SETS의 단축 표현입니다.

```
ROLLUP vs CUBE:

  ROLLUP(A, B, C) = GROUPING SETS (
      (A, B, C),   -- 상세
      (A, B),      -- 중간
      (A),         -- 상위
      ()           -- 전체
  )
  → 계층적 집계 (예: 연도 > 분기 > 월)

  CUBE(A, B) = GROUPING SETS (
      (A, B),      -- A×B 조합
      (A),         -- A별
      (B),         -- B별
      ()           -- 전체
  )
  → 모든 조합 집계 (2^N개)
```

```sql
-- ROLLUP: 연도 > 분기 > 월 계층 집계
SELECT
    year, quarter, month,
    SUM(revenue) AS total_revenue
FROM monthly_sales
GROUP BY ROLLUP(year, quarter, month);

-- CUBE: 제품 × 지역의 모든 조합
SELECT
    product, region,
    SUM(revenue) AS total_revenue
FROM sales
GROUP BY CUBE(product, region);
```

> **핵심 직관**: ROLLUP은 "상위 → 하위" 드릴다운 보고서에, CUBE는 "모든 차원 조합" 교차 분석에 적합합니다. 리포트 쿼리에서 한 번의 쿼리로 요약/소계/총계를 동시에 생성할 수 있습니다.

## 6. GROUPING 함수

GROUPING SETS에서 NULL이 "해당 없음"인지 "실제 NULL 데이터"인지 구분합니다.

```sql
SELECT
    CASE WHEN GROUPING(department) = 1 THEN '전체' ELSE department END AS dept,
    CASE WHEN GROUPING(region) = 1 THEN '전체' ELSE region END AS region,
    SUM(salary) AS total_salary
FROM employees
GROUP BY CUBE(department, region);
```

| dept | region | total_salary | 의미 |
|------|--------|-------------|------|
| 개발 | 서울 | 15000 | 개발+서울 |
| 개발 | 전체 | 25000 | 개발 전체 |
| 전체 | 서울 | 30000 | 서울 전체 |
| 전체 | 전체 | 43000 | 전사 합계 |

```
GROUPING() 반환값:
  0 → 이 컬럼이 GROUP BY에 포함됨 (실제 그룹핑)
  1 → 이 컬럼이 GROUP BY에서 제외됨 (집계 행)
```

집합 연산과 피봇은 sql-09의 분석 쿼리 패턴에서 리포트 생성의 핵심 도구로 활용됩니다.

## 핵심 정리

- **UNION ALL**은 UNION보다 빠르며, 중복이 없거나 허용할 때 기본으로 사용합니다
- **PIVOT**은 CASE WHEN + 집계로 구현하며, 행 형태의 데이터를 열로 전환하여 보고서를 만듭니다
- **GROUPING SETS**는 여러 GROUP BY를 한 번의 데이터 스캔으로 처리하여 성능과 가독성을 모두 높입니다
- **ROLLUP**은 계층적 드릴다운 보고서, **CUBE**는 모든 차원 교차 분석에 적합합니다
- **GROUPING()** 함수로 집계 행의 NULL과 실제 NULL 데이터를 구분할 수 있습니다

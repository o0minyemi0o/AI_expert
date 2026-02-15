# 서브쿼리와 상관 서브쿼리

## 왜 서브쿼리를 깊이 이해해야 하는가

서브쿼리는 SQL의 기본이지만, **상관 서브쿼리의 실행 모델**, **EXISTS vs IN의 성능 차이**, **서브쿼리 언네스팅** 같은 심화 주제를 이해해야 실무에서 효율적인 쿼리를 작성할 수 있습니다. 옵티마이저가 서브쿼리를 어떻게 변환하는지 아는 것이 sql-07의 실행 계획 분석의 기초가 됩니다.

> **핵심 직관**: 서브쿼리는 "쿼리 안의 쿼리"이지만, 실행 방식은 종류에 따라 전혀 다릅니다. 비상관은 1번 실행, 상관은 외부 행마다 반복 실행될 수 있습니다.

## 1. 서브쿼리 분류

```
서브쿼리 분류 체계:

  위치별:
  ├─ SELECT 절: 스칼라 서브쿼리 (단일 값 반환)
  ├─ FROM 절: 인라인 뷰 (테이블처럼 사용)
  └─ WHERE 절: 조건 서브쿼리 (필터링)

  상관성별:
  ├─ 비상관 (Non-correlated): 외부 쿼리와 독립, 1번 실행
  └─ 상관 (Correlated): 외부 행마다 반복 실행
```

```sql
-- 스칼라 서브쿼리 (SELECT 절)
SELECT name, salary,
    (SELECT AVG(salary) FROM employees) AS company_avg
FROM employees;

-- 인라인 뷰 (FROM 절)
SELECT dept, avg_sal
FROM (
    SELECT department AS dept, AVG(salary) AS avg_sal
    FROM employees GROUP BY department
) sub
WHERE avg_sal > 50000;

-- 조건 서브쿼리 (WHERE 절)
SELECT name FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
```

## 2. 상관 서브쿼리

상관 서브쿼리는 **외부 쿼리의 현재 행을 참조**합니다.

```sql
-- "부서 평균보다 급여가 높은 직원" (상관 서브쿼리)
SELECT e1.name, e1.department, e1.salary
FROM employees e1
WHERE e1.salary > (
    SELECT AVG(e2.salary)
    FROM employees e2
    WHERE e2.department = e1.department  -- 외부 행 참조!
);
```

```
상관 서브쿼리 실행 모델 (개념적):

  외부 쿼리의 각 행에 대해:
    1. 현재 행의 department 값을 가져옴
    2. 서브쿼리 실행: 해당 부서의 AVG(salary) 계산
    3. 비교 후 포함/제외 결정

  → 외부 행이 1000개면 서브쿼리가 1000번 실행 (개념적)
  → 실제로는 옵티마이저가 조인으로 변환할 수 있음
```

## 3. EXISTS vs IN

| 비교 | EXISTS | IN |
|------|--------|-----|
| 의미 | "존재하는가?" (boolean) | "포함되는가?" (값 목록) |
| NULL 처리 | 안전 | NOT IN에서 위험 |
| 단축 평가 | 첫 매칭에서 중단 | 전체 목록 확인 |
| 서브쿼리 크기 클 때 | 유리 | 불리할 수 있음 |
| 서브쿼리 크기 작을 때 | 비슷 | 비슷 or 유리 |

```sql
-- EXISTS: 하나라도 찾으면 즉시 TRUE
SELECT c.name
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o
    WHERE o.customer_id = c.id AND o.amount > 1000
);

-- IN: 서브쿼리 결과를 목록으로 비교
SELECT c.name
FROM customers c
WHERE c.id IN (
    SELECT customer_id FROM orders WHERE amount > 1000
);
```

> **핵심 직관**: 대부분의 현대 옵티마이저(PostgreSQL, MySQL 8.0+)는 EXISTS와 IN을 **동일한 실행 계획**으로 변환합니다. 하지만 NOT IN의 NULL 함정은 옵티마이저가 해결해주지 않으므로, Anti Join에서는 NOT EXISTS를 사용하세요.

## 4. 서브쿼리 언네스팅

옵티마이저는 서브쿼리를 **조인으로 변환**(언네스팅)하여 성능을 개선합니다.

```sql
-- 원본 (상관 서브쿼리)
SELECT e.name, e.salary
FROM employees e
WHERE e.salary > (
    SELECT AVG(salary) FROM employees WHERE department = e.department
);

-- 옵티마이저가 변환한 형태 (조인)
SELECT e.name, e.salary
FROM employees e
JOIN (
    SELECT department, AVG(salary) AS avg_sal
    FROM employees GROUP BY department
) d ON e.department = d.department
WHERE e.salary > d.avg_sal;
```

```
언네스팅이 불가능한 경우:

  1. LIMIT이 포함된 상관 서브쿼리
  2. 집합 연산 (UNION)이 포함된 서브쿼리
  3. 일부 집계 + HAVING 조합

  → 이 경우 실제로 행마다 반복 실행됨
  → 성능 문제 발생 가능 → 수동으로 조인으로 변환
```

## 5. 실전 패턴

```sql
-- 패턴 1: 최신 레코드 가져오기 (상관 서브쿼리)
SELECT *
FROM orders o1
WHERE o1.order_date = (
    SELECT MAX(o2.order_date)
    FROM orders o2
    WHERE o2.customer_id = o1.customer_id
);

-- 패턴 2: 동일 문제를 Window Function으로 (더 효율적)
WITH latest AS (
    SELECT *, ROW_NUMBER() OVER (
        PARTITION BY customer_id ORDER BY order_date DESC
    ) AS rn
    FROM orders
)
SELECT * FROM latest WHERE rn = 1;

-- 패턴 3: 스칼라 서브쿼리로 비율 계산
SELECT
    department,
    COUNT(*) AS dept_count,
    ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM employees), 1) AS pct
FROM employees
GROUP BY department;
```

| 패턴 | 서브쿼리 방식 | 대안 |
|------|-------------|------|
| 그룹 내 최신 | 상관 서브쿼리 (MAX) | Window Function |
| 전체 대비 비율 | 스칼라 서브쿼리 | Window Function (SUM OVER) |
| 존재 여부 필터 | EXISTS | Semi Join |
| 불일치 필터 | NOT EXISTS | Anti Join (sql-04) |

> **핵심 직관**: 상관 서브쿼리로 해결 가능한 문제의 대부분은 **Window Function이나 조인으로 더 효율적**으로 해결할 수 있습니다. 상관 서브쿼리는 "마지막 수단"으로 남겨두세요.

## 6. ANY, ALL, SOME

```sql
-- ANY (= SOME): 하나라도 만족하면 TRUE
SELECT name FROM employees
WHERE salary > ANY (SELECT salary FROM employees WHERE department = '인턴');
-- 인턴 중 누구보다든 급여가 높으면 → 사실상 MIN보다 큰

-- ALL: 모두 만족해야 TRUE
SELECT name FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE department = '인턴');
-- 모든 인턴보다 급여가 높으면 → 사실상 MAX보다 큰
```

| 연산자 | 의미 | 동치 표현 |
|--------|------|----------|
| > ANY | 하나라도 크면 | > MIN(서브쿼리) |
| > ALL | 모두보다 크면 | > MAX(서브쿼리) |
| = ANY | 하나라도 같으면 | IN |
| <> ALL | 모두와 다르면 | NOT IN |

서브쿼리의 실행 방식을 이해하면 sql-07의 쿼리 실행 계획을 분석할 때 옵티마이저의 선택을 해석할 수 있습니다.

## 핵심 정리

- 서브쿼리는 **위치**(SELECT/FROM/WHERE)와 **상관성**(비상관/상관)으로 분류되며, 실행 방식이 다릅니다
- **상관 서브쿼리**는 개념적으로 외부 행마다 실행되지만, 옵티마이저가 조인으로 변환(언네스팅)할 수 있습니다
- **NOT IN**은 NULL이 있으면 빈 결과를 반환하므로, Anti Join에서는 NOT EXISTS가 안전합니다
- 상관 서브쿼리로 해결 가능한 대부분의 문제는 **Window Function이나 조인으로 더 효율적**으로 해결됩니다
- **ANY/ALL** 연산자는 MIN/MAX와 동치이며, 가독성을 위해 상황에 맞게 선택합니다

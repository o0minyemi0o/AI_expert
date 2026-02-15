# Common Table Expressions

## 왜 CTE가 중요한가

복잡한 SQL 쿼리는 서브쿼리가 중첩되면 읽기 어렵고 유지보수가 힘들어집니다. CTE(Common Table Expression)는 **임시 결과 집합에 이름을 부여**하여 쿼리를 단계별로 분해합니다. 특히 재귀 CTE는 계층 데이터 탐색이라는, 일반 SQL로는 불가능한 문제를 해결합니다.

> **핵심 직관**: CTE는 "SQL의 변수 선언"과 같습니다. 복잡한 계산에 이름을 붙여 재사용하면, 쿼리가 코드처럼 읽히게 됩니다.

## 1. 기본 CTE 문법

```sql
-- CTE 기본 구조
WITH cte_name AS (
    SELECT ... FROM ... WHERE ...
)
SELECT * FROM cte_name;

-- 여러 CTE를 체이닝
WITH
    step1 AS (SELECT ... FROM ...),
    step2 AS (SELECT ... FROM step1),
    step3 AS (SELECT ... FROM step2 JOIN ...)
SELECT * FROM step3;
```

```sql
-- 실전 예시: 부서별 평균 급여보다 높은 직원 조회
WITH dept_avg AS (
    SELECT department, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department
)
SELECT e.name, e.department, e.salary, d.avg_salary
FROM employees e
JOIN dept_avg d ON e.department = d.department
WHERE e.salary > d.avg_salary;
```

## 2. CTE vs 서브쿼리 vs 임시 테이블

| 특성 | CTE | 서브쿼리 | 임시 테이블 |
|------|-----|---------|-----------|
| 가독성 | 높음 (이름 부여) | 낮음 (중첩) | 중간 |
| 재사용 | 같은 쿼리 내 여러 번 | 불가 | 세션 내 |
| 성능 | 인라인 or 물리화 | 인라인 | 물리화 (디스크) |
| 인덱스 | 불가 | 불가 | 가능 |
| 재귀 | 가능 | 불가 | 불가 |

```
언제 무엇을 쓸 것인가:

  쿼리 내 1회 사용, 간단 → 서브쿼리
  쿼리 내 재사용 or 가독성 → CTE
  재귀 탐색 필요 → 재귀 CTE (유일한 선택)
  대용량 중간 결과 반복 사용 → 임시 테이블 (인덱스 가능)
```

> **핵심 직관**: 대부분의 DB에서 CTE는 서브쿼리와 동일하게 최적화됩니다(인라인). 하지만 PostgreSQL 12 이전에서는 CTE가 항상 물리화(materialized)되어 성능 차이가 있었습니다. MATERIALIZED/NOT MATERIALIZED 힌트로 제어할 수 있습니다.

## 3. 재귀 CTE

재귀 CTE는 **자기 자신을 참조**하여 계층/그래프 구조를 탐색합니다.

```sql
-- 재귀 CTE 구조
WITH RECURSIVE cte AS (
    -- 기저 조건 (Base Case): 시작점
    SELECT ... WHERE ...
    UNION ALL
    -- 재귀 단계 (Recursive Step): CTE 자신을 참조
    SELECT ... FROM cte JOIN ...
)
SELECT * FROM cte;
```

```
재귀 CTE 실행 과정:

  1회차: Base Case 실행 → 결과 R₁
  2회차: R₁을 입력으로 Recursive Step → 결과 R₂
  3회차: R₂를 입력으로 Recursive Step → 결과 R₃
  ...
  N회차: 빈 결과 반환 → 종료

  최종 결과 = R₁ ∪ R₂ ∪ R₃ ∪ ... ∪ Rₙ
```

## 4. 실전: 조직도 탐색

```sql
-- 조직 계층 구조 테이블
-- employees(id, name, manager_id)

-- 특정 매니저의 모든 하위 직원 조회 (재귀)
WITH RECURSIVE org_tree AS (
    -- 기저: 최상위 매니저
    SELECT id, name, manager_id, 1 AS depth, name AS path
    FROM employees
    WHERE id = 1  -- CEO

    UNION ALL

    -- 재귀: 부하 직원 탐색
    SELECT e.id, e.name, e.manager_id, t.depth + 1,
           t.path || ' > ' || e.name
    FROM employees e
    JOIN org_tree t ON e.manager_id = t.id
)
SELECT depth, path, name
FROM org_tree
ORDER BY path;
```

```
결과:
  depth | path                        | name
  ------+-----------------------------+-------
  1     | CEO김                       | CEO김
  2     | CEO김 > VP이                | VP이
  3     | CEO김 > VP이 > 팀장박       | 팀장박
  4     | CEO김 > VP이 > 팀장박 > 개발자정 | 개발자정
  2     | CEO김 > VP최                | VP최
```

## 5. 재귀 CTE 응용: 그래프 탐색

```sql
-- 방향 그래프에서 경로 탐색
-- edges(from_node, to_node, weight)

WITH RECURSIVE paths AS (
    -- 기저: 시작 노드
    SELECT from_node, to_node, weight,
           ARRAY[from_node, to_node] AS path,
           weight AS total_weight
    FROM edges
    WHERE from_node = 'A'

    UNION ALL

    -- 재귀: 다음 노드로 이동 (사이클 방지!)
    SELECT e.from_node, e.to_node, e.weight,
           p.path || e.to_node,
           p.total_weight + e.weight
    FROM edges e
    JOIN paths p ON e.from_node = p.to_node
    WHERE NOT e.to_node = ANY(p.path)  -- 사이클 방지
)
SELECT path, total_weight
FROM paths
WHERE to_node = 'D'  -- 도착 노드
ORDER BY total_weight;
```

> **핵심 직관**: 재귀 CTE에서 **사이클 방지**를 잊으면 무한 루프에 빠집니다. 방문한 노드를 ARRAY에 저장하고 `NOT ... = ANY(path)` 조건으로 체크하는 패턴을 반드시 기억하세요.

## 6. 재귀 CTE 활용 패턴

```sql
-- 패턴 1: 숫자 시퀀스 생성
WITH RECURSIVE numbers AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 100
)
SELECT n FROM numbers;

-- 패턴 2: 날짜 범위 생성
WITH RECURSIVE dates AS (
    SELECT DATE '2024-01-01' AS d
    UNION ALL
    SELECT d + INTERVAL '1 day' FROM dates
    WHERE d < DATE '2024-12-31'
)
SELECT d FROM dates;

-- 패턴 3: BOM(Bill of Materials) 전개
WITH RECURSIVE bom AS (
    SELECT part_id, component_id, quantity, 1 AS level
    FROM bill_of_materials WHERE part_id = 'PRODUCT_A'
    UNION ALL
    SELECT b.part_id, b.component_id, b.quantity * bom.quantity, level + 1
    FROM bill_of_materials b
    JOIN bom ON b.part_id = bom.component_id
)
SELECT component_id, SUM(quantity) AS total_needed
FROM bom GROUP BY component_id;
```

| 패턴 | 사용 사례 | 주의사항 |
|------|----------|---------|
| 시퀀스 생성 | 날짜 범위, 숫자열 | 종료 조건 필수 |
| 계층 탐색 | 조직도, 카테고리 | 사이클 방지 |
| 그래프 경로 | 네트워크, 의존성 | 방문 노드 추적 |
| BOM 전개 | 부품 구성, 비용 집계 | 수량 누적 곱셈 |

CTE는 sql-09의 코호트/퍼널 분석에서 복잡한 분석 쿼리를 구조화하는 핵심 도구로 활용됩니다.

## 핵심 정리

- CTE는 임시 결과에 **이름을 부여**하여 복잡한 쿼리를 단계별로 분해하고 가독성을 높입니다
- 재귀 CTE는 **기저 조건(UNION ALL)재귀 단계**로 구성되며, 계층/그래프 탐색에 유일한 SQL 솔루션입니다
- 재귀 탐색 시 **사이클 방지**(ARRAY에 방문 노드 추적)를 반드시 포함해야 무한 루프를 막습니다
- CTE는 대부분의 DB에서 서브쿼리와 **동일하게 최적화**되지만, 대용량 재사용 시 임시 테이블이 나을 수 있습니다
- 날짜 시퀀스 생성, 조직도 탐색, BOM 전개 등 **재귀 패턴**을 외워두면 면접에서 즉시 활용할 수 있습니다

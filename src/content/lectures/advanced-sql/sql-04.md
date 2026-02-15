# 고급 조인 패턴

## 왜 고급 조인 패턴이 중요한가

기본적인 INNER/LEFT/RIGHT JOIN만으로는 해결하기 어려운 문제들이 있습니다. "그룹별 Top-N", "존재하지 않는 데이터 찾기", "자기 자신과의 비교" 등은 **LATERAL JOIN, Anti Join, Self Join** 같은 고급 패턴이 필요합니다. 이 패턴들을 알면 복잡한 문제를 서브쿼리 중첩 없이 깔끔하게 해결할 수 있습니다.

> **핵심 직관**: 고급 조인의 핵심은 "어떤 행을 포함/제외할 것인가"를 조인 조건으로 표현하는 것입니다. EXISTS, NOT EXISTS, LATERAL은 이를 위한 강력한 도구입니다.

## 1. LATERAL JOIN (CROSS APPLY)

LATERAL JOIN은 **왼쪽 테이블의 각 행을 오른쪽 서브쿼리에서 참조**할 수 있게 합니다. 일반 조인에서는 불가능한 "행별 서브쿼리 실행"이 가능합니다.

```sql
-- 부서별 급여 Top-3 직원 (LATERAL JOIN)
SELECT d.name AS dept, e.name, e.salary
FROM departments d
CROSS JOIN LATERAL (
    SELECT name, salary
    FROM employees
    WHERE department_id = d.id    -- 왼쪽 테이블 참조!
    ORDER BY salary DESC
    LIMIT 3
) e;
```

```
일반 JOIN vs LATERAL JOIN:

  일반 JOIN:
  └─ 오른쪽 테이블은 독립적 (왼쪽 참조 불가)

  LATERAL JOIN:
  └─ 오른쪽 서브쿼리가 왼쪽의 각 행을 참조 가능
     → "각 행에 대해 서브쿼리를 실행"하는 효과
     → SQL Server에서는 CROSS APPLY / OUTER APPLY
```

```sql
-- 동일 결과를 Window Function으로 (비교)
WITH ranked AS (
    SELECT d.name AS dept, e.name, e.salary,
        ROW_NUMBER() OVER (PARTITION BY e.department_id ORDER BY e.salary DESC) AS rn
    FROM employees e JOIN departments d ON e.department_id = d.id
)
SELECT dept, name, salary FROM ranked WHERE rn <= 3;
```

| 접근법 | 장점 | 단점 |
|--------|------|------|
| LATERAL JOIN | LIMIT 사용 가능, 직관적 | DB 호환성 |
| Window Function | 범용적, 표준 SQL | 전체 정렬 필요 |

## 2. Self Join

Self Join은 **같은 테이블을 두 번 참조**하여 행 간 비교를 수행합니다.

```sql
-- 같은 부서에서 자신보다 급여가 높은 동료 찾기
SELECT e1.name AS employee, e2.name AS higher_paid_colleague,
       e2.salary - e1.salary AS salary_diff
FROM employees e1
JOIN employees e2
    ON e1.department_id = e2.department_id
    AND e2.salary > e1.salary;

-- 매니저와 직원 정보를 함께 표시
SELECT
    e.name AS employee,
    m.name AS manager,
    e.salary AS emp_salary,
    m.salary AS mgr_salary
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

```
Self Join 활용 패턴:

  1. 계층 관계: 직원-매니저 (manager_id → id)
  2. 행 간 비교: 동일 그룹 내 대소 비교
  3. 쌍 생성: 가능한 모든 조합 (CROSS JOIN self)
  4. 이전/다음 행: LAG/LEAD 대안 (구형 DB)
```

## 3. Anti Join (불일치 찾기)

"A에는 있지만 B에는 없는" 데이터를 찾는 패턴입니다.

```sql
-- 방법 1: LEFT JOIN + IS NULL (가장 일반적)
SELECT c.id, c.name
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.id IS NULL;  -- 주문이 없는 고객

-- 방법 2: NOT EXISTS (의미적으로 명확)
SELECT c.id, c.name
FROM customers c
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.id
);

-- 방법 3: NOT IN (NULL 주의!)
SELECT id, name
FROM customers
WHERE id NOT IN (SELECT customer_id FROM orders WHERE customer_id IS NOT NULL);
-- ⚠️ 서브쿼리에 NULL이 있으면 전체가 빈 결과!
```

| 방법 | 성능 | NULL 안전 | 가독성 |
|------|------|----------|--------|
| LEFT JOIN + IS NULL | 좋음 | 안전 | 중간 |
| NOT EXISTS | 좋음 | 안전 | 높음 |
| NOT IN | 나쁠 수 있음 | **위험** | 높음 |

> **핵심 직관**: NOT IN은 서브쿼리 결과에 NULL이 하나라도 있으면 **전체 결과가 빈 집합**이 됩니다. 실무에서는 NOT EXISTS를 기본으로 사용하는 것이 안전합니다.

## 4. Semi Join (존재 확인)

"B에 매칭되는 A만 가져오되, B의 데이터는 필요 없는" 패턴입니다.

```sql
-- 주문 이력이 있는 고객만 (Semi Join)
-- 방법 1: EXISTS (권장)
SELECT c.id, c.name
FROM customers c
WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.customer_id = c.id
);

-- 방법 2: IN
SELECT id, name
FROM customers
WHERE id IN (SELECT customer_id FROM orders);

-- ❌ 잘못된 접근: INNER JOIN (중복 발생!)
-- 고객이 3건 주문했으면 3행으로 불어남
SELECT DISTINCT c.id, c.name
FROM customers c
JOIN orders o ON c.id = o.customer_id;
-- DISTINCT로 해결은 가능하지만 비효율적
```

## 5. 갭 찾기와 구간 겹침

```sql
-- 갭 찾기: 빠진 번호 찾기
SELECT prev_id + 1 AS gap_start, curr_id - 1 AS gap_end
FROM (
    SELECT
        id AS curr_id,
        LAG(id) OVER (ORDER BY id) AS prev_id
    FROM sequence_table
) t
WHERE curr_id - prev_id > 1;

-- 구간 겹침 찾기: 예약 시간 충돌
SELECT a.booking_id, b.booking_id AS conflict_with
FROM bookings a
JOIN bookings b
    ON a.room_id = b.room_id
    AND a.booking_id < b.booking_id        -- 자기 자신 제외 + 중복 방지
    AND a.start_time < b.end_time          -- 겹침 조건
    AND a.end_time > b.start_time;
```

```
구간 겹침 조건 (핵심 공식):

  A: [start_a, end_a)
  B: [start_b, end_b)

  겹침 ⟺ start_a < end_b AND end_a > start_b

  ┌───A───┐
      ┌───B───┐     → 겹침
  ┌───A───┐
              ┌───B───┐  → 안 겹침
```

> **핵심 직관**: 구간 겹침 조건 `A.start < B.end AND A.end > B.start`는 범용적입니다. 예약 충돌, 시간대 겹침, 재고 기간 중복 등 다양한 문제에 적용됩니다.

## 6. 조인 전략 선택 가이드

```
문제 유형별 조인 패턴 선택:

  "A에 있고 B에도 있는"  → INNER JOIN or Semi Join (EXISTS)
  "A에 있고 B에 없는"    → Anti Join (NOT EXISTS or LEFT JOIN + NULL)
  "그룹별 Top-N"         → LATERAL JOIN or Window Function
  "자기 자신과 비교"      → Self Join
  "모든 조합 생성"        → CROSS JOIN
  "구간 겹침 찾기"        → Self Join + 겹침 조건
```

고급 조인 패턴은 sql-09의 분석 쿼리와 sql-10의 면접 문제에서 핵심적으로 활용됩니다.

## 핵심 정리

- **LATERAL JOIN**은 왼쪽 테이블의 각 행을 서브쿼리에서 참조할 수 있어, "그룹별 Top-N"을 LIMIT으로 간결하게 해결합니다
- **Anti Join**(LEFT JOIN+NULL 또는 NOT EXISTS)은 "A에 있고 B에 없는" 데이터를 찾으며, NOT IN은 NULL 위험이 있습니다
- **Semi Join**(EXISTS)은 매칭 존재 여부만 확인하며, INNER JOIN과 달리 중복 행이 생기지 않습니다
- **Self Join**은 같은 테이블 내 행 간 비교(계층, 대소, 쌍)에 사용하며, 반드시 별칭을 구분합니다
- 구간 겹침은 `A.start < B.end AND A.end > B.start` 공식으로 판단하며, 예약/시간대 문제의 핵심입니다

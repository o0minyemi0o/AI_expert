# 쿼리 최적화 실전

## 왜 쿼리 최적화가 중요한가

sql-07에서 실행 계획을 읽는 법을 배웠다면, 이 강의에서는 **실제로 느린 쿼리를 진단하고 개선하는 실전 기법**을 다룹니다. 인덱스 전략, 파티셔닝, 쿼리 리라이트는 데이터 엔지니어와 백엔드 개발자의 핵심 역량이며, 면접에서 "10초 걸리는 쿼리를 어떻게 개선하겠습니까?"라는 질문에 체계적으로 답할 수 있어야 합니다.

> **핵심 직관**: 쿼리 최적화의 80%는 **올바른 인덱스 설계**로 해결됩니다. 나머지 20%는 쿼리 리라이트와 스키마 설계로 해결합니다.

## 1. 인덱스 전략

```
인덱스 유형 (PostgreSQL 기준):

  B-tree (기본)
  └─ 등가(=), 범위(<, >, BETWEEN), 정렬(ORDER BY)
     가장 범용적, 기본 인덱스 유형

  Hash
  └─ 등가(=)만 지원
     B-tree보다 약간 빠를 수 있지만 사용 제한적

  GIN (Generalized Inverted Index)
  └─ 배열, JSONB, 전문 검색 (tsvector)
     다중 값 컬럼에 적합

  GiST (Generalized Search Tree)
  └─ 기하학, 범위 타입, 전문 검색
     "가까운 것 찾기"에 적합
```

```sql
-- 복합 인덱스 (컬럼 순서가 중요!)
CREATE INDEX idx_orders_customer_date
ON orders (customer_id, order_date DESC);

-- 이 인덱스가 사용되는 경우:
WHERE customer_id = 42                          -- ✅ 선두 컬럼
WHERE customer_id = 42 AND order_date > '2024'  -- ✅ 둘 다
WHERE order_date > '2024'                       -- ❌ 선두 컬럼 누락!
```

| 인덱스 원칙 | 설명 |
|-----------|------|
| 선두 컬럼 규칙 | 복합 인덱스는 왼쪽부터 순서대로 사용 |
| 선택도 높은 컬럼 | 유니크에 가까운 컬럼을 앞에 배치 |
| 커버링 인덱스 | 쿼리에 필요한 모든 컬럼을 포함 → Index Only Scan |
| 쓰기 비용 | 인덱스가 많으면 INSERT/UPDATE 느려짐 |

## 2. 부분 인덱스와 커버링 인덱스

```sql
-- 부분 인덱스: 조건에 해당하는 행만 인덱싱 (인덱스 크기 감소)
CREATE INDEX idx_active_orders
ON orders (customer_id, order_date)
WHERE status = 'active';  -- active 주문만 인덱싱

-- 커버링 인덱스: 쿼리에 필요한 모든 컬럼 포함
CREATE INDEX idx_covering
ON orders (customer_id, order_date) INCLUDE (amount, status);
-- SELECT amount, status FROM orders WHERE customer_id = 42
-- → Index Only Scan (테이블 접근 불필요!)
```

> **핵심 직관**: 부분 인덱스는 "자주 조회되는 조건"에 대해 인덱스 크기를 줄이면서 성능을 높입니다. status = 'active'인 행이 10%라면, 인덱스도 10% 크기만 차지합니다.

## 3. 테이블 파티셔닝

```
파티셔닝 전략:

  Range Partitioning (범위)
  └─ 날짜, 숫자 범위로 분할
     예: orders_2023, orders_2024

  List Partitioning (목록)
  └─ 특정 값 목록으로 분할
     예: region = 'KR', region = 'US'

  Hash Partitioning (해시)
  └─ 해시 함수로 균등 분할
     예: user_id % 4 → 4개 파티션
```

```sql
-- Range Partitioning (PostgreSQL)
CREATE TABLE orders (
    id SERIAL,
    customer_id INT,
    order_date DATE,
    amount DECIMAL
) PARTITION BY RANGE (order_date);

CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');
CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

-- 쿼리 시 자동으로 필요한 파티션만 스캔 (Partition Pruning)
SELECT * FROM orders WHERE order_date = '2024-03-15';
-- → orders_2024_q1만 스캔
```

| 파티셔닝 장점 | 파티셔닝 단점 |
|-------------|-------------|
| 파티션 프루닝으로 스캔 범위 감소 | 파티션 간 쿼리 비용 증가 |
| 오래된 데이터 삭제 효율적 (DROP) | 유지보수 복잡도 증가 |
| 파티션별 인덱스/통계 관리 | 파티션 키 변경 어려움 |

## 4. 쿼리 리라이트 패턴

```sql
-- ❌ 느린: 함수 적용으로 인덱스 무효화 (SARGability 위반)
SELECT * FROM orders WHERE YEAR(order_date) = 2024;

-- ✅ 빠른: 범위 조건으로 변환
SELECT * FROM orders
WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';

-- ❌ 느린: OR 조건 (인덱스 활용 어려움)
SELECT * FROM users WHERE email = 'a@b.com' OR phone = '010-1234';

-- ✅ 빠른: UNION으로 분리
SELECT * FROM users WHERE email = 'a@b.com'
UNION
SELECT * FROM users WHERE phone = '010-1234';

-- ❌ 느린: SELECT * (불필요한 컬럼)
SELECT * FROM large_table WHERE id = 1;

-- ✅ 빠른: 필요한 컬럼만
SELECT name, email FROM large_table WHERE id = 1;
```

> **핵심 직관**: **SARGable**(Search ARGument ABLE)이란 "인덱스를 사용할 수 있는 조건"입니다. WHERE 절의 컬럼에 함수를 적용하면 인덱스를 사용할 수 없습니다. `WHERE LOWER(name) = 'kim'` 대신 함수 인덱스를 생성하거나 조건을 변환하세요.

## 5. 통계 관리

```sql
-- 테이블 통계 갱신
ANALYZE orders;

-- 현재 통계 확인
SELECT
    tablename, attname,
    n_distinct,     -- 고유값 수 추정
    null_frac,      -- NULL 비율
    correlation     -- 물리적 정렬과의 상관 (1.0 = 완전 정렬)
FROM pg_stats
WHERE tablename = 'orders';
```

```
통계가 중요한 이유:

  옵티마이저의 추정 행 수 = 전체 행 × 선택도(selectivity)

  선택도 계산:
  ├─ 등가 조건: 1 / n_distinct
  ├─ 범위 조건: 히스토그램 기반 추정
  └─ 복합 조건: 독립 가정 (× 곱셈)

  독립 가정의 한계:
  "서울에 사는 한국인" → 도시='서울' AND 국가='한국'
  독립 가정: P(서울) × P(한국) ≈ 매우 작음
  실제: P(서울|한국) ≈ 큼
  → 행 수 과소 추정 → 잘못된 계획

  해결: CREATE STATISTICS (확장 통계)
```

## 6. 최적화 체크리스트

```
느린 쿼리 진단 체크리스트:

  □ EXPLAIN ANALYZE 실행 (sql-07)
  □ 예상 행 수 vs 실제 행 수 차이 확인
  □ Seq Scan + 높은 필터링 비율 확인
  □ Nested Loop의 inner가 Seq Scan인지 확인
  □ 디스크 정렬 발생 여부 확인

  인덱스 체크:
  □ WHERE 절 컬럼에 인덱스 있는가?
  □ JOIN 키에 인덱스 있는가?
  □ ORDER BY가 인덱스로 해결되는가?
  □ 복합 인덱스의 컬럼 순서가 올바른가?

  쿼리 리라이트 체크:
  □ WHERE 절에 함수 적용 없는가? (SARGable)
  □ SELECT *를 사용하고 있지 않은가?
  □ 불필요한 서브쿼리가 없는가?
  □ UNION을 UNION ALL로 바꿀 수 있는가?
```

이 강의의 최적화 기법은 dbi-02(B-트리 인덱스)와 dbi-04(쿼리 옵티마이저)에서 내부 동작 원리를 더 깊이 배우게 됩니다.

## 핵심 정리

- 쿼리 최적화의 80%는 **올바른 인덱스 설계**이며, 복합 인덱스의 컬럼 순서(선두 컬럼 규칙)가 핵심입니다
- **부분 인덱스**는 특정 조건의 행만 인덱싱하여 크기를 줄이고, **커버링 인덱스**는 테이블 접근을 제거합니다
- **파티셔닝**은 대용량 테이블을 분할하여 파티션 프루닝으로 스캔 범위를 줄입니다
- WHERE 절 컬럼에 함수를 적용하면 인덱스가 무효화되므로, **SARGable** 조건으로 변환해야 합니다
- **통계 갱신**(ANALYZE)은 옵티마이저의 행 수 추정 정확도를 높여 올바른 실행 계획을 유도합니다

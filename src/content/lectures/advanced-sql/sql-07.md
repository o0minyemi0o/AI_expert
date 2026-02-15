# 쿼리 실행 계획

## 왜 쿼리 실행 계획이 중요한가

같은 결과를 내는 SQL도 **실행 계획에 따라 성능이 100배 이상 차이**날 수 있습니다. EXPLAIN ANALYZE를 읽는 능력은 느린 쿼리를 진단하고 최적화하는 데 필수적이며, 면접에서도 "이 쿼리가 왜 느린가요?"라는 질문에 대한 핵심 역량입니다.

> **핵심 직관**: 실행 계획은 "DB가 쿼리를 어떻게 처리할 것인가"에 대한 상세한 레시피입니다. 이 레시피를 읽을 줄 알아야 병목을 찾고 개선할 수 있습니다.

## 1. EXPLAIN vs EXPLAIN ANALYZE

```sql
-- EXPLAIN: 예상 실행 계획 (실제 실행하지 않음)
EXPLAIN SELECT * FROM orders WHERE customer_id = 42;

-- EXPLAIN ANALYZE: 실제 실행 + 실측 통계 (PostgreSQL)
EXPLAIN ANALYZE SELECT * FROM orders WHERE customer_id = 42;

-- EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT): 상세 정보
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM orders WHERE customer_id = 42;
```

```
EXPLAIN ANALYZE 출력 읽기:

  Index Scan using idx_customer on orders
    (cost=0.43..8.45 rows=5 width=64)
    (actual time=0.023..0.031 rows=3 loops=1)
     ↑        ↑      ↑      ↑       ↑      ↑
     │     시작비용  │   예상행수    │   실제행수  반복횟수
     │          총비용      행크기   실제시간(ms)
     스캔 방식
```

| 항목 | 의미 | 중요도 |
|------|------|--------|
| cost | 옵티마이저의 비용 추정 (상대값) | 비교용 |
| actual time | 실제 소요 시간 (ms) | 핵심 |
| rows | 예상 vs 실제 행 수 | 큰 차이 = 통계 부정확 |
| loops | 반복 실행 횟수 | Nested Loop 시 중요 |
| buffers | 디스크/캐시 I/O 횟수 | 성능 핵심 |

## 2. 스캔 방식

```
스캔 방식 비교:

  Seq Scan (순차 스캔)
  └─ 테이블 전체를 처음부터 끝까지 읽음
     적합: 대부분의 행을 읽을 때, 작은 테이블

  Index Scan
  └─ 인덱스로 위치를 찾고 → 테이블에서 행을 가져옴
     적합: 소수의 행을 선택할 때 (< 10-15%)

  Index Only Scan
  └─ 인덱스만으로 결과 반환 (테이블 접근 X)
     적합: 커버링 인덱스일 때 (가장 빠름)

  Bitmap Index Scan → Bitmap Heap Scan
  └─ 인덱스로 비트맵 생성 → 테이블을 페이지 단위로 접근
     적합: 중간 정도 선택률 (1-30%)
```

| 스캔 | 선택률 | I/O 패턴 | 속도 |
|------|--------|---------|------|
| Seq Scan | 높음 (>30%) | 순차 | 예측 가능 |
| Index Scan | 낮음 (<5%) | 랜덤 | 매우 빠름 |
| Index Only | 낮음 | 순차 (인덱스) | 가장 빠름 |
| Bitmap | 중간 (1-30%) | 혼합 | 중간 |

> **핵심 직관**: 옵티마이저가 Seq Scan을 선택했다면, 반드시 잘못된 것은 아닙니다. 테이블의 대부분을 읽어야 할 때는 Seq Scan이 Index Scan보다 빠릅니다. "왜 이 스캔을 선택했는가"를 이해하는 것이 중요합니다.

## 3. 조인 알고리즘

```
Nested Loop Join:
  FOR each row in outer:
      FOR each row in inner:
          IF join condition → output
  복잡도: O(N × M)
  적합: inner가 작거나 인덱스 있을 때

Hash Join:
  1. Build: inner 테이블로 해시 테이블 구축
  2. Probe: outer 테이블을 스캔하며 매칭
  복잡도: O(N + M)
  적합: 등가 조인(=), 큰 테이블

Merge Join (Sort-Merge):
  1. 양쪽 테이블을 조인 키로 정렬
  2. 동시에 스캔하며 매칭
  복잡도: O(N log N + M log M)
  적합: 이미 정렬된 데이터, 큰 테이블
```

| 알고리즘 | 조건 | 메모리 | 사전 정렬 |
|---------|------|--------|----------|
| Nested Loop | 소량 or 인덱스 | 최소 | 불필요 |
| Hash Join | 등가 조인, 대량 | 해시 테이블 크기 | 불필요 |
| Merge Join | 이미 정렬됨 | 최소 | 필요 |

## 4. 실행 계획 읽기 실전

```sql
EXPLAIN ANALYZE
SELECT c.name, COUNT(o.id) AS order_count, SUM(o.amount) AS total
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE c.region = 'Seoul'
GROUP BY c.name
ORDER BY total DESC
LIMIT 10;
```

```
실행 계획 (아래에서 위로 읽기):

  Limit (actual time=5.2..5.2 rows=10)
  └─ Sort (actual time=5.1..5.2 rows=10)
      Sort Key: total DESC
      └─ HashAggregate (actual time=4.8..4.9 rows=150)
          Group Key: c.name
          └─ Hash Left Join (actual time=0.5..3.2 rows=8500)
              Hash Cond: (c.id = o.customer_id)
              ├─ Seq Scan on customers (actual time=0.01..0.3 rows=500)
              │   Filter: (region = 'Seoul')
              │   Rows Removed by Filter: 4500  ← region 인덱스 없음!
              └─ Hash (actual time=0.4..0.4 rows=50000)
                  └─ Seq Scan on orders (actual time=0.01..0.2 rows=50000)
```

```
병목 진단:

  1. customers의 Seq Scan → region 필터로 4500행 제거
     → region에 인덱스 추가하면 개선 가능

  2. orders의 Seq Scan → 전체 50000행 읽음
     → LEFT JOIN이므로 필터 불가, 정상

  3. HashAggregate → 150개 그룹, 빠름, 정상

  4. Sort → 150행 정렬, 빠름, 정상
```

## 5. 예상 vs 실제 행 수 차이

```
rows 차이가 큰 경우 = 통계 부정확 = 잘못된 계획 선택

  예시:
  Index Scan on users
    (cost=... rows=10 ...)         ← 옵티마이저: 10행 예상
    (actual time=... rows=50000 ...) ← 실제: 50000행!

  원인:
  ├─ 통계가 오래됨 → ANALYZE 실행
  ├─ 상관관계 있는 컬럼 → 확장 통계 생성
  └─ 파라미터화된 쿼리 → 일반적 추정 사용

  해결: ANALYZE table_name;  -- 통계 갱신
```

> **핵심 직관**: 예상 행 수와 실제 행 수의 큰 차이는 **잘못된 실행 계획의 가장 흔한 원인**입니다. 옵티마이저는 행 수 추정에 기반하여 스캔 방식과 조인 알고리즘을 선택하므로, 추정이 틀리면 모든 것이 틀립니다.

## 6. 흔한 실행 계획 문제 패턴

```
문제 패턴과 해결:

  1. "Seq Scan + Filter: Rows Removed 99%"
     → 인덱스 없이 대부분의 행을 버림
     → 해당 컬럼에 인덱스 추가

  2. "Nested Loop + Seq Scan on inner"
     → inner 테이블 반복 풀스캔
     → 조인 키에 인덱스 추가

  3. "Sort + 큰 work_mem 초과"
     → 디스크 정렬 발생 (external merge sort)
     → work_mem 증가 or 인덱스로 정렬 제거

  4. "HashAggregate + Batches > 1"
     → 메모리 부족으로 디스크 사용
     → work_mem 증가 or 데이터 줄이기

  5. "rows=1 (actual rows=100000)"
     → 통계 부정확
     → ANALYZE 실행
```

이 강의의 실행 계획 분석 능력은 sql-08의 쿼리 최적화 실전에서 바로 활용됩니다.

## 핵심 정리

- **EXPLAIN ANALYZE**로 예상 계획과 실측 통계를 함께 확인하며, 실행 계획은 **아래에서 위로** 읽습니다
- 스캔 방식은 선택률에 따라 결정되며, Seq Scan이 항상 나쁜 것은 아닙니다(대부분 읽을 때 최적)
- 조인 알고리즘은 **Nested Loop**(소량), **Hash Join**(등가, 대량), **Merge Join**(정렬된 데이터)으로 나뉩니다
- 예상 행 수와 실제 행 수의 **큰 차이**는 잘못된 계획의 가장 흔한 원인이며, ANALYZE로 통계를 갱신합니다
- "Seq Scan + Filter로 99% 제거" 패턴이 보이면 **인덱스 추가**가 가장 효과적인 최적화입니다

# 트랜잭션과 ACID

## 왜 트랜잭션이 중요한가

은행 송금에서 "출금은 됐는데 입금이 안 된" 상황은 절대 일어나면 안 됩니다. 트랜잭션은 여러 연산을 **하나의 논리적 단위로 묶어** 전부 성공하거나 전부 실패하게 보장합니다. ACID 속성은 데이터의 정확성과 일관성을 지키는 기본 원칙이며, 격리 수준의 선택은 성능과 정확성 사이의 핵심 트레이드오프입니다.

> **핵심 직관**: 트랜잭션 격리 수준은 "정확성 vs 성능"의 스펙트럼입니다. Serializable은 완벽하지만 느리고, Read Committed는 빠르지만 이상 현상이 발생할 수 있습니다.

## 1. ACID 속성

| 속성 | 의미 | 구현 메커니즘 |
|------|------|-------------|
| Atomicity (원자성) | 전부 성공 or 전부 실패 | Undo Log |
| Consistency (일관성) | 트랜잭션 전후 제약 유지 | 애플리케이션 + DB 제약 |
| Isolation (격리성) | 동시 트랜잭션 간 간섭 없음 | MVCC, 락 |
| Durability (지속성) | 커밋 후 영구 보존 | WAL (dbi-01) |

```
Atomicity 구현 (Undo Log):

  BEGIN;
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  -- Undo Log: {table: accounts, id: 1, old_balance: 1000}
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
  -- Undo Log: {table: accounts, id: 2, old_balance: 500}

  ROLLBACK 시 → Undo Log를 역순으로 적용
  id=2의 balance를 500으로, id=1의 balance를 1000으로 복원
```

## 2. 격리 수준과 이상 현상

```
이상 현상 (Anomalies):

  Dirty Read (더티 리드):
  T1: UPDATE balance = 0  (아직 COMMIT 안 함)
  T2: SELECT balance → 0  (커밋되지 않은 값 읽음!)
  T1: ROLLBACK             (원래 값으로 돌아감)
  T2: 잘못된 값(0)을 기반으로 작업 진행

  Non-repeatable Read (반복 불가 읽기):
  T1: SELECT balance → 1000
  T2: UPDATE balance = 500; COMMIT;
  T1: SELECT balance → 500  (같은 트랜잭션 내에서 값이 변함!)

  Phantom Read (팬텀 리드):
  T1: SELECT COUNT(*) WHERE age > 20 → 100
  T2: INSERT INTO users (age=25); COMMIT;
  T1: SELECT COUNT(*) WHERE age > 20 → 101  (새 행이 나타남!)
```

| 격리 수준 | Dirty Read | Non-repeatable | Phantom | 성능 |
|----------|-----------|---------------|---------|------|
| Read Uncommitted | O | O | O | 최고 |
| Read Committed | X | O | O | 높음 |
| Repeatable Read | X | X | O* | 중간 |
| Serializable | X | X | X | 낮음 |

*PostgreSQL의 Repeatable Read는 MVCC로 팬텀도 방지

## 3. 격리 수준 선택 가이드

```sql
-- PostgreSQL: 기본 격리 수준 확인/변경
SHOW default_transaction_isolation;  -- read committed (기본)

-- 트랜잭션별 격리 수준 설정
BEGIN ISOLATION LEVEL SERIALIZABLE;
-- 잔액 확인 후 업데이트 (경쟁 조건 방지)
SELECT balance FROM accounts WHERE id = 1;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
COMMIT;
```

| 시나리오 | 권장 격리 수준 | 이유 |
|---------|-------------|------|
| 일반 CRUD | Read Committed | 충분하고 빠름 |
| 잔액 조회 + 차감 | Repeatable Read | 읽은 값 보장 |
| 좌석 예약 | Serializable | 경쟁 조건 완전 방지 |
| 리포트 쿼리 | Read Committed | 정확한 스냅샷 불필요 |

> **핵심 직관**: 실무에서 대부분의 트랜잭션은 **Read Committed로 충분**합니다. Serializable이 필요한 경우는 "읽은 값에 기반하여 쓰기를 결정하는" 패턴(read-then-write)뿐입니다. 이 경우에도 SELECT FOR UPDATE로 해결 가능한 경우가 많습니다.

## 4. WAL과 지속성

```
WAL (Write-Ahead Log) 복구 과정:

  정상 운영:
  1. 변경 → WAL 기록 → 버퍼 풀 수정 → (나중에) 디스크 기록
  2. COMMIT → WAL fsync (이 시점에서 지속성 보장)

  크래시 복구:
  1. WAL을 처음부터 재생 (Redo)
     → 커밋된 트랜잭션의 변경을 데이터 페이지에 적용
  2. 커밋되지 않은 트랜잭션은 Undo
     → 원자성 보장

  체크포인트:
  └─ 주기적으로 버퍼 풀의 Dirty 페이지를 디스크에 기록
     → 복구 시 재생할 WAL 양 감소
     → 복구 시간 단축
```

## 5. 락과 데드락

```
락 종류:

  Shared Lock (S-Lock, 공유 락):
  └─ 읽기 허용, 쓰기 차단
     여러 트랜잭션이 동시에 S-Lock 가능

  Exclusive Lock (X-Lock, 배타 락):
  └─ 읽기/쓰기 모두 차단
     하나의 트랜잭션만 X-Lock 가능

  호환성 매트릭스:
         | S-Lock | X-Lock |
  S-Lock |   ✅   |   ❌   |
  X-Lock |   ❌   |   ❌   |
```

```sql
-- 명시적 행 수준 락
SELECT * FROM accounts WHERE id = 1 FOR UPDATE;
-- 이 행에 X-Lock → 다른 트랜잭션은 대기

-- 데드락 시나리오:
-- T1: Lock(A), 요청 Lock(B)  ← B를 기다림
-- T2: Lock(B), 요청 Lock(A)  ← A를 기다림
-- → 영원히 대기! DB가 감지하여 하나를 롤백
```

> **핵심 직관**: 데드락을 예방하는 가장 간단한 방법은 **모든 트랜잭션이 같은 순서로 락을 획득**하는 것입니다. 예를 들어 항상 ID가 작은 계좌를 먼저 락하면 데드락이 발생하지 않습니다.

## 6. 실전: 동시성 문제 해결 패턴

```sql
-- 패턴 1: 낙관적 동시성 (Optimistic Locking)
UPDATE products SET stock = stock - 1, version = version + 1
WHERE id = 42 AND version = 5;
-- 영향 받은 행 = 0이면 → 다른 트랜잭션이 먼저 수정 → 재시도

-- 패턴 2: 비관적 동시성 (Pessimistic Locking)
BEGIN;
SELECT * FROM products WHERE id = 42 FOR UPDATE;  -- 락 획득
UPDATE products SET stock = stock - 1 WHERE id = 42;
COMMIT;

-- 패턴 3: Advisory Lock (애플리케이션 레벨 락)
SELECT pg_advisory_lock(42);  -- 키 42에 대한 전역 락
-- 작업 수행
SELECT pg_advisory_unlock(42);
```

트랜잭션의 격리성은 dbi-06의 MVCC에서 구체적인 구현 메커니즘을 배우고, dbi-09에서 분산 환경으로 확장됩니다.

## 핵심 정리

- **ACID**는 원자성(Undo Log), 일관성(제약), 격리성(MVCC/락), 지속성(WAL)으로 구현됩니다
- 격리 수준은 **Read Committed**(기본, 충분)부터 **Serializable**(완전, 느림)까지 정확성과 성능의 트레이드오프입니다
- 대부분의 실무 상황에서 **Read Committed + SELECT FOR UPDATE**로 동시성 문제를 해결할 수 있습니다
- **데드락**은 락 획득 순서를 통일하거나 타임아웃으로 예방하며, DB가 자동 감지하여 하나를 롤백합니다
- 낙관적(version 체크) vs 비관적(FOR UPDATE) 동시성 제어는 **충돌 빈도에 따라** 선택합니다

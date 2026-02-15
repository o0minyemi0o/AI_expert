# MVCC와 동시성 제어

## 왜 MVCC를 이해해야 하는가

dbi-05에서 격리 수준과 락을 배웠습니다. 하지만 실제 PostgreSQL에서 **읽기가 쓰기를 차단하지 않는** 이유를 설명하려면 MVCC(Multi-Version Concurrency Control)를 알아야 합니다. MVCC는 데이터의 여러 버전을 유지하여 읽기와 쓰기가 서로를 기다리지 않게 하는 핵심 메커니즘입니다.

> **핵심 직관**: MVCC의 핵심 아이디어는 "읽는 사람은 옛날 사진을 보고, 쓰는 사람은 새 사진을 찍는 것"입니다. 서로 다른 버전을 보므로 충돌하지 않습니다.

## 1. MVCC 기본 개념

```
MVCC 없이 (락 기반만):

  T1: SELECT * FROM orders WHERE id = 1;
  T2: UPDATE orders SET status = 'shipped' WHERE id = 1;

  → T2는 T1이 읽기 완료할 때까지 대기 (S-Lock)
  → 동시성 저하

MVCC 방식:

  T1 (snapshot: txid=100)
  │ SELECT → version txid=95의 데이터를 봄
  │
  T2 (txid=101)
  │ UPDATE → 새 version txid=101 생성
  │          기존 version txid=95은 유지
  │
  T1: 여전히 txid=95 버전을 봄 → 차단 없음!
```

| 방식 | 읽기-쓰기 | 쓰기-쓰기 | 장점 |
|------|----------|----------|------|
| 락 기반 | 차단 | 차단 | 구현 단순 |
| MVCC | 비차단 | 차단 | 높은 동시성 |
| MVCC + 낙관적 | 비차단 | 충돌 시 롤백 | 최고 동시성 |

## 2. PostgreSQL의 MVCC 구현

PostgreSQL은 **Tuple Header에 트랜잭션 ID를 기록**하여 가시성을 판단합니다.

```
PostgreSQL 튜플 헤더:

  ┌─────────────────────────────────┐
  │ xmin = 100     (이 행을 생성한 txid)
  │ xmax = 0       (이 행을 삭제한 txid, 0=살아있음)
  │ ctid = (0, 1)  (물리적 위치)
  │ infomask       (커밋/롤백 상태 비트)
  ├─────────────────────────────────┤
  │ 실제 데이터: {id=1, name='김', age=30}
  └─────────────────────────────────┘

UPDATE 시 동작:

  Before:
  (xmin=100, xmax=0)  {id=1, name='김', age=30}

  T2(txid=105): UPDATE SET age=31

  After:
  (xmin=100, xmax=105) {id=1, name='김', age=30}  ← 구 버전 (dead)
  (xmin=105, xmax=0)   {id=1, name='김', age=31}  ← 신 버전 (live)

  DELETE도 동일: xmax만 설정, 물리적 삭제는 나중에
```

> **핵심 직관**: PostgreSQL의 UPDATE는 실제로는 **DELETE + INSERT**입니다. 구 버전에 xmax를 표시하고 새 버전을 생성합니다. 이것이 UPDATE가 많은 테이블에서 테이블 크기가 계속 커지는 이유입니다.

## 3. 스냅샷과 가시성 판단

```
스냅샷 (Snapshot):
  트랜잭션 시작 시점에 "어떤 트랜잭션이 활성 중인지" 기록

  Snapshot = {
    xmin: 100,      // 이보다 작은 txid는 모두 완료
    xmax: 110,      // 이보다 큰 txid는 모두 미래
    active: [103, 107]  // 이 txid들은 아직 진행 중
  }

가시성 규칙 (Visibility Check):

  튜플 (xmin=X, xmax=Y)가 보이려면:
  1. X가 커밋됨 AND X가 스냅샷 이전
  2. Y가 없음(0) OR Y가 커밋 안 됨 OR Y가 스냅샷 이후

  예시 (내 snapshot: xmin=100, active=[103]):
  (xmin=95,  xmax=0)    → ✅ 보임 (95 < 100, 삭제 안 됨)
  (xmin=95,  xmax=103)  → ✅ 보임 (103은 아직 active)
  (xmin=95,  xmax=99)   → ❌ 안 보임 (99에서 삭제 완료)
  (xmin=103, xmax=0)    → ❌ 안 보임 (103은 active)
  (xmin=110, xmax=0)    → ❌ 안 보임 (미래 트랜잭션)
```

## 4. MySQL InnoDB의 MVCC

```
InnoDB의 접근 (Undo Log 기반):

  PostgreSQL: 새 버전을 테이블에 직접 저장
  InnoDB:     최신 버전만 테이블에, 구 버전은 Undo Log에

  테이블 행: {id=1, age=31, roll_ptr → Undo Log}
                                  │
  Undo Log:  {id=1, age=30, roll_ptr → 이전 Undo}
                                  │
  Undo Log:  {id=1, age=28, roll_ptr → NULL}

  읽기 시: 필요한 시점의 버전을 Undo Log를 따라가며 복원

  비교:
  ┌─────────────┬──────────────┬──────────────┐
  │             │ PostgreSQL   │ InnoDB       │
  ├─────────────┼──────────────┼──────────────┤
  │ 구 버전 위치 │ 테이블 내     │ Undo Log    │
  │ UPDATE 비용 │ 높음 (새 행)  │ 중간        │
  │ 읽기 비용   │ 낮음 (직접)   │ 중간 (복원)  │
  │ 정리 비용   │ VACUUM       │ Purge Thread│
  │ 테이블 비대화│ 있음         │ 없음        │
  └─────────────┴──────────────┴──────────────┘
```

## 5. VACUUM과 가비지 컬렉션

```
PostgreSQL VACUUM:

  Dead 튜플 (어떤 트랜잭션도 더 이상 볼 필요 없는 구 버전)을
  정리하여 공간을 재사용 가능하게 만드는 프로세스

  VACUUM 동작:
  1. 각 테이블의 dead 튜플 식별
  2. dead 튜플이 차지한 공간을 Free Space Map에 등록
  3. 향후 INSERT가 이 공간 재사용

  VACUUM FULL:
  └─ 테이블 전체를 다시 쓰며 크기 축소
     ⚠️ 테이블 전체에 배타 락 → 서비스 중단

  Autovacuum (자동):
  └─ 백그라운드에서 자동 실행
     기본: dead 튜플 비율 > 20% + 50건일 때 트리거
     설정: autovacuum_vacuum_threshold
           autovacuum_vacuum_scale_factor
```

```sql
-- VACUUM 상태 모니터링
SELECT relname, n_dead_tup, n_live_tup,
       round(n_dead_tup::numeric / greatest(n_live_tup, 1) * 100, 1) AS dead_pct,
       last_vacuum, last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- 수동 VACUUM (서비스 중에도 가능)
VACUUM VERBOSE orders;

-- VACUUM FULL (주의: 배타 락!)
VACUUM FULL orders;  -- 테이블 재작성, 크기 축소
```

> **핵심 직관**: VACUUM이 제때 실행되지 않으면 테이블이 계속 커지고("table bloat"), 결국 성능이 급격히 떨어집니다. **Transaction ID Wraparound**을 방지하기 위해서도 VACUUM은 필수적이며, 이것을 놓치면 DB가 쓰기를 거부합니다.

## 6. 낙관적 vs 비관적 동시성 제어

```
비관적 (Pessimistic) — dbi-05 복습:
  "충돌이 일어날 것이라 가정하고 미리 락"
  BEGIN;
  SELECT * FROM seats WHERE id = 42 FOR UPDATE;  -- 락
  UPDATE seats SET booked = true WHERE id = 42;
  COMMIT;
  적합: 충돌 빈도 높음

낙관적 (Optimistic):
  "충돌이 드물다고 가정하고, 커밋 시 검증"
  1. 읽기: 타임스탬프/버전 기록
  2. 수정: 로컬에서 작업
  3. 커밋: 읽은 이후 변경이 있었는지 검증
     → 변경 없으면 커밋
     → 변경 있으면 롤백 후 재시도

  PostgreSQL Serializable Snapshot Isolation (SSI):
  └─ 낙관적 방식으로 Serializable 격리 수준 구현
     읽기/쓰기 의존성 그래프에서 순환 감지
     순환 발생 시 하나의 트랜잭션을 중단
```

| 특성 | 비관적 | 낙관적 |
|------|--------|--------|
| 락 시점 | 즉시 | 없음 (커밋 시 검증) |
| 충돌 빈도 높을 때 | 효율적 | 재시도 많아짐 |
| 충돌 빈도 낮을 때 | 불필요한 대기 | 효율적 |
| PostgreSQL 구현 | SELECT FOR UPDATE | SSI |

MVCC는 dbi-07의 복제에서 버전 충돌 해결의 기반이 되며, dbi-09의 분산 트랜잭션에서 글로벌 스냅샷 문제로 확장됩니다.

## 핵심 정리

- **MVCC**는 데이터의 여러 버전을 유지하여 읽기와 쓰기가 서로를 차단하지 않게 합니다
- PostgreSQL은 **튜플 헤더의 xmin/xmax**로 가시성을 판단하고, InnoDB는 **Undo Log**로 구 버전을 관리합니다
- PostgreSQL의 UPDATE는 실제로 **DELETE + INSERT**이므로 dead 튜플이 누적되어 테이블이 비대해집니다
- **VACUUM**은 dead 튜플을 정리하는 필수 프로세스이며, Autovacuum 설정이 성능의 핵심입니다
- 낙관적 동시성 제어는 **충돌이 드문 환경**에서 효율적이며, PostgreSQL의 SSI가 이를 구현합니다

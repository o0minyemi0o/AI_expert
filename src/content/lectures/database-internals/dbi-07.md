# 복제와 합의

## 왜 복제와 합의가 중요한가

단일 서버 DB는 그 서버가 죽으면 끝입니다. **복제(Replication)**는 데이터를 여러 노드에 복사하여 가용성과 읽기 성능을 높이는 핵심 기술입니다. 그러나 여러 복제본이 "같은 데이터"를 유지하려면 **합의(Consensus)** 프로토콜이 필요합니다. 이 두 개념은 모든 분산 시스템의 기반입니다.

> **핵심 직관**: 복제의 핵심 딜레마는 "일관성 vs 가용성"입니다. 모든 복제본이 항상 같은 데이터를 보장하면 느리고, 차이를 허용하면 빠르지만 잘못된 값을 읽을 수 있습니다. CAP 정리가 이를 형식화합니다.

## 1. 복제 토폴로지

```
단일 리더 (Single-Leader):

  [Client] → [Leader] ──→ [Follower 1]
                     └──→ [Follower 2]
                     └──→ [Follower 3]

  쓰기: Leader만 받음
  읽기: Leader + Follower 모두
  장점: 쓰기 충돌 없음
  단점: Leader가 병목/단일 장애점
  사용: PostgreSQL, MySQL


다중 리더 (Multi-Leader):

  [Leader A] ←──→ [Leader B]
      ↓                ↓
  [Follower]      [Follower]

  쓰기: 여러 Leader가 받음
  장점: 지리적 분산 시 지연 감소
  단점: 쓰기 충돌 해결 필요
  사용: CockroachDB, 다중 DC 설정


리더 없는 (Leaderless):

  [Client] → [Node 1]  (W)
           → [Node 2]  (W)
           → [Node 3]  (W)

  쓰기: 여러 노드에 동시에
  읽기: 여러 노드에서 읽고 최신 값 선택
  장점: 단일 장애점 없음
  단점: 복잡한 충돌 해결
  사용: Cassandra, DynamoDB
```

## 2. 동기 vs 비동기 복제

```
동기 복제 (Synchronous):

  Client → Leader: WRITE
  Leader → Follower: REPLICATE
  Follower → Leader: ACK
  Leader → Client: OK

  → 데이터 손실 없음 보장
  → Follower가 느리면 전체가 느려짐

비동기 복제 (Asynchronous):

  Client → Leader: WRITE
  Leader → Client: OK  (즉시 응답)
  Leader → Follower: REPLICATE (백그라운드)

  → 빠른 응답
  → Leader 장애 시 최근 쓰기 손실 가능

반동기 (Semi-synchronous):
  → 1개 Follower만 동기, 나머지 비동기
  → PostgreSQL synchronous_commit 설정으로 제어
```

| 방식 | 지연시간 | 데이터 안전성 | 가용성 |
|------|---------|-------------|--------|
| 동기 | 높음 | 손실 없음 | 낮음 |
| 비동기 | 낮음 | 손실 가능 | 높음 |
| 반동기 | 중간 | 1개 보장 | 중간 |

> **핵심 직관**: PostgreSQL의 Streaming Replication은 기본적으로 **비동기**입니다. `synchronous_commit = on`으로 변경하면 안전하지만, Follower 장애 시 Leader까지 멈출 수 있습니다. 대부분의 실무에서는 반동기를 선택합니다.

## 3. 복제 지연 문제

```
비동기 복제의 이상 현상:

  Read-after-Write 불일치:
  Client: INSERT INTO posts (content) VALUES ('hello');  → Leader
  Client: SELECT * FROM posts WHERE id = 42;             → Follower
  → "hello"가 아직 Follower에 도착 안 함 → 빈 결과!

  해결 패턴:
  1. Read-your-writes: 자신의 쓰기는 Leader에서 읽기
  2. 모노토닉 읽기: 같은 Follower에서 계속 읽기 (세션 고정)
  3. 인과적 일관성: 인과 관계가 있는 읽기 순서 보장

  복제 지연 모니터링 (PostgreSQL):
  SELECT client_addr, state,
         pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
  FROM pg_stat_replication;
```

## 4. WAL 기반 복제

```
PostgreSQL Streaming Replication:

  Leader                          Follower
  ┌─────────┐                    ┌─────────┐
  │ 트랜잭션  │                    │         │
  │   ↓     │                    │         │
  │  WAL    │ ── WAL Stream ──→  │  WAL    │
  │   ↓     │                    │   ↓     │
  │ 데이터   │                    │ 데이터   │
  └─────────┘                    └─────────┘

  과정:
  1. Leader가 WAL 레코드 생성
  2. WAL Sender 프로세스가 Follower로 전송
  3. Follower의 WAL Receiver가 수신
  4. Follower가 WAL을 재생(replay)하여 데이터 반영

  장점:
  - 바이트 수준의 정확한 복제
  - 논리적 복제보다 오버헤드 낮음

  단점:
  - 같은 DB 버전만 가능
  - 부분 복제 불가 (전체 클러스터)
```

## 5. 합의 알고리즘: Raft

```
Raft 개요:

  3개 이상의 노드가 "하나의 값에 합의"하는 프로토콜
  리더 선출 + 로그 복제로 구성

  노드 상태: Leader, Follower, Candidate

  리더 선출:
  1. Follower가 Leader 하트비트를 못 받으면 → Candidate
  2. Candidate가 다른 노드에 투표 요청
  3. 과반수 투표 받으면 → 새 Leader
  4. 새 Leader가 하트비트 전송 시작

  로그 복제:
  1. Client → Leader: 명령 전달
  2. Leader → 모든 Follower: 로그 엔트리 복제
  3. 과반수 확인 → Leader가 커밋
  4. 커밋된 엔트리를 상태 머신에 적용

  타임라인:
  Term 1: [Leader A] ──heartbeat──→ [B] [C]
  Term 2: A 장애 → [B가 Candidate] → 투표 → [Leader B]
```

## 6. 정족수와 CAP 정리

```
정족수 (Quorum):

  N개 노드에서:
  W = 쓰기 성공에 필요한 노드 수
  R = 읽기에 필요한 노드 수

  W + R > N이면 → 항상 최신 값을 읽을 수 있음

  예: N=3
  ├─ W=2, R=2: 강한 일관성 (겹침 1개)
  ├─ W=3, R=1: 쓰기 느림, 읽기 빠름
  └─ W=1, R=1: 일관성 보장 없음 (W+R=2 ≤ 3)


CAP 정리:

  분산 시스템은 네트워크 파티션(P) 발생 시
  일관성(C)과 가용성(A) 중 하나를 포기해야 함

  ┌─────────┐
  │    C    │  CP: 파티션 시 일관성 유지, 응답 거부
  │   / \   │      예: etcd, ZooKeeper, HBase
  │  /   \  │
  │ A─────P │  AP: 파티션 시 가용성 유지, 불일치 허용
  │         │      예: Cassandra, DynamoDB
  └─────────┘

  실무에서:
  └─ 네트워크 파티션은 반드시 발생함
     → P는 선택이 아닌 전제
     → 실제 선택은 "C vs A"
```

> **핵심 직관**: CAP은 "항상 C 또는 A를 포기한다"는 뜻이 아닙니다. **네트워크 파티션이 발생한 순간에만** 선택을 해야 합니다. 평소에는 C와 A 모두 제공할 수 있습니다.

복제는 dbi-08의 파티셔닝과 결합하여 수평 확장을 가능하게 하고, dbi-09의 분산 트랜잭션에서 여러 복제본 간의 원자성 보장으로 확장됩니다.

## 핵심 정리

- **단일 리더** 복제는 쓰기 충돌이 없지만 Leader가 단일 장애점이며, 대부분의 RDBMS가 사용합니다
- **비동기 복제**는 빠르지만 데이터 손실 위험이 있고, **반동기**가 실무에서 가장 흔한 선택입니다
- 복제 지연으로 인한 이상 현상은 **Read-your-writes**, 세션 고정 등의 패턴으로 완화합니다
- **Raft**는 리더 선출과 로그 복제로 합의를 달성하며, 과반수(N/2+1) 노드가 살아있으면 동작합니다
- **CAP 정리**에 따라 네트워크 파티션 시 일관성(CP) 또는 가용성(AP)을 선택해야 합니다

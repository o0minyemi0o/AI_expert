# LSM 트리

## 왜 LSM 트리가 중요한가

dbi-02의 B-트리는 읽기에 최적화되어 있지만, **쓰기가 집중되는 워크로드**에서는 랜덤 I/O로 인해 병목이 됩니다. LSM(Log-Structured Merge) 트리는 모든 쓰기를 순차 I/O로 변환하여 쓰기 성능을 극대화합니다. Cassandra, RocksDB, LevelDB, HBase 등 대규모 분산 DB의 핵심 저장 엔진입니다.

> **핵심 직관**: LSM 트리의 핵심 아이디어는 "쓰기를 메모리에 버퍼링하고, 가득 차면 정렬된 파일로 한 번에 내보내는 것"입니다. 랜덤 쓰기가 순차 쓰기로 변환되므로 쓰기 처리량이 B-트리보다 10-100배 높습니다.

## 1. LSM 트리 구조

```
LSM 트리 동작 흐름:

  [쓰기 요청] → [WAL] → [Memtable (메모리, 정렬)]
                              │
                         가득 차면 Flush
                              │
                              ▼
                     [SSTable Level 0] (디스크, 정렬)
                              │
                         Compaction
                              │
                     [SSTable Level 1] (병합, 크기 ↑)
                              │
                     [SSTable Level 2] (더 큰 병합)
                              │
                         ...

  읽기: Memtable → L0 → L1 → L2 → ... (위에서 아래로)
  쓰기: Memtable에 추가 → 주기적으로 Flush
```

| 구성 요소 | 위치 | 역할 |
|----------|------|------|
| WAL | 디스크 | 내구성 보장 (크래시 복구) |
| Memtable | 메모리 | 최근 쓰기 버퍼 (Red-Black Tree) |
| SSTable | 디스크 | 정렬된 불변 파일 |
| Bloom Filter | 메모리 | "이 SSTable에 키가 있는가?" 빠른 확인 |

## 2. SSTable 구조

```
SSTable (Sorted String Table):

  ┌──────────────────────────────────┐
  │ Data Block 1                      │
  │ [key1:val1] [key2:val2] ...       │
  ├──────────────────────────────────┤
  │ Data Block 2                      │
  │ [key3:val3] [key4:val4] ...       │
  ├──────────────────────────────────┤
  │ ...                               │
  ├──────────────────────────────────┤
  │ Index Block                       │
  │ [block1의 첫 키 → offset]         │
  │ [block2의 첫 키 → offset]         │
  ├──────────────────────────────────┤
  │ Bloom Filter                      │
  ├──────────────────────────────────┤
  │ Footer (메타데이터)                │
  └──────────────────────────────────┘

  특징:
  - 불변 (Immutable): 한 번 쓰면 수정 안 함
  - 정렬됨: 키 순서로 정렬되어 있음
  - 블록 단위 압축 가능
```

## 3. Compaction 전략

Compaction은 여러 SSTable을 **병합하여 중복 키를 제거하고 정리**하는 과정입니다.

```
Leveled Compaction (LevelDB, RocksDB):

  L0: [SST] [SST] [SST]  ← Memtable flush 결과 (겹칠 수 있음)
      │
      ▼ (L0 → L1 병합)
  L1: [SST][SST][SST][SST]  ← 키 범위 겹치지 않음
      │
      ▼ (L1 → L2 병합)
  L2: [SST][SST]...[SST]    ← 10배 크기
      │
  L3: [SST][SST]...[SST]    ← 100배 크기

  각 레벨은 이전 레벨의 10배 크기
  같은 레벨 내에서 키 범위 겹치지 않음
  → 읽기 시 레벨당 최대 1개 SSTable만 확인


Tiered Compaction (Cassandra):

  같은 크기의 SSTable이 N개 모이면 하나로 병합

  [S][S][S][S] → [M]
  [M][M][M][M] → [L]
  [L][L][L][L] → [XL]

  → 쓰기 증폭이 낮음 (병합 빈도 낮음)
  → 읽기 증폭이 높음 (같은 레벨에 겹침 있음)
```

| 전략 | 쓰기 증폭 | 읽기 증폭 | 공간 증폭 | 적합 |
|------|----------|----------|----------|------|
| Leveled | 높음 | 낮음 | 낮음 | 읽기 많은 |
| Tiered | 낮음 | 높음 | 높음 | 쓰기 많은 |

> **핵심 직관**: Compaction은 LSM 트리의 **가장 비싼 연산**입니다. 백그라운드에서 실행되지만, 디스크 I/O와 CPU를 소모하며 쓰기 성능에 영향을 줍니다. Compaction 전략 선택이 LSM 기반 DB 튜닝의 핵심입니다.

## 4. 읽기/쓰기 증폭

```
증폭 개념:

  쓰기 증폭 (Write Amplification):
  └─ 1바이트 쓰려고 실제로 N바이트 쓰게 되는 비율
     B-트리: 페이지 전체 재작성 → 중간
     LSM Leveled: Compaction 반복 → 높음 (10-30×)

  읽기 증폭 (Read Amplification):
  └─ 1건 읽으려고 여러 곳을 확인하는 횟수
     B-트리: 트리 높이만큼 → 낮음 (3-4회)
     LSM: 여러 레벨 확인 → 높음 (Bloom Filter로 완화)

  공간 증폭 (Space Amplification):
  └─ 같은 키의 여러 버전이 존재하는 비율
     B-트리: 제자리 갱신 → 낮음
     LSM: Compaction 전 중복 존재 → 중간~높음
```

## 5. Bloom Filter로 읽기 최적화

```
Bloom Filter 동작:

  "이 SSTable에 키 X가 있는가?"

  Bloom Filter 응답:
  ├─ "없다" → 확실히 없음 (False Negative 없음)
  └─ "있을 수 있다" → 확인 필요 (False Positive 가능)

  효과:
  키가 없는 SSTable에 대한 디스크 읽기를 건너뜀
  → 읽기 증폭을 크게 줄임

  비용: SSTable당 수 KB 메모리
  오탐률: 보통 1-2%로 설정
```

> **핵심 직관**: Bloom Filter가 없으면 LSM 트리의 읽기 성능은 실용성이 없습니다. 각 SSTable마다 Bloom Filter를 메모리에 유지하여, "확실히 없는" SSTable에 대한 디스크 접근을 완전히 제거합니다.

## 6. B-트리 vs LSM 트리 종합 비교

| 특성 | B-트리 | LSM 트리 |
|------|--------|---------|
| 읽기 | 빠름 (O(log n)) | 느림 (여러 레벨) |
| 쓰기 | 중간 (랜덤 I/O) | 빠름 (순차 I/O) |
| 범위 검색 | 빠름 (리프 연결) | 중간 (병합 필요) |
| 공간 효율 | 높음 | 중간 (중복 버전) |
| 쓰기 증폭 | 낮음 | 높음 |
| 동시성 | 락 기반 | 락 프리 가능 |
| 적합 워크로드 | OLTP, 읽기 중심 | 로그, 시계열, 쓰기 중심 |

```
선택 가이드:

  읽기:쓰기 비율 > 10:1 → B-트리 (PostgreSQL, MySQL)
  읽기:쓰기 비율 < 2:1  → LSM (RocksDB, Cassandra)
  시계열/로그 데이터      → LSM (InfluxDB)
  범용 OLTP             → B-트리
```

LSM 트리의 Compaction은 dbi-09(분산 트랜잭션)에서 분산 저장소의 핵심 메커니즘으로 다시 등장합니다.

## 핵심 정리

- LSM 트리는 **쓰기를 Memtable에 버퍼링**하고 SSTable로 순차 기록하여 쓰기 처리량을 극대화합니다
- SSTable은 **정렬된 불변 파일**이며, Compaction으로 주기적으로 병합/정리됩니다
- **Leveled Compaction**은 읽기에, **Tiered Compaction**은 쓰기에 유리한 트레이드오프를 제공합니다
- **Bloom Filter**가 없으면 LSM의 읽기 성능은 실용적이지 않으며, 오탐률 1-2%로 대부분의 불필요한 읽기를 제거합니다
- B-트리는 **읽기 중심 OLTP**, LSM은 **쓰기 중심 워크로드**에 적합하며, 읽기:쓰기 비율로 선택합니다

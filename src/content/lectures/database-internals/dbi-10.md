# 최신 데이터베이스 트렌드

## 왜 최신 트렌드를 알아야 하는가

dbi-01~09까지 배운 저장 엔진, 인덱스, 트랜잭션, 분산 시스템의 원리는 **새로운 DB들이 어떤 문제를 해결하는지** 이해하는 기반입니다. 관계형 DB 하나로 모든 워크로드를 처리하던 시대는 지났습니다. 각 워크로드에 특화된 DB를 선택하고 조합하는 **Polyglot Persistence** 시대에, 각 DB의 내부 원리를 알아야 올바른 선택을 할 수 있습니다.

> **핵심 직관**: 새로운 DB가 등장하는 이유는 항상 같습니다—기존 DB의 **트레이드오프가 특정 워크로드에 맞지 않기 때문**입니다. 어떤 트레이드오프를 바꿨는지 이해하면 신기술을 정확히 평가할 수 있습니다.

## 1. NewSQL

```
NewSQL의 목표:
  NoSQL의 확장성 + RDBMS의 ACID 트랜잭션

  기존 선택지:
  ├─ RDBMS (PostgreSQL): ACID ✅, 수평 확장 ❌
  └─ NoSQL (Cassandra): ACID ❌, 수평 확장 ✅

  NewSQL: 둘 다 ✅

  대표 시스템:
  ┌──────────┬────────────────────────────────┐
  │ Spanner  │ TrueTime, 외부 일관성 (dbi-09) │
  │ CockroachDB │ Spanner 오픈소스 버전        │
  │ TiDB     │ MySQL 호환, Raft 기반          │
  │ YugabyteDB │ PostgreSQL 호환              │
  └──────────┴────────────────────────────────┘

  공통 아키텍처:
  - 컴퓨팅과 스토리지 분리
  - Raft 기반 합의 (dbi-07)
  - 자동 샤딩 + 리밸런싱 (dbi-08)
  - 분산 SQL 실행 엔진
```

| 특성 | 전통 RDBMS | NoSQL | NewSQL |
|------|-----------|-------|--------|
| ACID | 완전 | 제한적 | 완전 |
| 수평 확장 | 어려움 | 쉬움 | 쉬움 |
| SQL 지원 | 완전 | 제한적 | 완전 |
| 지연시간 | 매우 낮음 | 낮음 | 낮음~중간 |
| 운영 복잡도 | 낮음 | 중간 | 높음 |

## 2. 벡터 데이터베이스

```
벡터 DB의 등장 배경:

  LLM과 임베딩 모델의 보편화
  → "의미적으로 유사한 데이터"를 빠르게 찾는 수요 폭증

  기존 DB: WHERE name = 'AI' (정확한 매칭)
  벡터 DB: "AI와 비슷한 의미의 문서" (유사도 검색)

  핵심: 고차원 벡터의 근사 최근접 이웃 (ANN) 검색

  인덱스 알고리즘:
  ├─ HNSW (Hierarchical Navigable Small World)
  │   계층적 그래프, 검색 O(log N)
  │   메모리 많이 사용, 정확도 높음
  │
  ├─ IVF (Inverted File Index)
  │   클러스터링 기반, 가까운 클러스터만 검색
  │   메모리 적음, 정확도 중간
  │
  └─ PQ (Product Quantization)
      벡터를 압축하여 저장
      메모리 매우 적음, 정확도 낮음

  대표 시스템:
  Pinecone, Weaviate, Qdrant, Milvus
  + PostgreSQL pgvector (확장)
```

```sql
-- PostgreSQL pgvector 예시
CREATE EXTENSION vector;
CREATE TABLE documents (
    id SERIAL, content TEXT,
    embedding vector(1536)  -- OpenAI 임베딩 차원
);

CREATE INDEX ON documents
    USING hnsw (embedding vector_cosine_ops);

-- 유사 문서 검색 (코사인 유사도)
SELECT content, 1 - (embedding <=> '[0.1, 0.2, ...]') AS similarity
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 5;
```

> **핵심 직관**: 벡터 DB의 핵심 트레이드오프는 **정확도 vs 속도**입니다. ANN(Approximate Nearest Neighbor)은 100% 정확하지 않지만, 수억 벡터에서 ms 단위 응답을 가능하게 합니다. 대부분의 RAG 워크로드에서 95%+ 재현율이면 충분합니다.

## 3. 그래프 데이터베이스

```
관계형 DB의 한계:

  "A의 친구의 친구의 친구" = 3-depth 조인
  SELECT ... FROM users u1
  JOIN friends f1 ON u1.id = f1.user_id
  JOIN friends f2 ON f1.friend_id = f2.user_id
  JOIN friends f3 ON f2.friend_id = f3.user_id
  → depth가 깊어질수록 성능 급격히 저하

그래프 DB:
  노드와 에지를 직접 탐색
  → depth 증가에도 성능 일정

  모델:
  ├─ Property Graph (Neo4j)
  │   (User {name: "A"})-[:FRIEND]->(User {name: "B"})
  │
  └─ RDF Triple (Amazon Neptune)
      <A> <friend_of> <B>

  쿼리 언어:
  Cypher (Neo4j):
    MATCH (a:User)-[:FRIEND*1..3]->(b:User)
    WHERE a.name = '김철수'
    RETURN b.name

  적합: 소셜 네트워크, 추천, 사기 탐지, 지식 그래프
  부적합: 집계/분석 쿼리, 단순 CRUD
```

## 4. 시계열 데이터베이스

```
시계열 데이터 특성:
  - 쓰기 집중 (초당 수백만 포인트)
  - 시간순 삽입 (항상 최신 시간)
  - 오래된 데이터는 집계 후 삭제
  - 시간 범위 쿼리가 대부분

  일반 DB의 문제:
  └─ 초당 100만 포인트 INSERT는 B-트리에 과부하
     오래된 데이터 DELETE도 비용 큼

  시계열 DB 최적화:
  ├─ 시간 기반 파티셔닝 + TTL 자동 삭제
  ├─ LSM 기반 쓰기 최적화 (dbi-03)
  ├─ 열 저장 + 압축 (시계열 데이터의 높은 압축률)
  └─ 시간 집계 함수 내장 (downsampling)

  대표 시스템:
  ┌──────────┬─────────────────────────┐
  │ InfluxDB │ 자체 엔진, Flux 쿼리 언어 │
  │ TimescaleDB │ PostgreSQL 확장       │
  │ ClickHouse │ 열 저장 OLAP (시계열 겸용) │
  │ Prometheus │ 모니터링 특화           │
  └──────────┴─────────────────────────┘
```

## 5. HTAP (Hybrid Transactional/Analytical Processing)

```
기존 분리 아키텍처:

  [OLTP DB] ──ETL──→ [OLAP DW]
  PostgreSQL          Redshift/BigQuery

  문제:
  - ETL 지연 (실시간 분석 불가)
  - 인프라 이중화 비용
  - 데이터 불일치 위험

HTAP:
  하나의 시스템에서 OLTP + OLAP 동시 처리

  구현 방식:
  ├─ 행/열 이중 저장 (TiDB: TiKV + TiFlash)
  │   OLTP → 행 저장소 (TiKV)
  │   OLAP → 열 저장소 (TiFlash, 실시간 복제)
  │
  ├─ 인메모리 열 저장 (Oracle In-Memory)
  │   행 저장 테이블의 열 저장 미러
  │
  └─ 분리된 컴퓨팅 (AlloyDB)
      OLTP/OLAP 별도 컴퓨팅, 공유 스토리지
```

> **핵심 직관**: HTAP는 매력적이지만, 아직 "OLTP와 OLAP 각각의 전문 시스템"만큼의 성능은 내지 못합니다. **실시간 분석이 반드시 필요한 경우**에만 고려하고, 그렇지 않으면 전통적 분리 아키텍처가 더 안정적입니다.

## 6. 선택 가이드

```
워크로드별 DB 선택:

  [워크로드 파악]
  │
  ├─ 범용 OLTP → PostgreSQL, MySQL
  │   "대부분의 경우 PostgreSQL이면 충분합니다"
  │
  ├─ 글로벌 분산 OLTP → CockroachDB, TiDB
  │   "다중 리전 + 강한 일관성"
  │
  ├─ 쓰기 집중 → Cassandra, ScyllaDB
  │   "초당 수백만 쓰기, 결과적 일관성 OK"
  │
  ├─ 시계열/로그 → TimescaleDB, InfluxDB
  │   "시간순 데이터 + TTL"
  │
  ├─ 벡터 검색 → Pinecone, pgvector
  │   "LLM 임베딩 유사도 검색"
  │
  ├─ 그래프 탐색 → Neo4j
  │   "다중 홉 관계 탐색"
  │
  ├─ 분석/집계 → ClickHouse, BigQuery
  │   "대규모 OLAP"
  │
  └─ 캐시 → Redis
      "서브밀리초 읽기"
```

이 강의는 dbi-01~09의 원리를 바탕으로 현대 DB 생태계를 조망합니다. dp-01~12의 데이터 파이프라인 과정에서 이 DB들이 실제로 어떻게 조합되는지를 배웁니다.

## 핵심 정리

- **NewSQL**은 RDBMS의 ACID와 NoSQL의 수평 확장을 결합하며, CockroachDB와 TiDB가 대표적입니다
- **벡터 DB**는 고차원 임베딩의 ANN 검색에 특화되며, pgvector로 PostgreSQL에서도 사용 가능합니다
- **그래프 DB**는 다중 홉 관계 탐색에 최적화되어 소셜 네트워크, 사기 탐지 등에 적합합니다
- **시계열 DB**는 LSM + 열 저장 + TTL로 대량 시계열 데이터의 쓰기와 시간 범위 쿼리를 최적화합니다
- **HTAP**는 OLTP+OLAP을 통합하지만, 대부분의 경우 전통적 분리 아키텍처가 더 안정적이며 PostgreSQL이 범용 선택입니다

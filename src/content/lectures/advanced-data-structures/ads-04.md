# 확률적 자료구조

## 왜 확률적 자료구조를 알아야 하는가

10억 개의 URL 중에서 특정 URL을 이미 방문했는지 판단하려면? 정확한 해시 셋은 수십 GB 메모리가 필요합니다. **확률적 자료구조**는 소량의 메모리로 "아마도 있다" 또는 "확실히 없다"를 판단합니다. 약간의 오차를 허용하는 대신 **메모리를 수백~수천 배 절약**합니다. dbi-03의 Bloom Filter가 대표적 예시입니다.

> **핵심 직관**: 확률적 자료구조의 핵심 트레이드오프는 "정확성 vs 공간"입니다. 1%의 오탐(False Positive)을 허용하면 필요 메모리가 100배 줄어듭니다. 대부분의 대규모 시스템에서 이 트레이드오프는 충분히 가치 있습니다.

## 1. Bloom Filter

```
Bloom Filter:

  "이 원소가 집합에 있는가?" → "확실히 없다" or "아마 있다"

  구조: m비트 배열 + k개 해시 함수

  삽입 ("apple"):
  h1("apple") = 3  → bit[3] = 1
  h2("apple") = 7  → bit[7] = 1
  h3("apple") = 11 → bit[11] = 1

  조회 ("apple"):
  bit[3]=1, bit[7]=1, bit[11]=1 → "아마 있다" ✓

  조회 ("grape"):
  bit[2]=0 → "확실히 없다" ✓

  False Positive:
  bit[3]=1, bit[7]=1, bit[11]=1이지만 "grape"도 아닌 원소가
  우연히 이 비트들이 모두 1 → "아마 있다" (오탐!)

  삭제: 불가능 (비트를 0으로 하면 다른 원소도 영향)
```

```python
import mmh3  # MurmurHash3

class BloomFilter:
    def __init__(self, size, num_hashes):
        self.size = size
        self.num_hashes = num_hashes
        self.bits = [0] * size

    def add(self, item):
        for i in range(self.num_hashes):
            idx = mmh3.hash(item, i) % self.size
            self.bits[idx] = 1

    def might_contain(self, item):
        return all(
            self.bits[mmh3.hash(item, i) % self.size]
            for i in range(self.num_hashes)
        )
```

```
최적 파라미터 설계:

  n = 예상 원소 수, p = 허용 오탐률

  최적 비트 수: m = -n·ln(p) / (ln2)²
  최적 해시 수: k = (m/n)·ln2

  예: n=1억, p=1%
  m = 약 9.6억 비트 ≈ 120MB (원소당 9.6비트)
  k = 7

  비교: 정확한 HashSet = 수십 GB
  → 100배 이상 절약
```

## 2. Counting Bloom Filter

```
Counting Bloom Filter:

  비트 대신 카운터 사용 → 삭제 가능

  삽입: counter[h(x)] += 1
  삭제: counter[h(x)] -= 1  (0 미만이면 오류)
  조회: 모든 counter[h(x)] > 0이면 "아마 있다"

  단점: 메모리 4배 (비트 → 4비트 카운터)
  주의: 카운터 오버플로 (4비트 → 최대 15)
```

> **핵심 직관**: Bloom Filter의 실무 사용처를 알면 중요성이 체감됩니다. **Chrome 악성 URL 체크, Cassandra SSTable 조회(dbi-03), CDN 캐시 조회, 추천 시스템 중복 필터링** 등 대규모 시스템의 곳곳에서 사용됩니다.

## 3. Count-Min Sketch

```
Count-Min Sketch:

  "이 원소가 몇 번 등장했는가?" → 근사 빈도수

  구조: d×w 2D 카운터 배열 + d개 해시 함수

  삽입 ("apple"):
  row 0: counter[0][h0("apple")] += 1
  row 1: counter[1][h1("apple")] += 1
  row 2: counter[2][h2("apple")] += 1

  쿼리 ("apple"):
  min(counter[0][h0], counter[1][h1], counter[2][h2])
  → 최솟값이 근사 빈도 (항상 실제 이상)

  특성:
  - 과추정만 발생 (under-estimate 없음)
  - 오차: ε = e/w 확률 δ = e^(-d)
  - w = ⌈e/ε⌉, d = ⌈ln(1/δ)⌉
```

```python
class CountMinSketch:
    def __init__(self, width, depth):
        self.w = width
        self.d = depth
        self.table = [[0] * width for _ in range(depth)]

    def add(self, item, count=1):
        for i in range(self.d):
            j = mmh3.hash(item, i) % self.w
            self.table[i][j] += count

    def estimate(self, item):
        return min(
            self.table[i][mmh3.hash(item, i) % self.w]
            for i in range(self.d)
        )
```

## 4. HyperLogLog

```
HyperLogLog (HLL):

  "서로 다른 원소가 몇 개인가?" → 근사 카디널리티

  직관: 해시값의 선행 0비트 수로 카디널리티 추정
  선행 0이 k개 → 약 2^k개의 서로 다른 원소

  예: 해시값이 000101... → 선행 0이 3개 → ~8개 추정

  단일 추정은 분산이 큼 → 여러 버킷으로 분할

  HLL 동작:
  1. 원소 해시 → 앞 p비트 = 버킷 번호 (2^p개 버킷)
  2. 나머지 비트에서 선행 0 수 기록 (각 버킷의 최대)
  3. 모든 버킷의 조화 평균으로 추정

  공간: 2^p 버킷 × 6비트/버킷
  p=14 → 16384 버킷 × 6비트 = 12KB
  → 12KB로 수십억 개의 카디널리티를 2% 오차로 추정!

  실무: Redis PFADD/PFCOUNT 명령
```

> **핵심 직관**: HyperLogLog의 놀라운 점은 **12KB 메모리로 수십억 개의 고유값을 2% 오차로 셀 수 있다**는 것입니다. 정확한 카운팅은 수 GB가 필요합니다. 일일 활성 사용자(DAU), 고유 IP 수 등을 실시간으로 추적할 때 필수적입니다.

## 5. Cuckoo Filter

```
Cuckoo Filter:

  Bloom Filter의 개선: 삭제 지원 + 더 나은 공간 효율

  구조: 2개 이상의 버킷 + fingerprint 저장

  삽입 (x):
  f = fingerprint(x)
  i1 = hash(x)
  i2 = i1 XOR hash(f)  ← 부분 키 쿠쿠 해싱

  i1이나 i2에 빈 자리가 있으면 f 저장
  둘 다 차면 → 기존 원소를 쫓아내고 재배치

  삭제: fingerprint를 제거 (Counting BF보다 효율적)

  비교:
  ├─ 오탐률 < 3%: Cuckoo가 Bloom보다 공간 효율적
  └─ 오탐률 > 3%: Bloom이 더 효율적
```

## 6. 실전 선택 가이드

| 질문 | 자료구조 | 공간 | 오차 |
|------|---------|------|------|
| "존재하는가?" | Bloom / Cuckoo Filter | 원소당 ~10비트 | FP 1% |
| "몇 번 등장?" | Count-Min Sketch | 고정 크기 | 과추정 |
| "몇 종류?" | HyperLogLog | ~12KB | 2% |
| "상위 K개?" | Count-Min + Heap | 고정 크기 | 근사 |

확률적 자료구조는 dbi-03의 LSM 트리(Bloom Filter), dp-03의 스트림 처리(HLL로 실시간 카디널리티), 대규모 시스템 설계의 필수 도구입니다.

## 핵심 정리

- **Bloom Filter**는 "확실히 없다/아마 있다"를 판단하며, 원소당 ~10비트로 1% 오탐률을 달성합니다
- **Count-Min Sketch**는 빈도수를 근사 추정하며, 항상 과추정(never undercount)하는 특성이 있습니다
- **HyperLogLog**는 12KB 메모리로 수십억 개의 카디널리티를 2% 오차로 추정합니다
- **Cuckoo Filter**는 Bloom Filter에 삭제 기능을 추가하고, 낮은 오탐률에서 더 공간 효율적입니다
- 확률적 자료구조의 핵심은 **"약간의 오차를 허용하여 메모리를 100배 이상 절약"**하는 트레이드오프입니다

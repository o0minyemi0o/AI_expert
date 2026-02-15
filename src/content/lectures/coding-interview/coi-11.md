# 시스템 코딩 문제

## 왜 시스템 코딩 문제가 중요한가

시스템 코딩 문제는 단순한 알고리즘 문제와 달리, **실제 시스템에서 사용되는 자료구조와 알고리즘을 설계하고 구현**하는 능력을 검증합니다. LRU 캐시, 레이트 리미터, 스트리밍 알고리즘 등은 실무에서 매일 접하는 컴포넌트이며, 이를 처음부터 구현할 수 있어야 시니어 수준의 엔지니어로 인정받습니다.

> **핵심 직관**: 시스템 코딩 문제는 "정확성 + 효율성 + API 설계" 세 가지를 동시에 평가합니다. 올바른 자료구조 선택이 이 세 가지를 모두 결정합니다.

## 1. LRU 캐시

LRU(Least Recently Used) 캐시는 시스템 코딩 문제의 대표 주제입니다. **해시맵 + 이중 연결 리스트**로 O(1) get/put을 구현합니다.

```
LRU 캐시 구조:

  HashMap: key → Node
  Doubly Linked List: Head ↔ ... ↔ Tail
                      (MRU)       (LRU)

  get(key):  HashMap으로 O(1) 조회 → 노드를 Head로 이동
  put(key):  용량 초과 시 Tail(LRU) 제거 → 새 노드 Head에 추가
```

```python
# LRU Cache — O(1) get/put
class Node:
    def __init__(self, key: int = 0, val: int = 0):
        self.key = key
        self.val = val
        self.prev = None
        self.next = None

class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}  # key → Node
        # 센티널 노드
        self.head = Node()
        self.tail = Node()
        self.head.next = self.tail
        self.tail.prev = self.head

    def _remove(self, node: Node):
        node.prev.next = node.next
        node.next.prev = node.prev

    def _add_to_front(self, node: Node):
        node.next = self.head.next
        node.prev = self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key: int) -> int:
        if key not in self.cache:
            return -1
        node = self.cache[key]
        self._remove(node)
        self._add_to_front(node)
        return node.val

    def put(self, key: int, value: int):
        if key in self.cache:
            self._remove(self.cache[key])
        node = Node(key, value)
        self._add_to_front(node)
        self.cache[key] = node
        if len(self.cache) > self.capacity:
            lru = self.tail.prev
            self._remove(lru)
            del self.cache[lru.key]
```

## 2. LFU 캐시

LFU(Least Frequently Used) 캐시는 LRU보다 복잡하며, 빈도별 이중 연결 리스트를 관리합니다.

| 캐시 정책 | 퇴출 기준 | 자료구조 | 복잡도 |
|----------|----------|----------|--------|
| LRU | 가장 오래 미사용 | HashMap + DLL | O(1) |
| LFU | 가장 적게 사용 | HashMap + 빈도별 DLL | O(1) |
| FIFO | 가장 먼저 삽입 | HashMap + Queue | O(1) |
| TTL | 만료 시간 | HashMap + 힙 | O(log n) |

```python
# 간소화된 LFU Cache (OrderedDict 활용) — O(1) get/put
from collections import defaultdict, OrderedDict

class LFUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.key_val = {}        # key → value
        self.key_freq = {}       # key → frequency
        self.freq_keys = defaultdict(OrderedDict)  # freq → {key: None}
        self.min_freq = 0

    def get(self, key: int) -> int:
        if key not in self.key_val:
            return -1
        self._increase_freq(key)
        return self.key_val[key]

    def put(self, key: int, value: int):
        if self.capacity == 0:
            return
        if key in self.key_val:
            self.key_val[key] = value
            self._increase_freq(key)
            return
        if len(self.key_val) >= self.capacity:
            evict_key, _ = self.freq_keys[self.min_freq].popitem(last=False)
            del self.key_val[evict_key]
            del self.key_freq[evict_key]
        self.key_val[key] = value
        self.key_freq[key] = 1
        self.freq_keys[1][key] = None
        self.min_freq = 1

    def _increase_freq(self, key: int):
        freq = self.key_freq[key]
        del self.freq_keys[freq][key]
        if not self.freq_keys[freq] and freq == self.min_freq:
            self.min_freq += 1
        self.key_freq[key] = freq + 1
        self.freq_keys[freq + 1][key] = None
```

## 3. 레이트 리미터

```python
# 슬라이딩 윈도우 레이트 리미터 — O(1) 평균
import time
from collections import deque

class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: float):
        self.max_requests = max_requests
        self.window = window_seconds
        self.requests = deque()  # 타임스탬프 큐

    def allow_request(self) -> bool:
        now = time.time()
        # 윈도우 밖의 오래된 요청 제거
        while self.requests and self.requests[0] <= now - self.window:
            self.requests.popleft()
        if len(self.requests) < self.max_requests:
            self.requests.append(now)
            return True
        return False

# 토큰 버킷 레이트 리미터 — O(1)
class TokenBucket:
    def __init__(self, rate: float, capacity: int):
        self.rate = rate          # 초당 토큰 생성 수
        self.capacity = capacity  # 최대 토큰 수
        self.tokens = capacity
        self.last_time = time.time()

    def allow_request(self) -> bool:
        now = time.time()
        elapsed = now - self.last_time
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.last_time = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
```

> **핵심 직관**: 레이트 리미터는 "시간 윈도우"와 "카운터"의 조합이며, 분산 환경에서는 Redis 같은 중앙 저장소가 필요합니다. 면접에서 이런 확장 논의를 자발적으로 꺼내면 좋습니다.

## 4. 스트리밍 알고리즘

대용량 데이터 스트림에서 제한된 메모리로 통계를 계산하는 알고리즘입니다.

```python
# Reservoir Sampling — 스트림에서 k개 균일 샘플링
# O(n) 시간, O(k) 공간
import random

def reservoir_sample(stream, k: int) -> list:
    reservoir = []
    for i, item in enumerate(stream):
        if i < k:
            reservoir.append(item)
        else:
            j = random.randint(0, i)
            if j < k:
                reservoir[j] = item
    return reservoir

# 이동 중앙값 (두 개의 힙) — O(log n) 삽입, O(1) 조회
import heapq

class MedianFinder:
    def __init__(self):
        self.max_heap = []  # 왼쪽 절반 (음수로 저장)
        self.min_heap = []  # 오른쪽 절반

    def add_num(self, num: int):
        heapq.heappush(self.max_heap, -num)
        # max_heap의 최대값을 min_heap으로 이동
        heapq.heappush(self.min_heap, -heapq.heappop(self.max_heap))
        # 크기 균형 유지
        if len(self.min_heap) > len(self.max_heap):
            heapq.heappush(self.max_heap, -heapq.heappop(self.min_heap))

    def find_median(self) -> float:
        if len(self.max_heap) > len(self.min_heap):
            return -self.max_heap[0]
        return (-self.max_heap[0] + self.min_heap[0]) / 2.0
```

## 5. 시나리오: 타임스탬프 기반 키-값 저장소

**문제**: `set(key, value, timestamp)`와 `get(key, timestamp)`를 지원하는 키-값 저장소를 구현하시오. get은 해당 timestamp 이하의 가장 최근 값을 반환합니다.

```
접근법:
  key별로 (timestamp, value) 리스트 유지
  get 시 이분 탐색으로 O(log n) 조회 (coi-08)
```

```python
# TimeMap — set O(1), get O(log n)
from collections import defaultdict
import bisect

class TimeMap:
    def __init__(self):
        self.store = defaultdict(list)  # key → [(timestamp, value)]

    def set(self, key: str, value: str, timestamp: int):
        self.store[key].append((timestamp, value))

    def get(self, key: str, timestamp: int) -> str:
        if key not in self.store:
            return ""
        entries = self.store[key]
        # 이분 탐색: timestamp 이하의 최대 인덱스
        idx = bisect.bisect_right(entries, (timestamp, chr(127))) - 1
        if idx < 0:
            return ""
        return entries[idx][1]
```

> **핵심 직관**: 시스템 코딩 문제에서는 "어떤 자료구조 조합이 모든 연산을 효율적으로 만드는가"를 먼저 설계하고 구현에 들어가야 합니다. API를 먼저 정의하고 내부를 채우는 순서가 효과적입니다.

## 6. 시스템 코딩 문제 패턴 정리

```
문제 유형                    핵심 자료구조
──────────────────────────────────────────────
LRU/LFU 캐시              → HashMap + DLL
레이트 리미터              → 큐 or 토큰 버킷
타임스탬프 저장소           → HashMap + 이분 탐색
스트리밍 중앙값            → 두 개의 힙
이터레이터 설계            → 스택 + 제너레이터
스냅샷 배열               → HashMap + 이분 탐색
트위터 피드 설계           → 힙 + HashMap
```

시스템 코딩 문제는 advanced-data-structures 과정의 자료구조 지식과 coi-02~coi-08의 알고리즘 패턴을 종합적으로 활용합니다. 또한 이 문제들은 시스템 설계 인터뷰의 축소 버전이기도 합니다.

## 핵심 정리

- **LRU 캐시**는 HashMap + 이중 연결 리스트로 O(1) get/put을 구현하며, 시스템 코딩의 대표 문제입니다
- **레이트 리미터**는 슬라이딩 윈도우(큐)와 토큰 버킷 두 가지 접근이 있으며, 분산 환경 확장을 논의합니다
- **스트리밍 알고리즘**(Reservoir Sampling, 이동 중앙값)은 제한된 메모리에서 대용량 데이터를 처리합니다
- 시스템 코딩의 핵심은 **"모든 연산이 효율적인 자료구조 조합"**을 먼저 설계하는 것입니다
- API를 **먼저 정의**하고, 내부 자료구조를 설계하고, 마지막에 구현하는 순서를 따릅니다

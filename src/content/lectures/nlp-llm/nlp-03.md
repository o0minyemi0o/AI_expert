# Transformer 해부학

## 왜 Transformer를 깊이 이해해야 하는가

Transformer는 현대 NLP의 **기반 아키텍처**입니다. BERT, GPT, T5, LLaMA—모두 Transformer의 변형입니다. nlp-02에서 Attention이 왜 필요한지를 배웠다면, 이 강의에서는 Transformer의 모든 구성 요소를 수학적으로 해부합니다. Self-Attention의 행렬 연산, Multi-Head의 의미, Positional Encoding의 설계, 그리고 이것들이 어떻게 조합되어 강력한 시퀀스 모델링을 이루는지를 다룹니다.

> **핵심 직관**: Transformer의 핵심 혁신은 **"모든 위치 쌍 간의 관계를 병렬로 계산"**하는 것입니다. RNN이 한 토큰씩 순차 처리하는 동안, Self-Attention은 $N$ 토큰 간의 $N^2$ 관계를 단 한 번의 행렬 곱으로 계산합니다. 이 병렬성이 대규모 사전학습을 가능하게 했습니다.

## 1. Self-Attention 메커니즘

```
Self-Attention의 직관:

  입력: "The cat sat on the mat because it was tired"
  "it"이 가리키는 것은? → "cat" (coreference)

  Self-Attention은 각 토큰이 같은 시퀀스 내의
  다른 모든 토큰과의 관련성을 계산

  nlp-02의 Encoder-Decoder Attention:
    디코더 → 인코더를 참조 (서로 다른 시퀀스)
  Self-Attention:
    자기 자신 → 자기 자신을 참조 (같은 시퀀스)

Query, Key, Value (QKV):
  각 입력 토큰 x_i에서 세 벡터를 생성:
  q_i = W_Q x_i  (Query: "내가 찾고 싶은 것")
  k_i = W_K x_i  (Key: "내가 제공하는 정보의 라벨")
  v_i = W_V x_i  (Value: "내가 제공하는 실제 정보")

  유추: 도서관 검색
  Query = 검색어 ("고양이에 대한 책")
  Key = 책의 제목/태그
  Value = 책의 내용
  → Query와 Key의 유사도로 어떤 Value를 읽을지 결정
```

```
Scaled Dot-Product Attention:

  Attention(Q, K, V) = softmax(QK^T / √d_k) V

  단계별:
  1. QK^T: 모든 Query-Key 쌍의 내적 → [N × N] 행렬
  2. / √d_k: 스케일링 (내적 값이 너무 커지면 softmax 포화)
  3. softmax: 각 행을 확률 분포로 변환
  4. × V: 가중 평균으로 출력 생성

  왜 √d_k로 나누는가?
  q와 k의 각 요소가 평균 0, 분산 1이면
  q·k의 분산 = d_k (차원 수에 비례!)
  d_k = 512면 내적 값이 ~22 범위
  → softmax가 거의 one-hot이 되어 그래디언트 소실
  → √d_k로 나누면 분산이 1로 정규화

수치 예시 (d_k = 4):
  Q = [1, 0, 1, 0]  (토큰 "it")
  K₁ = [1, 1, 0, 0]  (토큰 "cat")
  K₂ = [0, 0, 1, 1]  (토큰 "mat")

  score₁ = Q·K₁ / √4 = 1/2 = 0.5
  score₂ = Q·K₂ / √4 = 1/2 = 0.5
  → softmax → [0.5, 0.5] (균등 참조)

  실제로는 학습된 W_Q, W_K가
  "it→cat" 관계에 높은 점수를 주도록 조정됨
```

> **핵심 직관**: Self-Attention의 $QK^T$는 la-01에서 배운 **외적(outer product) 패턴**의 배치 버전입니다. 모든 쌍별 유사도를 한 번의 행렬 곱으로 계산하며, 이것이 GPU 병렬화에 완벽히 적합한 이유입니다.

## 2. Multi-Head Attention

```
Multi-Head Attention:

  단일 Attention의 한계:
  하나의 어텐션은 하나의 "관계 유형"만 포착
  "The cat sat on the mat because it was tired"
  → "it"→"cat" (대명사 참조)도, "it"→"tired" (속성)도 중요

  해결: 여러 개의 어텐션을 병렬 실행

  MultiHead(Q, K, V) = Concat(head₁, ..., head_h) W_O
  where head_i = Attention(Q W_Q^i, K W_K^i, V W_V^i)

  d_model = 512, h = 8 헤드일 때:
  d_k = d_v = d_model / h = 64
  각 헤드는 64차원에서 독립적 어텐션

  | 구분 | 크기 |
  |------|------|
  | W_Q^i, W_K^i | d_model × d_k = 512 × 64 |
  | W_V^i | d_model × d_v = 512 × 64 |
  | W_O | h × d_v × d_model = 512 × 512 |
  | 총 파라미터 | 4 × d_model² (QKV + O) |

  헤드별 역할 (학습 후 관찰):
  ├─ Head 1: 구문적 관계 (주어-동사)
  ├─ Head 2: 대명사 해소 (it→cat)
  ├─ Head 3: 인접 토큰 관계
  ├─ Head 4: 위치 기반 패턴
  └─ ...각 헤드가 다른 "관점"을 학습

  계산 비용:
  단일 큰 어텐션 (d=512) vs 8개 작은 어텐션 (d=64)
  총 계산량은 거의 동일! (8 × 64² ≈ 512² / 8)
  하지만 표현력은 크게 향상
```

## 3. Positional Encoding

```
왜 위치 정보가 필요한가:
  Self-Attention은 집합(set) 연산 — 순서를 모름!
  QK^T는 위치와 무관하게 내적만 계산
  → "I love you" vs "you love I" 구분 불가

  해결: 위치 정보를 입력에 추가

원래 Transformer의 Sinusoidal Encoding:
  PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
  PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))

  pos: 토큰 위치 (0, 1, 2, ...)
  i: 차원 인덱스 (0, 1, ..., d/2-1)

  직관:
  ├─ 각 차원이 다른 주파수의 사인/코사인
  ├─ 낮은 차원: 고주파 → 인접 위치 구분
  ├─ 높은 차원: 저주파 → 먼 위치 구분
  └─ 이진수의 각 비트와 유사한 구조

  핵심 성질: PE(pos+k)는 PE(pos)의 선형 변환
  → 상대 위치 관계가 내적으로 포착 가능

학습 가능한 위치 임베딩 (Learned PE):
  각 위치에 학습 가능한 벡터 할당
  E_pos ∈ R^{max_len × d_model}

  장점: 더 유연, 실무에서 더 많이 사용 (BERT, GPT)
  단점: 학습 시 본 최대 길이 이상 일반화 불가

  Sinusoidal vs Learned:
  성능 차이 거의 없음 (원 논문에서도 언급)
  현대 LLM은 대부분 Learned PE 사용
  하지만 RoPE, ALiBi 등 개선된 방식 등장 (nlp-11)
```

## 4. Feed-Forward Network와 레이어 구성

```
Position-wise Feed-Forward Network (FFN):
  FFN(x) = max(0, xW₁ + b₁)W₂ + b₂
  또는: FFN(x) = GELU(xW₁ + b₁)W₂ + b₂

  W₁: d_model → d_ff (보통 d_ff = 4 × d_model)
  W₂: d_ff → d_model

  d_model = 512, d_ff = 2048일 때:
  512 → 2048 → 512
  → 확장 후 압축 (정보 혼합)

  "position-wise": 각 위치에 독립적으로 적용
  → Self-Attention이 위치 간 정보를 섞었다면,
    FFN은 각 위치의 표현을 변환/풍부화

  FFN의 역할 (해석 연구):
  ├─ "지식 저장소": 사실적 지식이 FFN 가중치에 인코딩
  ├─ Key-Value 메모리: W₁의 행 = 키, W₂의 열 = 값
  └─ 비선형 변환: ReLU/GELU가 특정 패턴을 활성화

Transformer 레이어 구성:
  하나의 레이어:
    x → LayerNorm → Multi-Head Attention → + (잔차) →
    → LayerNorm → FFN → + (잔차) → output

  잔차 연결 (Residual Connection):
    output = x + Sublayer(LayerNorm(x))
    → 그래디언트가 직접 흐르는 경로 제공
    → dl-03의 ResNet과 동일한 원리

  Layer Normalization:
    각 토큰의 활성화를 정규화
    LN(x) = (x - μ) / σ · γ + β
    → 학습 안정화, dl-07에서 상세히

  Pre-LN vs Post-LN:
  ├─ Post-LN (원래): Sublayer → Add → LN
  │   학습 불안정, 워밍업 필요
  ├─ Pre-LN (현대): LN → Sublayer → Add
  │   학습 안정적, 대부분의 LLM이 사용
  └─ 성능: 비슷하지만 Pre-LN이 학습이 쉬움
```

> **핵심 직관**: Transformer 레이어에서 **Self-Attention은 "위치 간 정보 교환"**, **FFN은 "위치별 정보 변환"**을 담당합니다. Self-Attention이 "누구의 정보가 필요한가"를 결정하면, FFN이 그 정보를 "어떻게 활용할 것인가"를 결정합니다.

## 5. 전체 Transformer 아키텍처

```
Encoder (N=6 레이어 스택):
  입력 → Embedding + PE → [Encoder Layer × N]
  각 레이어:
    Multi-Head Self-Attention → Add & Norm
    → Feed-Forward → Add & Norm

Decoder (N=6 레이어 스택):
  출력(시프트) → Embedding + PE → [Decoder Layer × N]
  각 레이어:
    Masked Multi-Head Self-Attention → Add & Norm
    → Multi-Head Cross-Attention → Add & Norm
    → Feed-Forward → Add & Norm

  Masked Self-Attention:
    미래 토큰을 볼 수 없도록 마스킹
    "I am a"를 생성할 때 "student"를 볼 수 없음
    → 상삼각 행렬에 -∞ → softmax 후 0

  Cross-Attention:
    Q = 디코더 상태, K,V = 인코더 출력
    → nlp-02의 Encoder-Decoder Attention과 동일

Transformer-base 설정:
  | 하이퍼파라미터 | 값 |
  |---------------|-----|
  | d_model | 512 |
  | d_ff | 2048 |
  | h (헤드 수) | 8 |
  | N (레이어 수) | 6 |
  | d_k = d_v | 64 |
  | 파라미터 수 | ~65M |

Transformer-big:
  d_model=1024, h=16, N=6 → ~213M
```

```
계산 복잡도 비교:

  | 모델 | 레이어당 복잡도 | 순차 연산 | 최대 경로 |
  |------|----------------|----------|----------|
  | RNN | O(N·d²) | O(N) | O(N) |
  | CNN | O(N·k·d²) | O(1) | O(log_k N) |
  | Self-Attn | O(N²·d) | O(1) | O(1) |

  Self-Attention:
  ├─ 장점: 최대 경로 O(1) → 어떤 두 토큰도 직접 연결
  ├─ 장점: 순차 연산 O(1) → 완전 병렬화
  └─ 단점: N²에 비례 → 긴 시퀀스에서 비효율

  N = 512일 때: N² = 262,144 — 관리 가능
  N = 4096일 때: N² = 16,777,216 — 문제
  N = 100,000일 때: N² = 10^10 — 불가능
  → nlp-11에서 효율적 어텐션을 다룹니다
```

## 6. Transformer의 작동 원리 해석

```
각 레이어가 하는 일 (해석 연구 결과):

  초기 레이어 (1-2):
  ├─ 토큰 정체성, 위치 정보
  ├─ 인접 토큰 관계
  └─ 기본 구문 구조

  중간 레이어 (3-4):
  ├─ 구문 분석 (주어-동사-목적어)
  ├─ 대명사 해소 (it→cat)
  └─ 의미적 유사성

  후기 레이어 (5-6):
  ├─ 과업별 특화 표현
  ├─ 추상적 의미 관계
  └─ 최종 예측 준비

  "잔차 스트림(Residual Stream)" 관점:
  각 레이어가 잔차 연결을 통해 정보를 "추가"
  → 정보가 축적되는 스트림을 따라 흐름
  → 초기 레이어의 정보도 최종 출력에 직접 접근 가능

왜 Transformer가 이렇게 잘 작동하는가:
  1. 유연한 어텐션: 어떤 의존성이든 학습 가능
  2. 병렬 처리: GPU 활용 극대화 → 큰 데이터/모델
  3. 잔차 연결: 깊은 모델도 안정적 학습
  4. 스케일링: 데이터와 파라미터 증가에 비례하여 성능 향상
  → nlp-06의 스케일링 법칙과 직접 연결
```

## 핵심 정리

- **Self-Attention**은 $\text{softmax}(QK^T/\sqrt{d_k})V$로 모든 위치 쌍의 관계를 병렬 계산하며, Query-Key-Value 패러다임으로 "소프트 검색"을 수행합니다
- **Multi-Head Attention**은 여러 독립적 어텐션 헤드를 병렬 실행하여 구문, 의미, 위치 등 다양한 관계를 동시에 포착합니다
- **Positional Encoding**은 Self-Attention의 순서 불변성을 보완하며, Sinusoidal과 Learned 방식이 있고, 현대 LLM은 RoPE 등 개선된 방식을 사용합니다
- Transformer 레이어는 **Self-Attention(위치 간 정보 교환) + FFN(위치별 정보 변환) + 잔차 연결 + LayerNorm**으로 구성됩니다
- Self-Attention의 $O(N^2)$ 복잡도가 장점(전역 연결)이자 한계(긴 시퀀스)이며, 이 트레이드오프가 효율적 어텐션 연구를 이끌고 있습니다

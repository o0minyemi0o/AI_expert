# Seq2Seq와 Attention의 탄생

## 왜 Seq2Seq가 중요한가

nlp-01의 Word2Vec이 "단어를 벡터로" 바꿨다면, **Seq2Seq(Sequence-to-Sequence)**는 "문장을 문장으로" 변환하는 프레임워크입니다. 기계 번역, 요약, 대화 시스템 등 입력과 출력의 길이가 다른 문제를 통합적으로 풀 수 있습니다. 그리고 Seq2Seq의 병목을 해결한 **Attention 메커니즘**은 이후 Transformer(nlp-03)의 핵심 빌딩 블록이 됩니다.

> **핵심 직관**: Seq2Seq의 근본 문제는 **"가변 길이 입력을 고정 크기 벡터 하나로 압축"**하는 것입니다. 100단어 문장의 정보를 256차원 벡터 하나에 넣으려 하면 정보가 손실됩니다. Attention은 "압축 대신, 필요한 순간에 원본을 직접 참조하라"는 해결책입니다.

## 1. Encoder-Decoder 구조

```
Seq2Seq (Sutskever et al., 2014):

  Encoder: 입력 시퀀스를 고정 길이 벡터로 압축
  Decoder: 그 벡터로부터 출력 시퀀스를 생성

  입력: "나는 학생이다"
  Encoder: RNN이 각 토큰을 순차 처리
    h₁ = RNN(x₁="나는", h₀)
    h₂ = RNN(x₂="학생이다", h₁)
  → 최종 히든 스테이트 h₂ = "문맥 벡터(context vector)"

  Decoder: 문맥 벡터에서 출력 생성
    s₁ = RNN(<SOS>, h₂) → "I"
    s₂ = RNN("I", s₁) → "am"
    s₃ = RNN("am", s₂) → "a"
    s₄ = RNN("a", s₃) → "student"
    s₅ = RNN("student", s₄) → <EOS>

  핵심 구조:
  [x₁, x₂, ..., xₙ] → Encoder → c → Decoder → [y₁, y₂, ..., yₘ]
                                  ↑
                        고정 크기 벡터 (bottleneck!)
```

```
학습:
  P(y₁, ..., yₘ | x₁, ..., xₙ) = Π P(yₜ | y₁, ..., yₜ₋₁, c)
  Teacher Forcing: 학습 시 이전 출력 대신 정답을 입력으로 사용

  디코딩 전략:
  ├─ Greedy: 매 스텝 최고 확률 토큰 선택
  ├─ Beam Search: 상위 k개 후보를 동시 추적
  │   beam_size = 5가 일반적
  │   너무 크면 일반적/지루한 출력 경향
  └─ Sampling: 확률 분포에서 샘플링 (temperature 조절)

  Beam Search 예시 (beam=2):
  Step 1: "I"(0.6), "The"(0.3)
  Step 2: "I am"(0.4), "I was"(0.15), "The cat"(0.2)
  → 상위 2개: "I am"(0.4), "The cat"(0.2) 유지
  → 최종: 누적 확률 최고 시퀀스 선택
```

## 2. RNN/LSTM의 한계

```
고정 길이 병목 (Fixed-Length Bottleneck):
  "나는 어제 서울에서 부산까지 KTX를 타고 갔다"
  → 9개 토큰의 정보를 256차원 벡터 하나에?

  실험 결과 (Cho et al., 2014):
  문장 길이 10~20: BLEU 20+
  문장 길이 30~50: BLEU 급락
  → 긴 문장일수록 정보 손실 심각

장거리 의존성 (Long-Range Dependencies):
  "The cat, which I adopted from the shelter last year, is sleeping."
  "cat"과 "is"의 관계: 10단어 이상 떨어져 있음

  RNN: h_t = tanh(W_h h_{t-1} + W_x x_t)
  그래디언트: ∂h_T/∂h_t = Π_{k=t}^{T-1} W_h · diag(tanh')
  → |λ_max(W_h)| < 1이면 그래디언트 소실
  → |λ_max(W_h)| > 1이면 그래디언트 폭발

  LSTM/GRU가 게이트로 완화하지만 완전히 해결하지는 못함
  → dl-04에서 다룬 LSTM의 forget gate가 핵심

순차 처리의 비효율:
  h_t는 h_{t-1}에 의존 → 병렬화 불가능
  GPU의 수천 코어를 제대로 활용하지 못함
  → Transformer가 해결할 핵심 문제
```

## 3. Bahdanau Attention

```
Bahdanau Attention (2014) — "Additive Attention":

  핵심 아이디어: 디코더가 매 스텝마다
  "인코더의 어떤 위치를 볼 것인가?"를 동적으로 결정

  인코더 출력: h₁, h₂, ..., hₙ (모든 히든 스테이트 보존!)
  디코더 상태: sₜ₋₁

  1. 정렬 점수 (Alignment Score):
     e_{t,i} = v^T tanh(W_s s_{t-1} + W_h h_i)
     → 디코더 상태와 인코더 각 위치의 "관련성" 계산

  2. 어텐션 가중치 (Attention Weights):
     α_{t,i} = softmax(e_{t,i}) = exp(e_{t,i}) / Σ_j exp(e_{t,j})
     → 각 인코더 위치에 대한 "관심도"

  3. 문맥 벡터 (Context Vector):
     c_t = Σ_i α_{t,i} · h_i
     → 가중 평균으로 인코더 정보 집약

  4. 디코더 갱신:
     s_t = RNN(y_{t-1}, s_{t-1}, c_t)
     → 매 스텝마다 다른 문맥 벡터 사용!

  기존: 하나의 고정 벡터 c
  Attention: 매 스텝마다 다른 c_t
  → 동적으로 "어디를 볼지" 결정
```

```
어텐션의 시각적 이해:

  번역: "I am a student" → "나는 학생이다"

  "나는" 생성 시:    "학생이다" 생성 시:
  I     [████░░]     I      [░░░░░░]
  am    [██░░░░]     am     [░░░░░░]
  a     [░░░░░░]     a      [██░░░░]
  student[░░░░░░]    student[██████]

  → "나는"을 생성할 때는 "I", "am"에 집중
  → "학생이다"를 생성할 때는 "student"에 집중
  → 어텐션 가중치가 단어 정렬(alignment)을 학습!
```

> **핵심 직관**: Bahdanau Attention은 **"소프트 검색(soft retrieval)"**입니다. 데이터베이스에서 쿼리로 관련 레코드를 검색하듯, 디코더 상태(쿼리)로 인코더 히든 스테이트(데이터베이스)에서 관련 정보를 가중 검색합니다. 이 Query-Key-Value 직관이 nlp-03의 Self-Attention으로 이어집니다.

## 4. Luong Attention

```
Luong Attention (2015) — "Multiplicative Attention":

  Bahdanau와의 차이:

  Bahdanau (Additive):
    e_{t,i} = v^T tanh(W_s s_{t-1} + W_h h_i)
    → 덧셈 + tanh + 투영 벡터 v

  Luong (Multiplicative):
    e_{t,i} = s_t^T W h_i        (General)
    e_{t,i} = s_t^T h_i           (Dot-product)
    → 행렬 곱셈, 더 단순하고 빠름

  | 방식 | 계산 | 장점 |
  |------|------|------|
  | Additive | v^T tanh(W[s;h]) | 표현력 높음 |
  | Dot-product | s^T h | 빠름, 단순 |
  | General | s^T W h | 차원 다를 때 |
  | Scaled dot | s^T h / √d | 안정적 (Transformer!) |

  Luong의 추가 기여:
  ├─ Global Attention: 모든 인코더 위치 참조 (위의 방식)
  ├─ Local Attention: 예측된 위치 근처만 참조
  │   → 계산 효율적, 긴 문장에 유리
  └─ Input-feeding: 이전 어텐션 정보를 다음 디코더 입력에 연결

  Scaled Dot-Product의 중요성:
  차원 d가 클 때 내적 값이 커져 softmax가 극단화
  → √d로 나누어 안정화
  → 이것이 정확히 Transformer의 attention입니다!
```

## 5. Attention의 변형과 확장

```
Copy Mechanism (Pointer Network, Vinyals et al., 2015):
  어텐션으로 입력의 특정 토큰을 직접 "복사"
  → 이름, 숫자 등 어휘에 없는 토큰 처리

  P(y_t) = p_gen × P_vocab(y_t) + (1 - p_gen) × Σ α_{t,i}
  → 생성 확률 + 복사 확률의 혼합

  응용: 요약(원문 구절 복사), 코드 생성(변수명 복사)

Coverage Mechanism (Tu et al., 2016):
  같은 소스 위치를 반복 참조하는 문제 해결
  커버리지 벡터: 지금까지 각 위치에 쏟은 어텐션 누적
  → 이미 많이 본 위치의 어텐션을 줄임
  → 반복 번역 방지

Multi-Head Attention (잠깐 예고):
  어텐션을 여러 "헤드"로 분할
  → 각 헤드가 다른 관계를 포착
  → nlp-03에서 Transformer의 핵심으로 상세히 다룸

Self-Attention (잠깐 예고):
  인코더↔디코더가 아닌, 자기 자신 내부에서 어텐션
  → "I love my cat because it is cute"
  → "it"이 "cat"을 참조하는 관계를 학습
  → nlp-03에서 상세히
```

## 6. Seq2Seq에서 Transformer로의 전환

```
Seq2Seq + Attention의 한계:

  1. 순차 처리: RNN은 본질적으로 순차적
     → GPU 병렬화의 이점을 충분히 활용 못함
     → 학습 시간이 데이터/모델 크기에 선형적

  2. Attention의 역할 확대:
     실험적으로 RNN 없이 Attention만으로도
     좋은 성능을 보이는 경우 발견

  3. 장거리 의존성:
     LSTM + Attention으로 개선되었지만,
     300+ 토큰에서는 여전히 성능 저하

"Attention Is All You Need" (Vaswani et al., 2017):
  "RNN을 완전히 제거하고 Attention만으로 구성하면?"

  핵심 통찰:
  ├─ Self-Attention으로 입력 내부의 관계 포착
  ├─ 위치 정보는 Positional Encoding으로 보충
  ├─ 순차 의존성 제거 → 완전한 병렬 처리
  └─ 레이어 쌓기로 깊은 표현 학습

  Seq2Seq의 유산:
  ├─ Encoder-Decoder 구조: Transformer에도 유지
  ├─ Attention 메커니즘: Transformer의 핵심이 됨
  ├─ Teacher Forcing: 자기회귀 학습의 표준
  └─ Beam Search: LLM 디코딩에도 여전히 사용

  → nlp-03에서 Transformer를 완전히 해부합니다
```

> **핵심 직관**: Seq2Seq→Attention→Transformer의 진화는 **"인간이 설계한 귀납적 편향(RNN의 순차성)을 데이터가 학습한 유연한 관계(Attention)로 대체"**하는 과정입니다. RNN은 "순서가 중요하다"고 가정하지만, Attention은 데이터에서 어떤 관계가 중요한지 스스로 학습합니다.

## 핵심 정리

- **Seq2Seq**는 Encoder-Decoder 구조로 가변 길이 시퀀스를 변환하지만, 고정 크기 벡터 병목으로 긴 문장에서 성능이 저하됩니다
- **Bahdanau Attention**은 디코더가 매 스텝마다 인코더의 모든 위치를 동적으로 참조하여, "어디를 볼 것인가"를 학습합니다
- **Luong Attention**의 Scaled Dot-Product 방식은 계산이 효율적이며, 이것이 Transformer Attention의 직접적 전신입니다
- **Copy/Coverage** 메커니즘 등 Attention의 확장은 반복 문제와 OOV 문제를 해결하며, 현대 LLM에도 그 아이디어가 이어집니다
- Seq2Seq의 **순차 처리 한계**가 "RNN 없이 Attention만으로"라는 Transformer의 핵심 통찰을 이끌어냈습니다

# 사전학습 패러다임

## 왜 사전학습 패러다임을 이해해야 하는가

nlp-03에서 Transformer의 구조를 배웠다면, 이 강의에서는 **"같은 Transformer를 어떻게 학습시키느냐"**에 따라 완전히 다른 모델이 되는 것을 다룹니다. BERT는 마스크 언어 모델(MLM)로, GPT는 자기회귀(CLM)로, T5는 둘을 통합한 방식으로 학습합니다. 사전학습 목적 함수의 선택이 모델의 강점과 용도를 결정합니다.

> **핵심 직관**: 사전학습의 핵심은 **"자기지도 학습(Self-Supervised Learning)"**입니다. 레이블 없는 대량의 텍스트에서, 텍스트 자체를 "답"으로 사용합니다. "빈칸을 채워라"(BERT)든 "다음 단어를 예측하라"(GPT)든, 이 과정에서 언어의 문법, 의미, 세계 지식을 학습합니다.

## 1. 자기회귀 언어 모델 (Autoregressive LM)

```
Causal Language Modeling (CLM):
  다음 토큰을 예측하는 방식
  P(x₁, x₂, ..., xₙ) = Π P(xₜ | x₁, ..., xₜ₋₁)

  "The cat sat on the" → 다음 단어? → "mat"

  학습: 각 위치에서 다음 토큰의 교차 엔트로피 최소화
  L = -Σ_t log P(xₜ | x₁, ..., xₜ₋₁)

  Causal Mask:
  현재 위치에서 미래 토큰을 볼 수 없음
  → nlp-03의 Masked Self-Attention 사용

  [The] → P(cat|The)
  [The, cat] → P(sat|The,cat)
  [The, cat, sat] → P(on|The,cat,sat)

GPT 계열 (OpenAI):
  GPT-1 (2018): Transformer Decoder, 117M 파라미터
    12 레이어, d=768, 12 헤드
    BookCorpus (약 7,000권) 학습
    → 사전학습 + 파인튜닝 패러다임 확립

  GPT-2 (2019): 1.5B 파라미터
    48 레이어, d=1600, 25 헤드
    WebText (40GB) 학습
    → "제로샷으로도 태스크 수행 가능" 발견

  GPT-3 (2020): 175B 파라미터
    96 레이어, d=12288, 96 헤드
    → In-Context Learning의 등장 (nlp-09)
    → 파인튜닝 없이 프롬프트만으로 다양한 태스크

  | 모델 | 파라미터 | 데이터 | 혁신 |
  |------|---------|--------|------|
  | GPT-1 | 117M | 5GB | 사전학습+파인튜닝 |
  | GPT-2 | 1.5B | 40GB | 제로샷 |
  | GPT-3 | 175B | 570GB | In-Context Learning |
```

## 2. 마스크 언어 모델 (Masked LM)

```
BERT (Bidirectional Encoder Representations, 2018):

  핵심 아이디어:
  "진정한 양방향 문맥"을 학습하려면
  자기회귀가 아닌 다른 목적 함수가 필요

  Masked Language Model (MLM):
  입력의 15%를 [MASK]로 대체하고 원래 토큰 예측

  "The cat [MASK] on the mat"
  → 예측: "sat" (양쪽 문맥 모두 사용!)

  마스킹 전략 (15% 중):
  ├─ 80%: [MASK] 토큰으로 대체
  ├─ 10%: 랜덤 토큰으로 대체
  └─ 10%: 원래 토큰 유지

  왜 100% [MASK]가 아닌가?
  → 파인튜닝 시 [MASK]가 없는 입력과의 불일치 완화
  → 모든 위치에서 "정확한 표현"을 유지하도록

  Next Sentence Prediction (NSP):
  두 문장이 연속인지 판별
  [CLS] A [SEP] B [SEP] → IsNext / NotNext
  → 후속 연구에서 NSP는 불필요하다는 결과 (RoBERTa)

BERT 변형:
  BERT-base: 12L, 768H, 12A → 110M
  BERT-large: 24L, 1024H, 16A → 340M

  사전학습 데이터: BookCorpus + Wikipedia (16GB)
  학습: 256 배치, 1M 스텝, 40 에폭
```

```
BERT vs GPT의 근본 차이:

  GPT (자기회귀):
  "The cat ___"  → "sat" 예측
  왼쪽 문맥만 사용 (causal mask)

  BERT (마스크 LM):
  "The cat [MASK] on the mat" → "sat" 예측
  양쪽 문맥 모두 사용 (양방향)

  장단점:
  | 속성 | GPT (CLM) | BERT (MLM) |
  |------|-----------|------------|
  | 문맥 방향 | 왼쪽→오른쪽 | 양방향 |
  | 생성 능력 | 자연스러운 텍스트 생성 | 직접 생성 불가 |
  | 이해 태스크 | 보통 | 우수 |
  | 학습 효율 | 모든 토큰이 학습 신호 | 15%만 학습 신호 |
  | 사용 방식 | 프롬프트/생성 | 파인튜닝/분류 |

  핵심 트레이드오프:
  양방향 → 이해에 강하지만 생성에 약함
  단방향 → 생성에 강하지만 이해에 약함
  → T5가 이 딜레마에 도전
```

> **핵심 직관**: BERT와 GPT의 차이는 **"빈칸 채우기 vs 이어 쓰기"**입니다. 시험 문제로 비유하면, BERT는 "빈칸에 들어갈 단어를 고르시오"를 푸는 것이고, GPT는 "이어서 쓰시오"를 푸는 것입니다. 전자가 이해에, 후자가 생성에 유리한 이유는 자명합니다.

## 3. T5와 통합 프레임워크

```
T5 (Text-to-Text Transfer Transformer, Raffel et al., 2019):

  모든 NLP 태스크를 "텍스트 입력 → 텍스트 출력"으로 통일

  분류: "sentiment: I love this movie" → "positive"
  번역: "translate English to German: The house" → "Das Haus"
  요약: "summarize: ..." → "..."
  QA: "question: ... context: ..." → "answer"

  구조: Encoder-Decoder (원래 Transformer)
  ├─ Encoder: 양방향 Self-Attention (BERT처럼)
  └─ Decoder: Causal Self-Attention + Cross-Attention (GPT+)

  사전학습 목적: Span Corruption
  "The <X> sat on <Y> mat" → "<X> cat <Y> the"
  → 연속된 토큰 스팬을 하나의 센티넬로 대체
  → BERT의 MLM보다 효율적 (여러 토큰을 한 센티넬로)

T5 변형 (C4 데이터셋, 750GB):
  | 모델 | 파라미터 | 인코더+디코더 |
  |------|---------|-------------|
  | T5-Small | 60M | 6+6 |
  | T5-Base | 220M | 12+12 |
  | T5-Large | 770M | 24+24 |
  | T5-3B | 3B | 24+24 |
  | T5-11B | 11B | 24+24 |

T5 논문의 체계적 실험:
  ├─ 아키텍처: Encoder-Decoder > Decoder-only (당시)
  ├─ 사전학습: Span Corruption > MLM > CLM (효율성)
  ├─ 데이터: 깨끗한 데이터 > 많은 데이터
  └─ 스케일: 크면 클수록 좋다 (스케일링 법칙의 전조)
```

## 4. 사전학습 후 파인튜닝

```
파인튜닝 (Fine-Tuning) 패러다임:

  1단계: 사전학습 (대규모 비라벨 데이터)
    → 언어의 일반적 패턴 학습
    → 수백 GPU-일, 수만 달러

  2단계: 파인튜닝 (소규모 라벨 데이터)
    → 특정 태스크에 적응
    → 단일 GPU, 수 시간

  BERT 파인튜닝:
  [CLS] 토큰의 표현에 분류 헤드 추가
  → 감성 분류, NLI, 질의응답 등

  예시: 감성 분류
  입력: [CLS] This movie was fantastic [SEP]
  → BERT → h_[CLS] → Linear(768→2) → softmax
  → P(positive) = 0.95

  파인튜닝의 핵심:
  ├─ 전체 모델 가중치를 업데이트
  ├─ 학습률을 낮게 (2e-5 ~ 5e-5)
  ├─ 에폭 수 적게 (2-4 에폭)
  └─ 배치 크기 16-32

  왜 적은 데이터로도 잘 작동하는가?
  사전학습이 이미 언어 구조를 학습
  → 파인튜닝은 "마지막 조정"만 하면 됨
  → gt-01의 전이 학습 이론과 연결
```

## 5. 주요 사전학습 모델 비교

```
BERT 후속 모델:

  RoBERTa (Liu et al., 2019):
  ├─ NSP 제거 → 성능 향상
  ├─ 더 많은 데이터 (160GB)
  ├─ 더 긴 학습 (더 큰 배치, 더 많은 스텝)
  ├─ 동적 마스킹 (매 에폭마다 다른 마스크)
  └─ 결론: "BERT는 충분히 학습되지 않았다"

  ALBERT (Lan et al., 2019):
  ├─ 파라미터 공유: 레이어 간 가중치 공유 → 크기 축소
  ├─ 임베딩 분해: V×H → V×E + E×H (E << H)
  └─ SOP: NSP 대신 문장 순서 예측

  ELECTRA (Clark et al., 2020):
  ├─ "대체 토큰 탐지" — GAN 스타일
  ├─ Generator: 작은 MLM이 토큰 대체
  ├─ Discriminator: 각 토큰이 원본인지 판별
  ├─ 모든 토큰이 학습 신호 → 15% vs 100%
  └─ 같은 계산량에서 BERT보다 우수

  DeBERTa (He et al., 2020):
  ├─ 분리된 어텐션: 내용과 위치를 별도 처리
  ├─ Enhanced Mask Decoder: 디코딩 시 위치 추가
  └─ SuperGLUE에서 인간 수준 달성

Decoder-only의 부상:
  GPT-3 이후 Decoder-only가 주류로
  ├─ 생성과 이해를 통합
  ├─ In-Context Learning이 파인튜닝을 대체
  ├─ 스케일링에 더 유리
  └─ LLaMA, Mistral, Gemma 등 오픈소스 LLM
```

## 6. Encoder-only vs Decoder-only vs Encoder-Decoder

```
세 가지 아키텍처 패러다임:

  Encoder-only (BERT, RoBERTa):
  ├─ 양방향 Self-Attention
  ├─ 강점: 분류, NER, 유사도, 검색
  ├─ 약점: 텍스트 생성 불가
  └─ 현재: 임베딩 모델, 리랭커에서 여전히 활용

  Decoder-only (GPT, LLaMA, Mistral):
  ├─ Causal Self-Attention (왼쪽만)
  ├─ 강점: 텍스트 생성, 다양한 태스크 통합
  ├─ 약점: 양방향 이해에서 비효율
  └─ 현재: LLM의 지배적 아키텍처

  Encoder-Decoder (T5, BART, mBART):
  ├─ Encoder 양방향 + Decoder 자기회귀
  ├─ 강점: 조건부 생성 (번역, 요약)
  ├─ 약점: 파라미터 효율성이 낮음
  └─ 현재: 번역, 특화 태스크에서 사용

왜 Decoder-only가 이겼나?

  1. 단순성: 하나의 스택으로 통일
  2. 스케일링: 파라미터 전체가 생성에 기여
     (Encoder-Decoder는 절반이 인코더)
  3. 유연성: 프롬프트로 모든 태스크를 생성 문제로
  4. ICL: 파인튜닝 없이 프롬프트만으로 태스크 수행
  5. 학습 효율: 모든 토큰이 학습 신호

  다만 "Decoder-only이 항상 최선"은 아님
  ├─ 검색/임베딩: Encoder가 여전히 우수
  ├─ 번역: Encoder-Decoder가 효율적
  └─ 분류: 소규모에서는 BERT 계열이 실용적
```

> **핵심 직관**: 사전학습 패러다임의 선택은 **"이해(understanding) vs 생성(generation)"의 트레이드오프**입니다. BERT는 이해에 최적화되었고, GPT는 생성에 최적화되었습니다. GPT-3 이후 "생성으로 이해를 포함할 수 있다"는 것이 밝혀지면서 Decoder-only가 지배적이 되었지만, 특화된 태스크에서는 각 패러다임이 여전히 장점을 가집니다.

## 핵심 정리

- **자기회귀 LM(GPT)**은 다음 토큰 예측으로 학습하여 텍스트 생성에 강하며, 스케일링에 따라 In-Context Learning이 등장했습니다
- **마스크 LM(BERT)**은 빈칸 예측으로 양방향 문맥을 학습하여 이해 태스크에 강하지만, 텍스트 생성이 직접적으로 불가능합니다
- **T5**는 모든 태스크를 텍스트→텍스트로 통일하고 Span Corruption으로 사전학습하여, Encoder-Decoder의 장점을 보여줬습니다
- **RoBERTa**(더 긴 학습), **ELECTRA**(대체 토큰 탐지), **DeBERTa**(분리된 어텐션) 등이 BERT를 개선했습니다
- 현재 **Decoder-only**가 LLM의 지배적 아키텍처이며, 이는 단순성, 스케일링 효율, 프롬프트 유연성 덕분입니다

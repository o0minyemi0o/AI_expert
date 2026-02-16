# NLP 기초와 텍스트 표현

## 왜 텍스트 표현이 중요한가

컴퓨터는 숫자만 처리합니다. "고양이"라는 단어를 모델에 넣으려면 **벡터(vector)**로 변환해야 합니다. 이 변환 방식이 NLP의 성능을 결정합니다. Bag-of-Words부터 Word2Vec, 그리고 BERT까지—텍스트 표현의 진화는 곧 NLP의 역사입니다. dl-01에서 다룬 신경망 기초 위에, 언어의 의미를 벡터 공간에 담는 방법을 체계적으로 살펴봅니다.

> **핵심 직관**: 좋은 텍스트 표현은 **"의미적으로 유사한 단어가 벡터 공간에서 가까이 위치"**하는 것입니다. "king - man + woman ≈ queen"이라는 유명한 예시가 보여주듯, 단어의 **분포적 의미(distributional semantics)**를 기하학적 관계로 포착하는 것이 핵심입니다.

## 1. 전통적 텍스트 표현

```
Bag-of-Words (BoW):
  문서를 단어 빈도 벡터로 표현
  "I love cats. I love dogs." → {I:2, love:2, cats:1, dogs:1}

  장점: 단순, 빠름, 분류에 효과적
  단점: 어순 무시, 차원 폭발, 의미 무시

TF-IDF (Term Frequency - Inverse Document Frequency):
  tf(t,d) = 단어 t가 문서 d에 등장한 횟수
  idf(t) = log(전체 문서 수 / t가 등장한 문서 수)
  tf-idf(t,d) = tf(t,d) × idf(t)

  직관: "the"처럼 모든 문서에 등장하는 단어는 idf가 낮고,
        전문 용어처럼 특정 문서에만 나오는 단어는 idf가 높음
  → "중요한 단어"에 높은 가중치 부여

  여전히 희소(sparse) 표현 — 어휘 크기가 수만~수십만
```

```
N-gram 모델:
  연속 N개 단어의 조합을 특징으로 사용
  Bigram: "I love", "love cats", "cats I", ...

  조건부 확률: P(w_n | w_{n-1}, ..., w_{n-N+1})
  "I love ___" → P(cats|I,love) vs P(rocks|I,love)

  한계:
  ├─ N이 커지면 희소성 폭발 (curse of dimensionality)
  ├─ 장거리 의존성 포착 불가
  └─ 문맥 크기가 N-1로 고정

  pt-06의 마르코프 체인과 동일한 원리:
  현재 상태가 직전 N-1개 단어에만 의존
```

## 2. 분포 가설과 Word2Vec

```
분포 가설 (Distributional Hypothesis):
  "You shall know a word by the company it keeps" — J.R. Firth

  단어의 의미는 그 단어가 등장하는 문맥으로 결정됨
  "고양이"와 "강아지"가 유사한 문맥에 등장 → 유사한 의미

  이 가설이 모든 신경망 기반 임베딩의 철학적 기반입니다.

Word2Vec (Mikolov et al., 2013):
  단어를 저차원 밀집 벡터(dense vector)로 매핑

  모델 1: CBOW (Continuous Bag of Words)
  주변 단어로 중심 단어 예측
  context: [I, love, ___, very, much] → 예측: "cats"

  모델 2: Skip-gram
  중심 단어로 주변 단어 예측
  center: "cats" → 예측: [I, love, very, much]

  | 속성 | CBOW | Skip-gram |
  |------|------|-----------|
  | 방향 | 문맥→중심 | 중심→문맥 |
  | 빈도 높은 단어 | 유리 | 보통 |
  | 빈도 낮은 단어 | 보통 | 유리 |
  | 학습 속도 | 빠름 | 느림 |
  | 일반적 선택 | 대규모 | 소규모 |
```

```python
# Skip-gram의 핵심: 소프트맥스 근사
# 원래: P(w_o | w_c) = softmax(u_{w_o}^T v_{w_c})
# 어휘 전체 softmax → 계산 불가 (|V| ~ 수십만)

# 해결: Negative Sampling
# 긍정 쌍 (cats, love)의 점수는 높이고,
# 부정 쌍 (cats, refrigerator)의 점수는 낮추기
# L = log σ(u_o^T v_c) + Σ_{k=1}^{K} E[log σ(-u_k^T v_c)]
```

```
Word2Vec의 놀라운 성질:

  벡터 산술 (Vector Arithmetic):
  king - man + woman ≈ queen
  Paris - France + Italy ≈ Rome
  better - good + bad ≈ worse

  이것이 가능한 이유:
  "king"과 "queen"의 차이 ≈ "man"과 "woman"의 차이
  → 성별이라는 의미 축(semantic axis)이 벡터 공간에 인코딩됨

  한계:
  ├─ 동음이의어 구분 불가: "bank"(은행) vs "bank"(강둑)
  ├─ 정적 임베딩: 문맥에 따라 의미가 바뀌지 않음
  └─ 형태소 무시: "unhappiness"의 구조를 활용하지 않음
```

## 3. GloVe와 FastText

```
GloVe (Global Vectors, Pennington et al., 2014):
  Word2Vec이 지역 문맥만 보는 것의 한계 해결
  전체 코퍼스의 공출현 행렬(Co-occurrence Matrix) 활용

  목적 함수:
  J = Σ_{i,j} f(X_{ij})(w_i^T w̃_j + b_i + b̃_j - log X_{ij})²

  X_{ij}: 단어 i,j의 공출현 빈도
  f(x): 가중치 함수 (고빈도 단어의 과도한 영향 방지)

  직관: log(X_{ij}) ≈ w_i^T w̃_j
  → 공출현의 로그가 벡터 내적과 비례

  Word2Vec vs GloVe:
  ├─ Word2Vec: 지역 문맥 윈도우 (predictive)
  ├─ GloVe: 전역 공출현 통계 (count-based)
  └─ 실무 성능: 대체로 비슷, 하이퍼파라미터가 더 중요

FastText (Bojanowski et al., 2017):
  단어를 문자 n-gram으로 분해

  "where" → <wh, whe, her, ere, re> + <where>
  단어 벡터 = 구성 n-gram 벡터의 합

  장점:
  ├─ 미등록 단어(OOV) 처리 가능
  │   "unbelievable" 학습 안 해도 부분 n-gram으로 추론
  ├─ 형태소가 풍부한 언어에 강함 (터키어, 핀란드어, 한국어)
  └─ 희귀 단어의 표현 품질 향상
```

> **핵심 직관**: Word2Vec, GloVe, FastText 모두 **"정적 임베딩(static embedding)"**입니다. "bank"라는 단어는 문맥이 무엇이든 **하나의 벡터**만 가집니다. 이것이 BERT로의 진화를 이끈 핵심 한계입니다.

## 4. 문맥적 임베딩의 등장

```
ELMo (Embeddings from Language Models, Peters et al., 2018):
  양방향 LSTM 언어 모델의 내부 표현을 임베딩으로 사용

  구조:
  순방향 LSTM: "I love ___" → 다음 단어 예측
  역방향 LSTM: "___ very much" → 이전 단어 예측

  각 레이어의 히든 스테이트를 가중합:
  ELMo_k = γ Σ_j s_j h_{k,j}

  핵심 돌파구: 같은 단어도 문맥에 따라 다른 벡터!
  "I deposited money in the bank" → bank ≈ 금융
  "I sat on the river bank" → bank ≈ 강둑

  하지만 LSTM의 한계:
  ├─ 순차 처리 → 병렬화 어려움
  ├─ 장거리 의존성 여전히 약함
  └─ 양방향이지만 진정한 양방향이 아님
      (좌→우와 우→좌를 따로 학습 후 결합)

BERT의 혁신 (Devlin et al., 2018):
  Transformer로 진정한 양방향 문맥 표현

  정적 임베딩:  word → fixed vector
  ELMo:        word + context(LSTM) → vector
  BERT:        word + full_context(Transformer) → vector

  핵심 차이:
  LSTM은 좌→우 또는 우→좌로 순차 처리
  Transformer의 Self-Attention은 모든 위치를 동시에 참조
  → "진정한 양방향" (nlp-03, nlp-04에서 상세히)
```

## 5. 임베딩 품질 평가

```
내재적 평가 (Intrinsic Evaluation):
  임베딩 자체의 품질을 직접 측정

  1. 유사도 상관관계:
     사람이 매긴 단어 유사도와 코사인 유사도의 상관
     SimLex-999, WordSim-353 데이터셋

  2. 유추 테스트 (Analogy):
     "king : queen = man : ?"
     argmax_w cos(w, queen - king + man) = woman?

  3. 클러스터링: 같은 의미 범주의 단어가 모이는가

외재적 평가 (Extrinsic Evaluation):
  임베딩을 하위 태스크에 적용하여 간접 측정

  ├─ 감성 분류: 긍정/부정 분류 정확도
  ├─ 개체명 인식(NER): 인명/지명 태깅 F1
  ├─ 기계 번역: BLEU 점수
  └─ 질의응답: Exact Match / F1

  실무적으로 외재적 평가가 더 중요:
  "유추 테스트 1등이 NER 1등은 아니다"

코사인 유사도 vs 유클리드 거리:
  코사인: cos(a,b) = a·b / (||a|| × ||b||)
  → 벡터의 방향만 비교, 크기 무시
  → 임베딩 유사도의 표준 지표

  유클리드: ||a - b||₂
  → 크기도 고려
  → 임베딩보다는 클러스터링에서 주로 사용
```

## 6. 정적 임베딩에서 LLM까지의 진화 요약

```
텍스트 표현의 진화 타임라인:

  2003: Neural LM (Bengio) — 첫 신경망 언어 모델
  2013: Word2Vec — 효율적 분산 표현, 벡터 산술
  2014: GloVe — 전역 통계 활용
  2017: FastText — 부분단어 정보 활용
  2018: ELMo — 문맥적 임베딩의 시작
  2018: BERT — Transformer 기반 양방향 사전학습
  2018: GPT — 자기회귀 사전학습
  2020: GPT-3 — 스케일링과 In-Context Learning
  2022~: ChatGPT, GPT-4 — 정렬된 대규모 언어 모델

  핵심 전환점:
  ├─ 희소 → 밀집: BoW/TF-IDF → Word2Vec
  ├─ 정적 → 문맥적: Word2Vec → ELMo/BERT
  ├─ 특화 → 범용: 태스크별 모델 → 사전학습+파인튜닝
  └─ 파인튜닝 → 프롬프트: BERT식 → GPT식 In-Context

  각 전환이 NLP의 패러다임을 바꿨으며,
  이 강좌의 nlp-02~14에서 순서대로 다룹니다.
```

> **핵심 직관**: NLP의 역사는 **"사람이 설계한 특징(feature engineering)에서 데이터가 학습한 표현(representation learning)으로"**의 전환입니다. TF-IDF는 사람이 "중요한 단어"를 정의했지만, Word2Vec은 데이터에서 의미를 학습하고, BERT는 문맥까지 학습합니다. 이 방향성을 이해하면 LLM의 등장이 필연적이었음을 알 수 있습니다.

## 핵심 정리

- **Bag-of-Words/TF-IDF**는 희소(sparse) 표현으로 단순하지만, 어순과 의미를 무시하며 차원이 어휘 크기에 비례합니다
- **Word2Vec**은 분포 가설에 기반한 밀집(dense) 표현으로, Skip-gram과 CBOW를 통해 벡터 산술이 가능한 의미 공간을 학습합니다
- **GloVe**는 전역 공출현 통계, **FastText**는 부분단어 n-gram을 활용하여 각각 Word2Vec의 한계를 보완합니다
- **정적 임베딩의 근본 한계**는 동일 단어에 하나의 벡터만 할당하는 것이며, **ELMo**가 문맥적 임베딩을, **BERT**가 Transformer 기반 양방향 문맥 표현을 도입했습니다
- NLP의 진화는 **희소→밀집, 정적→문맥적, 특화→범용, 파인튜닝→프롬프트**라는 네 가지 축을 따르며, 이 방향성이 LLM의 등장을 이끌었습니다

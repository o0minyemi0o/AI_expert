# 프롬프트 엔지니어링과 In-Context Learning

## 왜 프롬프트 엔지니어링이 중요한가

파인튜닝 없이 **프롬프트만으로** LLM의 행동을 제어할 수 있다는 발견은 NLP의 패러다임을 바꿨습니다. GPT-3는 "프롬프트에 예시를 넣으면 학습한 적 없는 태스크도 수행한다"는 In-Context Learning(ICL)을 보여줬고, Chain-of-Thought는 추론 능력까지 이끌어냈습니다. 프롬프트는 LLM의 **"인터페이스"**이며, 그 설계가 성능을 좌우합니다.

> **핵심 직관**: In-Context Learning의 놀라운 점은 **"가중치 업데이트 없이 입력만으로 학습"**한다는 것입니다. 프롬프트의 예시가 일종의 "일시적 파인튜닝" 역할을 합니다. 이것이 왜 가능한지는 아직 완전히 이해되지 않았지만, Transformer의 어텐션이 예시 패턴을 "소프트 프로그래밍"하는 것으로 해석됩니다.

## 1. In-Context Learning (ICL) 기초

```
ICL의 등장 (GPT-3, Brown et al., 2020):

  Zero-shot: 지시만으로
  "Translate English to French: cheese →"
  → "fromage"

  One-shot: 예시 1개
  "Translate English to French:
   sea otter → loutre de mer
   cheese →"
  → "fromage"

  Few-shot: 예시 여러 개
  "Translate English to French:
   sea otter → loutre de mer
   peppermint → menthe poivrée
   cheese →"
  → "fromage"

  성능 vs 예시 수:
  일반적으로 예시 3-8개에서 포화
  더 많은 예시는 문맥 창을 소모할 뿐
  예시의 품질 > 수량

ICL이 작동하는 이유 (가설들):

  1. 태스크 인식 가설:
     사전학습에서 유사한 패턴을 봤기 때문
     → "입력 → 출력" 매핑 패턴을 인식

  2. 베이지안 추론 가설:
     예시로부터 태스크의 사후 분포를 추론
     P(태스크 | 예시들) → 해당 태스크에 맞는 출력

  3. 내부 경사하강 가설 (Akyürek et al., 2022):
     Transformer의 어텐션이 암묵적으로
     경사하강법과 유사한 최적화를 수행
     → 예시가 "가상의 학습 데이터" 역할

  4. 소프트 프로그래밍 가설:
     예시가 어텐션 패턴을 조건화
     → 특정 입출력 매핑을 "프로그래밍"
```

## 2. 프롬프트 설계 원칙

```
효과적인 프롬프트의 구조:

  [역할 설정]
  You are an expert data scientist...

  [태스크 설명]
  Given a dataset description, recommend the best model...

  [포맷 지정]
  Output as JSON: {"model": ..., "reason": ...}

  [제약 조건]
  Consider only models available in scikit-learn.

  [예시 (Few-shot)]
  Example: ... → ...

  [입력]
  Now analyze: ...

핵심 원칙:

  1. 명확성 (Clarity):
     모호하지 않은 지시
     Bad: "좋은 코드를 짜줘"
     Good: "Python으로 이진 탐색을 구현하고,
            입력 검증과 타입 힌트를 포함해줘"

  2. 구체성 (Specificity):
     원하는 형식, 길이, 스타일을 지정
     "3문장으로 요약", "JSON으로 출력", "초등학생 수준으로"

  3. 구조화 (Structure):
     마크다운, 번호, 구분자 활용
     """입력: ...""" 또는 ###를 사용한 섹션 분리

  4. 순서 효과 (Order Effect):
     예시의 순서가 성능에 영향
     마지막 예시와 유사한 패턴을 따르는 경향
     → 가장 관련 있는 예시를 마지막에 배치

  5. 레이블 균형:
     Few-shot에서 각 클래스의 예시 수를 균등하게
     편향된 예시 → 편향된 출력
```

## 3. Chain-of-Thought (CoT) 프롬프팅

```
Chain-of-Thought (Wei et al., 2022):
  "단계별로 생각하라"고 지시하면 추론 능력 향상

  Standard:
  Q: 사과 5개에서 2개를 먹고 3개를 샀다. 몇 개?
  A: 6

  CoT:
  Q: 사과 5개에서 2개를 먹고 3개를 샀다. 몇 개?
  A: 처음 5개. 2개를 먹으면 5-2=3개.
     3개를 사면 3+3=6개. 답: 6

  왜 효과적인가:
  ├─ 복잡한 문제를 작은 단계로 분해
  ├─ 중간 결과를 "작업 메모리"에 유지
  ├─ 실수 가능성 감소 (각 단계가 단순)
  └─ 자기 검증 가능 (중간 단계 확인)

  Zero-shot CoT:
  프롬프트에 "Let's think step by step." 한 줄 추가
  → 놀랍게도 많은 추론 태스크에서 성능 향상!

  CoT가 효과적인 태스크:
  ├─ 수학 문제 (산술, 단어 문제)
  ├─ 논리 추론
  ├─ 코드 생성 (문제 분석 → 설계 → 구현)
  ├─ 상식 추론
  └─ 복잡한 질문 답변

  CoT가 비효과적인 태스크:
  ├─ 단순 분류 (감성 분류)
  ├─ 패턴 매칭 (정규표현식)
  └─ 작은 모델 (<10B) — 추론 능력 부족
```

## 4. 고급 프롬프팅 기법

```
Self-Consistency (Wang et al., 2023):
  CoT를 여러 번 수행하고 다수결로 답 선택

  1. 같은 질문에 대해 N개의 CoT 경로 생성 (temperature > 0)
  2. 각 경로의 최종 답변 추출
  3. 가장 많이 나온 답변 선택 (majority voting)

  효과: CoT 대비 5-15% 추가 개선
  비용: N배의 추론 비용 (보통 N=5~10)

Tree of Thoughts (Yao et al., 2023):
  CoT를 트리 구조로 확장
  ├─ 각 단계에서 여러 "생각" 후보 생성
  ├─ 각 후보를 평가 (LLM 자체 또는 별도 평가)
  ├─ 유망한 경로만 탐색 (BFS/DFS)
  └─ 백트래킹 가능

  적용: 창의적 글쓰기, 퍼즐, 수학 증명

ReAct (Reasoning + Acting, Yao et al., 2022):
  추론과 행동을 교차

  Thought: 이 질문에 답하려면 현재 GDP를 알아야 해
  Action: Search("한국 2024 GDP")
  Observation: 한국의 2024 GDP는 약 1.7조 달러
  Thought: 이제 인구로 나누면 1인당 GDP를 구할 수 있어
  Action: Search("한국 2024 인구")
  Observation: 약 5,170만 명
  Thought: 1.7조 / 5170만 = 약 32,900달러
  Answer: 약 32,900달러

  → nlp-14의 에이전트 아키텍처의 기초

Retrieval-Augmented Prompting:
  관련 문서를 검색하여 프롬프트에 포함
  → nlp-10의 RAG와 직접 연결
```

> **핵심 직관**: CoT에서 Self-Consistency, Tree of Thoughts로의 진화는 **"추론 시간에 더 많은 계산을 투자"**하는 방향입니다. 학습 시 계산(scaling laws)에서 추론 시 계산(test-time compute)으로 초점이 이동하고 있으며, 이것이 nlp-06의 "다음 패러다임"과 연결됩니다.

## 5. 프롬프트 최적화와 자동화

```
수동 프롬프트의 한계:
  ├─ 시행착오에 의존
  ├─ 사람마다 다른 결과
  ├─ 모델 변경 시 재작업 필요
  └─ 최적 프롬프트 보장 불가

자동 프롬프트 최적화:

  APE (Automatic Prompt Engineer, Zhou et al., 2022):
  LLM에게 "이 태스크를 위한 최적의 지시를 만들어"
  → 여러 후보 생성 → 검증 세트에서 평가 → 최고 선택

  DSPy (Khattab et al., 2023):
  프롬프트를 프로그래밍적으로 최적화
  ├─ 모듈: ChainOfThought, ReAct, RAG 등
  ├─ 자동 튜닝: 데모 선택, 지시 최적화
  └─ 컴파일러 패러다임: 프롬프트를 "컴파일"

  프롬프트 엔지니어링의 위치:
  ├─ 프로토타입: 프롬프트만으로 빠르게 시도
  ├─ 중기: DSPy 등으로 체계적 최적화
  └─ 장기: 파인튜닝 또는 RAG로 전환 검토

  프롬프트 vs 파인튜닝 결정 기준:
  | 상황 | 프롬프트 | 파인튜닝 |
  |------|---------|---------|
  | 데이터 없음 | ✓ | ✗ |
  | 빠른 반복 필요 | ✓ | △ |
  | 도메인 특화 | △ | ✓ |
  | 비용 민감 (추론) | △ | ✓ |
  | 일관된 형식 | △ | ✓ |
  | 지속적 업데이트 | ✓ | △ |
```

## 6. 구조화된 출력과 실전 패턴

```
구조화된 출력 (Structured Output):

  JSON 출력 강제:
  "다음 텍스트에서 엔티티를 추출하고 JSON으로 출력하세요:
   {"entities": [{"name": ..., "type": ...}]}"

  함수 호출 (Function Calling):
  API 수준에서 도구/함수를 정의
  → LLM이 적절한 함수와 인자를 JSON으로 반환
  → nlp-14의 Tool Use와 연결

  Constrained Decoding:
  문법 규칙에 따라 토큰 생성을 제한
  JSON schema에 맞는 토큰만 허용
  → 100% 유효한 JSON 보장

실전 프롬프팅 패턴:

  1. 역할 부여: "You are a senior ML engineer"
  2. 페르소나: "Answer as if explaining to a 5-year-old"
  3. 출력 제한: "Answer in exactly 3 bullet points"
  4. 부정 지시: "Do NOT include code examples"
  5. 단계 분리: 복잡한 태스크를 여러 프롬프트로 분할
  6. 자기 검증: "Check your answer and correct if needed"

  안티패턴:
  ├─ 너무 긴 프롬프트: 핵심 지시가 묻힘
  ├─ 모순된 지시: "짧게, 하지만 상세하게"
  ├─ 부정문 의존: "하지 마라" → 모델이 그 내용에 집중
  └─ 과도한 예시: 문맥 창 낭비, 다양성 부족
```

## 핵심 정리

- **In-Context Learning**은 가중치 업데이트 없이 프롬프트의 예시만으로 태스크를 수행하며, Transformer의 어텐션이 암묵적 최적화를 수행하는 것으로 해석됩니다
- **Chain-of-Thought**는 "단계별로 생각하라"는 지시로 추론 능력을 크게 향상시키며, 복잡한 문제를 작은 단계로 분해하는 효과가 있습니다
- **Self-Consistency**는 여러 CoT 경로의 다수결로, **Tree of Thoughts**는 트리 탐색으로 추론 품질을 추가 개선합니다
- **ReAct**는 추론과 외부 행동을 교차하여 실시간 정보를 활용하며, 에이전트 아키텍처의 기초입니다
- 프롬프트 엔지니어링은 **프로토타입에 적합**하고, 도메인 특화나 일관된 형식이 필요하면 파인튜닝이나 RAG로 전환을 검토해야 합니다

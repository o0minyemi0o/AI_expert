# 효율적 추론과 긴 문맥

## 왜 효율적 추론이 중요한가

70B 모델이 한 토큰을 생성하는 데 수십 밀리초가 걸리고, 100K 토큰 문맥은 어텐션만으로 수 GB의 메모리를 소비합니다. LLM을 실제 서비스로 배포하려면 **추론 속도와 메모리 효율**이 핵심입니다. KV Cache, Flash Attention, Speculative Decoding, 그리고 긴 문맥을 위한 위치 인코딩 개선까지—추론 최적화의 핵심 기법을 다룹니다.

> **핵심 직관**: 자기회귀 LLM 추론의 근본적 병목은 **"각 토큰이 이전 모든 토큰에 의존"**한다는 것입니다. N개 토큰 생성은 N번의 순차적 포워드 패스를 요구하며, 이 순차성을 완전히 제거할 수 없습니다. 최적화는 이 순차 단계 각각을 최대한 빠르게 하는 것입니다.

## 1. KV Cache

```
자기회귀 생성의 비효율:

  토큰 1 생성: Attention([t₁])
  토큰 2 생성: Attention([t₁, t₂])
  토큰 3 생성: Attention([t₁, t₂, t₃])
  ...

  매번 이전 토큰의 K, V를 다시 계산?
  → t₁의 K, V는 변하지 않는데 매번 재계산!

KV Cache:
  이전 토큰의 Key, Value를 캐시하여 재사용

  토큰 1: K₁, V₁ 계산 → 캐시 저장
  토큰 2: K₂, V₂만 새로 계산, [K₁,K₂], [V₁,V₂]로 어텐션
  토큰 3: K₃, V₃만 새로 계산, [K₁,K₂,K₃], [V₁,V₂,V₃]로 어텐션

  → 각 스텝에서 새 토큰 하나만 계산!
  → O(N²) → O(N) per step (누적은 여전히 O(N²))

  KV Cache 메모리:
  per layer: 2 × batch × seq_len × n_heads × d_head × 2 bytes
  전체: layers × per_layer

  LLaMA-2 70B, seq=4096, batch=1:
  80 layers × 2 × 1 × 4096 × 64 × 128 × 2 bytes
  ≈ 10.5 GB (모델 가중치 140GB에 추가!)

  seq=128K이면: ≈ 330 GB → 단일 GPU 불가!
```

```
KV Cache 최적화:

  Multi-Query Attention (MQA, Shazeer 2019):
  K, V를 모든 헤드가 공유 (Q만 헤드별)
  → KV 캐시 1/n_heads로 감소
  → 약간의 성능 저하, 큰 메모리 절감

  Grouped-Query Attention (GQA, Ainslie et al., 2023):
  K, V를 그룹으로 공유 (MHA와 MQA의 중간)
  n_heads=32, n_kv_groups=8이면
  → 4개 Q 헤드가 1개 KV 그룹 공유
  → MQA보다 성능 좋고, MHA보다 효율적

  | 방식 | KV 헤드 수 | 메모리 | 성능 |
  |------|----------|--------|------|
  | MHA | 32 | 기준 | 최고 |
  | GQA-8 | 8 | 1/4 | 거의 MHA |
  | MQA | 1 | 1/32 | 약간 저하 |

  LLaMA-2 70B: GQA-8 사용
  Mistral 7B: GQA-8 사용
```

## 2. Flash Attention

```
Flash Attention (Dao et al., 2022):

  문제: 표준 어텐션은 N×N 행렬을 메모리에 저장
  N = 4096: 4096² × 2 bytes = 32MB (per head)
  N = 128K: 128K² × 2 bytes = 32GB!

  핵심 아이디어: "타일링(Tiling)"
  Q, K, V를 블록 단위로 나누어 처리
  HBM(메인 메모리) ↔ SRAM(온칩 메모리) 간 데이터 이동 최소화

  기존: Q, K → 전체 QK^T 계산 → 전체 저장 → softmax → ×V
  Flash: 블록 단위 QK^T → 온칩 softmax → 블록 결과 누적

  Online Softmax:
  전체 행을 보지 않고도 올바른 softmax 계산
  → 블록별로 최대값과 합을 점진적으로 업데이트

  성능 향상:
  ├─ 메모리: O(N²) → O(N) (어텐션 행렬 저장 불필요)
  ├─ 속도: 2-4× 빠름 (메모리 접근 감소)
  └─ 정확도: 완전히 동일 (근사 없음!)

  Flash Attention 2:
  ├─ Q 기준 병렬화 (GPU 활용률 향상)
  ├─ 비대칭 블록 크기
  └─ 추가 20-30% 속도 향상

  현재: PyTorch 2.0+에 기본 내장
  → torch.nn.functional.scaled_dot_product_attention()
```

## 3. Speculative Decoding

```
Speculative Decoding (Leviathan et al., 2022):

  문제: 큰 모델의 순차 생성이 느림
  아이디어: 작은 모델이 먼저 "초안"을 쓰고,
            큰 모델이 한 번에 "검증"

  과정:
  1. Draft 모델 (작은 모델, 예: 1B)이 K개 토큰 생성
  2. Target 모델 (큰 모델, 예: 70B)이 K+1개 토큰을
     한 번의 포워드 패스로 동시 검증
  3. 수락/거부: 확률 비교로 결정
     P_accept = min(1, P_target(x) / P_draft(x))
  4. 거부된 지점부터 target 모델의 분포로 재샘플링

  핵심 성질: 수학적으로 target 모델과 동일한 분포!
  → 품질 저하 없이 속도만 개선

  속도 향상:
  Draft 모델 수락률 α에 의존
  기대 생성 토큰: 1/(1-α) per target forward
  α = 0.8이면: 5× 토큰 per forward → ~2-3× 실제 속도

  Draft 모델 선택:
  ├─ 같은 계열의 작은 모델 (LLaMA-1B → LLaMA-70B)
  ├─ Self-Speculative: 큰 모델의 초기 레이어만 사용
  └─ 도메인 특화 모델: 특정 패턴에 높은 수락률

  Medusa (Cai et al., 2024):
  별도 draft 모델 없이, 추가 헤드로 여러 토큰 동시 예측
  → 구현 간단, 메모리 효율적
```

> **핵심 직관**: Speculative Decoding은 **"검증이 생성보다 쉽다"**는 원리를 활용합니다. 큰 모델이 K개 토큰을 순차 생성하려면 K번 포워드가 필요하지만, K개 토큰을 동시 검증하는 것은 1번 포워드면 충분합니다. ad-10의 P vs NP에서 "검증이 풀기보다 쉽다"와 같은 직관입니다.

## 4. 긴 문맥을 위한 위치 인코딩

```
RoPE (Rotary Position Embedding, Su et al., 2021):

  nlp-03의 위치 인코딩 개선 버전
  현대 LLM의 표준 (LLaMA, Mistral, Qwen)

  핵심 아이디어: 위치 정보를 회전 행렬로 인코딩
  q_m = R_m q, k_n = R_n k
  q_m^T k_n = q^T R_{m-n} k → 상대 위치 m-n만 의존!

  R_θ(m) = [cos(mθ), -sin(mθ)]  (2D 회전)
            [sin(mθ),  cos(mθ)]

  각 차원 쌍이 다른 주파수로 회전
  θ_i = 10000^(-2i/d)

  장점:
  ├─ 상대 위치가 내적에 자연스럽게 포함
  ├─ 외삽 가능성 (학습 길이 이상으로 확장 가능)
  └─ 학습 가능한 PE보다 일반화 우수

RoPE 확장 — 긴 문맥:

  NTK-Aware RoPE:
  θ' = θ × α^{d/(d-2)}, α = 목표 길이/학습 길이
  → 고주파는 유지, 저주파만 확장
  → 4K → 16K까지 파인튜닝 없이 확장 가능

  YaRN (Yet another RoPE extensioN):
  ├─ NTK + 어텐션 스케일링 + 온도 조절
  ├─ 4K 학습 → 128K 확장
  └─ 최소한의 파인튜닝으로 긴 문맥 지원

ALiBi (Attention with Linear Biases, Press et al., 2021):
  위치 인코딩 대신 어텐션에 거리 기반 편향 추가
  bias(i, j) = -m × |i - j|
  → 먼 토큰은 낮은 어텐션 (선형 감쇠)
  → 외삽에 매우 강함, 구현 간단
  → MPT, BLOOM에서 사용
```

## 5. 양자화와 추론 최적화

```
가중치 양자화:

  FP32 → FP16/BF16 → INT8 → INT4
  정밀도를 낮춰 메모리/속도 개선

  GPTQ (Frantar et al., 2022):
  ├─ 학습 후 양자화 (Post-Training Quantization)
  ├─ 레이어별 최적 양자화 (Hessian 기반)
  ├─ 4-bit에서도 FP16 대비 95%+ 성능
  └─ GPU 추론에 최적화

  AWQ (Activation-aware Weight Quantization):
  ├─ 활성화 크기를 고려한 양자화
  ├─ 중요한 가중치는 높은 정밀도 유지
  └─ GPTQ보다 약간 우수한 성능

  GGUF (llama.cpp):
  ├─ CPU 추론을 위한 양자화 포맷
  ├─ 다양한 양자화 수준 (Q2_K ~ Q8_0)
  └─ 로컬 추론에 널리 사용

  | 양자화 | 메모리 (7B) | 성능 | 사용 |
  |--------|-----------|------|------|
  | FP16 | 14 GB | 100% | 학습/추론 |
  | INT8 | 7 GB | 99% | 추론 |
  | INT4 (GPTQ) | 3.5 GB | 96% | 추론 |
  | INT4 (AWQ) | 3.5 GB | 97% | 추론 |

배치 추론 최적화:

  Continuous Batching:
  완료된 요청을 즉시 제거하고 새 요청 삽입
  → 기존 정적 배치 대비 2-5× 처리량 향상

  PagedAttention (vLLM, Kwon et al., 2023):
  KV 캐시를 OS의 가상 메모리처럼 페이지 단위로 관리
  → 메모리 단편화 방지
  → 메모리 활용률 90%+ (기존 50-60%)
  → vLLM, TGI의 핵심 기술
```

## 6. 긴 문맥의 활용과 한계

```
긴 문맥 모델의 현재:

  | 모델 | 문맥 길이 | 방법 |
  |------|----------|------|
  | GPT-4 | 128K | 미공개 |
  | Claude 3 | 200K | 미공개 |
  | Gemini 1.5 | 1M+ | Ring Attention |
  | LLaMA-3.1 | 128K | RoPE + 점진적 확장 |
  | Mistral | 128K | Sliding Window |

  "Needle in a Haystack" 테스트:
  긴 문맥 중간에 특정 정보 삽입 → 찾을 수 있는가?
  대부분의 모델: 시작과 끝에서 잘 찾지만 중간은 약함
  → "Lost in the Middle" 현상

  긴 문맥 vs RAG:
  | 속성 | 긴 문맥 | RAG |
  |------|--------|-----|
  | 구현 복잡도 | 낮음 | 높음 |
  | 비용 (토큰) | 높음 | 낮음 |
  | 정확도 (검색) | 중간 | 높음 |
  | 지식 업데이트 | 즉시 | 즉시 |
  | 추론 속도 | 느림 | 빠름 |

  실무 조합:
  RAG로 관련 문서 검색 → 긴 문맥에 여러 문서 제공
  → 두 접근의 장점을 결합
```

## 핵심 정리

- **KV Cache**는 이전 토큰의 Key/Value를 재사용하여 추론을 가속하며, **GQA**는 KV 헤드를 그룹으로 공유하여 캐시 메모리를 1/4~1/32로 줄입니다
- **Flash Attention**은 타일링으로 어텐션의 메모리를 $O(N^2)$에서 $O(N)$으로 줄이면서 2-4배 속도 향상을 달성합니다
- **Speculative Decoding**은 작은 모델의 초안을 큰 모델이 병렬 검증하여, 품질 저하 없이 2-3배 속도를 개선합니다
- **RoPE**는 회전 행렬로 상대 위치를 인코딩하며, YaRN 등의 확장으로 학습 길이의 32배까지 문맥을 확장할 수 있습니다
- **양자화**(INT4/INT8)와 **PagedAttention**(vLLM)은 실전 배포의 핵심이며, 메모리와 처리량을 수 배 개선합니다

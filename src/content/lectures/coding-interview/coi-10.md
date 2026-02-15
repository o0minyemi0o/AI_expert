# ML 코딩 인터뷰

## 왜 ML 코딩 인터뷰가 중요한가

ML 엔지니어 포지션에서는 전통적인 알고리즘 문제 외에 **ML 특화 코딩 문제**가 출제됩니다. NumPy/Pandas를 활용한 데이터 조작, 손실 함수 구현, 역전파 직접 구현 등이 대표적입니다. deep-learning(dl-) 과정에서 학습한 이론을 코드로 옮기는 능력을 검증받는 과정입니다.

> **핵심 직관**: ML 코딩 인터뷰는 "이 알고리즘을 라이브러리 없이 구현할 수 있는가"를 평가합니다. 내부 동작 원리를 이해하고 있는지가 핵심입니다.

## 1. NumPy 핵심 연산

ML 코딩에서 NumPy의 벡터화 연산은 필수입니다. for 루프를 피하고 행렬 연산으로 대체하는 것이 핵심입니다(py- 시리즈 참고).

| 연산 | NumPy 코드 | 용도 |
|------|-----------|------|
| 행렬 곱 | `np.dot(A, B)` 또는 `A @ B` | 순전파, 선형 변환 |
| 원소별 연산 | `A * B`, `np.exp(A)` | 활성화 함수 |
| 브로드캐스팅 | `A + b` (shape 자동 확장) | 바이어스 추가 |
| 축 합산 | `np.sum(A, axis=0)` | 그래디언트 집계 |
| 형상 변환 | `A.reshape(-1, 1)` | 차원 맞추기 |

```python
import numpy as np

# 소프트맥스 구현 (수치 안정성 포함) — O(n) 시간
def softmax(x: np.ndarray) -> np.ndarray:
    x_shifted = x - np.max(x, axis=-1, keepdims=True)  # 오버플로 방지
    exp_x = np.exp(x_shifted)
    return exp_x / np.sum(exp_x, axis=-1, keepdims=True)

# 배치 정규화 구현 — O(n) 시간
def batch_norm(x: np.ndarray, gamma: np.ndarray, beta: np.ndarray,
               eps: float = 1e-5) -> np.ndarray:
    mean = np.mean(x, axis=0)
    var = np.var(x, axis=0)
    x_norm = (x - mean) / np.sqrt(var + eps)
    return gamma * x_norm + beta
```

## 2. 손실 함수 구현

```python
# 크로스 엔트로피 손실 — O(n*c) 시간, n=샘플 수, c=클래스 수
def cross_entropy_loss(y_pred: np.ndarray, y_true: np.ndarray,
                       eps: float = 1e-12) -> float:
    # y_pred: (n, c) 확률, y_true: (n,) 정수 레이블
    n = y_true.shape[0]
    log_probs = -np.log(np.clip(y_pred, eps, 1.0))
    loss = log_probs[np.arange(n), y_true]
    return np.mean(loss)

# MSE 손실 — O(n) 시간
def mse_loss(y_pred: np.ndarray, y_true: np.ndarray) -> float:
    return np.mean((y_pred - y_true) ** 2)

# 이진 크로스 엔트로피 — O(n) 시간
def binary_cross_entropy(y_pred: np.ndarray, y_true: np.ndarray,
                         eps: float = 1e-12) -> float:
    y_pred = np.clip(y_pred, eps, 1 - eps)
    return -np.mean(y_true * np.log(y_pred) + (1 - y_true) * np.log(1 - y_pred))
```

> **핵심 직관**: 손실 함수 구현에서 `np.clip`으로 log(0)을 방지하는 것은 실전에서 반드시 필요한 수치 안정성 기법입니다. 면접에서 이를 자발적으로 추가하면 높은 평가를 받습니다.

## 3. 역전파 직접 구현

dl- 과정에서 학습한 역전파를 순수 NumPy로 구현하는 문제입니다.

```python
# 2층 신경망 순전파/역전파 구현
class TwoLayerNet:
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int):
        # He 초기화
        self.W1 = np.random.randn(input_dim, hidden_dim) * np.sqrt(2.0 / input_dim)
        self.b1 = np.zeros(hidden_dim)
        self.W2 = np.random.randn(hidden_dim, output_dim) * np.sqrt(2.0 / hidden_dim)
        self.b2 = np.zeros(output_dim)

    def forward(self, X: np.ndarray) -> np.ndarray:
        # 순전파 — O(n*d*h + n*h*c) 시간
        self.z1 = X @ self.W1 + self.b1         # (n, h)
        self.a1 = np.maximum(0, self.z1)         # ReLU
        self.z2 = self.a1 @ self.W2 + self.b2    # (n, c)
        self.output = softmax(self.z2)           # (n, c)
        self.X = X
        return self.output

    def backward(self, y_true: np.ndarray, lr: float = 0.01) -> float:
        # 역전파 — 체인 룰 적용
        n = y_true.shape[0]

        # 출력층 그래디언트
        dz2 = self.output.copy()
        dz2[np.arange(n), y_true] -= 1
        dz2 /= n                                 # (n, c)

        # W2, b2 그래디언트
        dW2 = self.a1.T @ dz2                    # (h, c)
        db2 = np.sum(dz2, axis=0)                # (c,)

        # 은닉층 그래디언트
        da1 = dz2 @ self.W2.T                    # (n, h)
        dz1 = da1 * (self.z1 > 0)                # ReLU 미분

        # W1, b1 그래디언트
        dW1 = self.X.T @ dz1                     # (d, h)
        db1 = np.sum(dz1, axis=0)                # (h,)

        # 파라미터 업데이트
        self.W2 -= lr * dW2
        self.b2 -= lr * db2
        self.W1 -= lr * dW1
        self.b1 -= lr * db1
```

## 4. Pandas 데이터 처리 문제

| 연산 | Pandas 코드 | 설명 |
|------|------------|------|
| 그룹 집계 | `df.groupby('col').agg()` | 그룹별 통계 |
| 피벗 | `df.pivot_table()` | 교차 테이블 |
| 병합 | `pd.merge(df1, df2, on='key')` | 테이블 조인 |
| 결측치 | `df.fillna()`, `df.dropna()` | 결측 처리 |
| 윈도우 | `df.rolling(k).mean()` | 이동 평균 |

```python
import pandas as pd

# 시나리오: 사용자별 최근 30일 구매 금액 상위 5명
def top_buyers(transactions: pd.DataFrame) -> pd.DataFrame:
    cutoff = pd.Timestamp.now() - pd.Timedelta(days=30)
    recent = transactions[transactions['date'] >= cutoff]
    return (recent.groupby('user_id')['amount']
            .sum()
            .nlargest(5)
            .reset_index())
```

## 5. ML 알고리즘 직접 구현

```python
# K-Means 클러스터링 — O(n*k*d*iter) 시간
def kmeans(X: np.ndarray, k: int, max_iters: int = 100) -> np.ndarray:
    n, d = X.shape
    # 랜덤 초기 중심 선택
    indices = np.random.choice(n, k, replace=False)
    centroids = X[indices]

    for _ in range(max_iters):
        # 할당: 각 점을 가장 가까운 중심에 배정
        distances = np.linalg.norm(X[:, None] - centroids[None, :], axis=2)
        labels = np.argmin(distances, axis=1)

        # 업데이트: 중심 재계산
        new_centroids = np.array([X[labels == i].mean(axis=0) for i in range(k)])

        if np.allclose(centroids, new_centroids):
            break
        centroids = new_centroids

    return labels

# 로지스틱 회귀 (경사하강법) — O(n*d*iter) 시간
def logistic_regression(X: np.ndarray, y: np.ndarray,
                        lr: float = 0.01, epochs: int = 1000) -> np.ndarray:
    n, d = X.shape
    w = np.zeros(d)
    b = 0.0

    for _ in range(epochs):
        z = X @ w + b
        pred = 1 / (1 + np.exp(-z))         # 시그모이드
        dw = (1 / n) * X.T @ (pred - y)     # 그래디언트
        db = (1 / n) * np.sum(pred - y)
        w -= lr * dw
        b -= lr * db

    return w
```

> **핵심 직관**: ML 알고리즘을 직접 구현할 때 for 루프 대신 NumPy 벡터화를 사용하는 것은 "코드 성능에 대한 감각"을 보여주는 중요한 신호입니다.

## 6. 시나리오: AUC 직접 계산

**문제**: 예측 확률과 실제 레이블이 주어졌을 때, AUC (Area Under ROC Curve)를 직접 계산하시오.

```python
# AUC 계산 (정렬 기반) — O(n log n) 시간
def compute_auc(y_true: np.ndarray, y_score: np.ndarray) -> float:
    # 예측 점수 내림차순 정렬
    sorted_indices = np.argsort(-y_score)
    y_true_sorted = y_true[sorted_indices]

    # TPR, FPR 계산
    tps = np.cumsum(y_true_sorted)
    fps = np.cumsum(1 - y_true_sorted)

    tpr = tps / tps[-1]
    fpr = fps / fps[-1]

    # 사다리꼴 적분
    tpr = np.concatenate([[0], tpr])
    fpr = np.concatenate([[0], fpr])

    auc = np.trapz(tpr, fpr)
    return auc
```

이 강의의 내용은 dl- 과정의 신경망 이론을 실제 코드로 구현하는 과정이며, py- 시리즈의 NumPy/Pandas 활용법과 직결됩니다. coi-11의 시스템 코딩 문제와 함께 ML 엔지니어 인터뷰의 양대 축을 형성합니다.

## 핵심 정리

- ML 코딩 인터뷰는 **라이브러리 없이 핵심 알고리즘을 구현**하는 능력을 검증하며, 내부 동작 이해가 필수입니다
- **소프트맥스**, **크로스 엔트로피** 구현에서 수치 안정성(`np.clip`, `max 빼기`)은 반드시 포함해야 합니다
- **역전파 직접 구현**은 체인 룰을 따라 출력층→은닉층 순서로 그래디언트를 계산합니다
- NumPy **벡터화 연산**을 사용하여 for 루프를 제거하는 것이 코드 품질의 핵심 지표입니다
- K-Means, 로지스틱 회귀 등 **기본 ML 알고리즘의 from-scratch 구현**을 숙지해야 합니다

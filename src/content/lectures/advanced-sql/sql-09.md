# 분석 쿼리 패턴

## 왜 분석 쿼리 패턴이 중요한가

코호트 분석, 퍼널 분석, 유지율 계산은 **프로덕트 매니저와 데이터 분석가가 매일 요청하는 핵심 분석**입니다. 이런 분석을 SQL로 직접 작성할 수 있으면 BI 도구에 의존하지 않고 유연하게 데이터를 탐색할 수 있습니다. sql-01~06에서 배운 Window Functions, CTE, 조인 패턴이 여기서 종합적으로 활용됩니다.

> **핵심 직관**: 대부분의 제품 분석은 "시간축 + 사용자 그룹 + 행동 이벤트"의 조합입니다. 이 세 축을 SQL로 표현하는 패턴을 익히면 어떤 분석 요청이든 대응할 수 있습니다.

## 1. 코호트 분석

코호트(Cohort)는 특정 기간에 동일한 경험을 한 사용자 그룹입니다. 가입 월별 코호트의 행동 변화를 추적합니다.

```sql
-- 가입 월별 코호트 유지율
WITH user_cohort AS (
    -- 사용자별 가입 월 (코호트)
    SELECT user_id,
        DATE_TRUNC('month', signup_date) AS cohort_month
    FROM users
),
user_activity AS (
    -- 사용자별 활동 월
    SELECT DISTINCT user_id,
        DATE_TRUNC('month', activity_date) AS activity_month
    FROM events
),
cohort_data AS (
    SELECT
        c.cohort_month,
        EXTRACT(MONTH FROM AGE(a.activity_month, c.cohort_month)) AS month_offset,
        COUNT(DISTINCT a.user_id) AS active_users
    FROM user_cohort c
    JOIN user_activity a ON c.user_id = a.user_id
    GROUP BY c.cohort_month, month_offset
),
cohort_size AS (
    SELECT cohort_month, COUNT(*) AS total_users
    FROM user_cohort GROUP BY cohort_month
)
SELECT
    d.cohort_month,
    d.month_offset,
    d.active_users,
    ROUND(100.0 * d.active_users / s.total_users, 1) AS retention_pct
FROM cohort_data d
JOIN cohort_size s ON d.cohort_month = s.cohort_month
ORDER BY d.cohort_month, d.month_offset;
```

```
코호트 유지율 테이블 (결과):

  코호트    | M0    | M1    | M2    | M3
  ---------+-------+-------+-------+------
  2024-01  | 100%  | 45%   | 30%   | 22%
  2024-02  | 100%  | 50%   | 35%   | 25%
  2024-03  | 100%  | 48%   | 33%   | —
```

## 2. 퍼널 분석

사용자가 특정 단계를 순서대로 거치는 전환율을 분석합니다.

```sql
-- 이커머스 퍼널: 방문 → 상품 조회 → 장바구니 → 결제
WITH funnel AS (
    SELECT
        user_id,
        MAX(CASE WHEN event = 'page_view' THEN 1 ELSE 0 END) AS step1_visit,
        MAX(CASE WHEN event = 'product_view' THEN 1 ELSE 0 END) AS step2_view,
        MAX(CASE WHEN event = 'add_to_cart' THEN 1 ELSE 0 END) AS step3_cart,
        MAX(CASE WHEN event = 'purchase' THEN 1 ELSE 0 END) AS step4_purchase
    FROM events
    WHERE event_date BETWEEN '2024-01-01' AND '2024-01-31'
    GROUP BY user_id
)
SELECT
    COUNT(*) AS total_users,
    SUM(step1_visit) AS visitors,
    SUM(step2_view) AS viewers,
    SUM(step3_cart) AS cart_adders,
    SUM(step4_purchase) AS purchasers,
    ROUND(100.0 * SUM(step2_view) / NULLIF(SUM(step1_visit), 0), 1) AS view_rate,
    ROUND(100.0 * SUM(step3_cart) / NULLIF(SUM(step2_view), 0), 1) AS cart_rate,
    ROUND(100.0 * SUM(step4_purchase) / NULLIF(SUM(step3_cart), 0), 1) AS purchase_rate
FROM funnel;
```

```
퍼널 결과:

  방문 → 상품 조회 → 장바구니 → 결제
  10,000   6,500      1,800     720
       (65.0%)    (27.7%)   (40.0%)

  전체 전환율: 720 / 10,000 = 7.2%
  최대 이탈: 상품 조회 → 장바구니 (72.3% 이탈)
```

> **핵심 직관**: 퍼널에서 가장 큰 이탈이 발생하는 구간이 **최우선 개선 대상**입니다. 전체 전환율을 올리려면 가장 많이 이탈하는 단계를 집중적으로 개선하세요.

## 3. 유지율 (Retention Rate)

```sql
-- Day-N 유지율 (가입 후 N일째 재방문 비율)
WITH first_activity AS (
    SELECT user_id, MIN(activity_date) AS first_date
    FROM events GROUP BY user_id
),
retention AS (
    SELECT
        f.first_date,
        e.activity_date - f.first_date AS day_n,
        COUNT(DISTINCT e.user_id) AS retained_users
    FROM first_activity f
    JOIN events e ON f.user_id = e.user_id
    WHERE e.activity_date - f.first_date BETWEEN 0 AND 30
    GROUP BY f.first_date, day_n
),
day0_users AS (
    SELECT first_date, COUNT(*) AS total
    FROM first_activity GROUP BY first_date
)
SELECT
    r.day_n,
    ROUND(AVG(100.0 * r.retained_users / d.total), 1) AS avg_retention_pct
FROM retention r
JOIN day0_users d ON r.first_date = d.first_date
GROUP BY r.day_n
ORDER BY r.day_n;
```

| 유지율 유형 | 측정 방식 | 용도 |
|-----------|----------|------|
| Day-N | N일 후 재방문 | 초기 온보딩 평가 |
| Week-N | N주 후 재방문 | 습관 형성 확인 |
| Rolling | 최근 N일 내 활동 | MAU/WAU 계산 |

## 4. A/B 테스트 SQL

ed-01에서 다룬 실험 설계를 SQL로 구현합니다.

```sql
-- A/B 테스트 결과 분석
WITH experiment AS (
    SELECT
        u.experiment_group,  -- 'control' or 'treatment'
        COUNT(DISTINCT u.user_id) AS users,
        COUNT(DISTINCT CASE WHEN e.event = 'purchase' THEN e.user_id END) AS converters,
        SUM(CASE WHEN e.event = 'purchase' THEN e.amount ELSE 0 END) AS total_revenue
    FROM ab_test_users u
    LEFT JOIN events e ON u.user_id = e.user_id
        AND e.event_date BETWEEN u.start_date AND u.end_date
    GROUP BY u.experiment_group
)
SELECT
    experiment_group,
    users,
    converters,
    ROUND(100.0 * converters / users, 2) AS conversion_rate,
    ROUND(total_revenue / users, 2) AS revenue_per_user,
    ROUND(total_revenue / NULLIF(converters, 0), 2) AS avg_order_value
FROM experiment;
```

```
A/B 테스트 결과:
  group     | users  | conv_rate | rev/user
  ----------+--------+-----------+---------
  control   | 50,000 | 3.20%     | $12.50
  treatment | 50,000 | 3.45%     | $13.80
  lift      |        | +7.8%     | +10.4%
```

> **핵심 직관**: SQL로 A/B 테스트 결과를 계산할 때, **LEFT JOIN**을 사용하여 이벤트가 없는 사용자(비전환)도 분모에 포함해야 정확한 전환율이 됩니다. INNER JOIN을 쓰면 전환율이 과대 추정됩니다.

## 5. 이동 지표 (Rolling Metrics)

```sql
-- 7일 이동 평균 DAU
WITH daily_active AS (
    SELECT
        activity_date,
        COUNT(DISTINCT user_id) AS dau
    FROM events
    GROUP BY activity_date
)
SELECT
    activity_date,
    dau,
    ROUND(AVG(dau) OVER (
        ORDER BY activity_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ), 0) AS rolling_7d_avg,
    -- 28일 MAU (이동)
    SUM(dau) OVER (
        ORDER BY activity_date
        ROWS BETWEEN 27 PRECEDING AND CURRENT ROW
    ) AS rolling_28d_total
FROM daily_active
ORDER BY activity_date;
```

## 6. 종합 분석 대시보드 쿼리

```sql
-- 핵심 지표 대시보드 (단일 쿼리)
WITH metrics AS (
    SELECT
        DATE_TRUNC('week', activity_date) AS week,
        COUNT(DISTINCT user_id) AS wau,
        COUNT(DISTINCT CASE WHEN event = 'purchase' THEN user_id END) AS buyers,
        SUM(CASE WHEN event = 'purchase' THEN amount ELSE 0 END) AS revenue,
        COUNT(*) AS total_events
    FROM events
    WHERE activity_date >= CURRENT_DATE - INTERVAL '12 weeks'
    GROUP BY week
)
SELECT
    week, wau, buyers, revenue,
    ROUND(100.0 * buyers / NULLIF(wau, 0), 1) AS buy_rate,
    ROUND(revenue / NULLIF(buyers, 0), 0) AS arpu,
    -- 전주 대비 변화
    ROUND(100.0 * (wau - LAG(wau) OVER (ORDER BY week)) /
          NULLIF(LAG(wau) OVER (ORDER BY week), 0), 1) AS wau_wow
FROM metrics ORDER BY week;
```

이 강의의 분석 패턴은 sql-10의 면접 문제와 dp-05의 데이터 모델링에서 실전적으로 활용됩니다.

## 핵심 정리

- **코호트 분석**은 가입 시점별 사용자 그룹의 행동 변화를 추적하며, CTE 체이닝으로 구현합니다
- **퍼널 분석**은 단계별 전환율을 계산하며, 가장 큰 이탈 구간이 최우선 개선 대상입니다
- **유지율**은 Day-N, Week-N, Rolling 방식이 있으며, 제품 성장의 핵심 지표입니다
- A/B 테스트 SQL에서는 **LEFT JOIN**으로 비전환 사용자를 분모에 포함해야 정확한 전환율이 됩니다
- Window Functions(LAG, 이동 평균)를 활용하면 시계열 지표의 **추세와 변화율**을 한 쿼리로 계산합니다

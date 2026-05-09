import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════
//  設定區
// ═══════════════════════════════════════════════════════════

const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbwtLeQmPA9TrV9xl1JZSHOmq8fgbeIfAMAxNrgoAexYEhagQXqBJK3lNJqt0gPw_KxPuQ/exec';
const EXPECTED_GAS_VERSION = '1.9';

// ═══════════════════════════════════════════════════════════
//  工具函式
// ═══════════════════════════════════════════════════════════

const fmt  = n => (n != null && !isNaN(n) ? '$' + Math.round(n).toLocaleString() : '—');
const fmtN = n => (n != null && !isNaN(n) ? Math.round(n).toLocaleString() : '—');

const getBrand = (name) => {
  if (!name || name.includes('🚫') || name.includes('♻️')) return '';
  const s = name.trim();
  if (/iphone|ipad|macbook|airpods|apple watch|蘋果/i.test(s)) return 'Apple';
  if (/samsung|galaxy/i.test(s)) return 'Samsung';
  if (/\bvivo\b/i.test(s)) return 'vivo';
  if (/oppo|reno|find x/i.test(s)) return 'OPPO';
  if (/xiaomi|redmi|poco|小米/i.test(s)) return '小米';
  if (/\basus\b|rog phone|zenfone/i.test(s)) return 'ASUS';
  if (/\bsony\b|xperia/i.test(s)) return 'SONY';
  if (/realme/i.test(s)) return 'realme';
  if (/nokia/i.test(s)) return 'Nokia';
  if (/motorola|moto\s/i.test(s)) return 'Motorola';
  if (/^(1[2-9])\s*(pro|plus|mini|max|ultra)(\s|$)/i.test(s)) return 'Apple';
  if (/^[as]\d{2}(\s|\/|$)/i.test(s)) return 'Samsung';
  if (/^z\s*(fold|flip)\s*\d/i.test(s)) return 'Samsung';
  if (/^[vxy]\d{2}(\s|$)/i.test(s)) return 'vivo';
  return s.split(/\s+/)[0] || '其他';
};

const getCategoryFromId = (itemId) => {
  if (!itemId || itemId === 'pure_sim' || itemId === 'used_phone') return '全部';
  const parts = itemId.split('_');
  return parts.length >= 3 ? parts[1] : '全部';
};

// ═══════════════════════════════════════════════════════════
//  內建話術模板（備援：GAS 無資料時自動啟用）
//  設計依據：錨定效應、損失規避、Feel-Felt-Found、每日費用換算
// ═══════════════════════════════════════════════════════════

const BUILTIN_TEMPLATES = [
  // ── 購機情境 ──────────────────────────────────────────────
  {
    situation: '購機', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【錨定建議售價】這支手機市面上要「建議售價」那個數字，我們搭這個方案只要「硬體專案價」，直接省了一大塊。月租跟您現在差不多，整個合約期「合約總支出」算下來，比您自己買手機加月租還要划算，數字都在上面了。`,
  },
  {
    situation: '購機', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【每天費用換算】今天帶走就付「當日離櫃需繳」那個數字，月租的部分 30 天除下來，每天大概一杯手搖飲料的錢，就能用 5G 加上新手機。您現在一個月在手機費上大概花多少？我幫您比比看。`,
  },
  {
    situation: '購機', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【通訊行優勢】一樣的方案，您去電信公司門市辦，折扣不會有我們多，因為我們走代理，優惠直接反映在手機價格上。辦完有任何問題，直接回來找我，不用打客服電話等半天。螢幕上的數字都是真實計算的，沒有隱藏費用。`,
  },
  {
    situation: '購機', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【客戶猶豫：找出卡點】沒關係，考慮很正常。我問您一個問題：主要在意的是哪一塊？是今天要付的金額、每個月的費用，還是合約期太長？您說哪裡卡住，我再幫您調整，我們方案有一些彈性空間。`,
  },
  {
    situation: '購機', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【Feel-Felt-Found 促成】我理解，這個金額確實要想清楚，很多客人一開始也跟您一樣會猶豫。但後來他們算一算，月租攤開來每天不到 20 塊，手機的錢也比自己買便宜，反而覺得當初應該直接辦。您是想帶哪個顏色走呢？`,
  },
  {
    situation: '購機', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【稀缺性促成】這個折扣是我們代理商這個月的專案，下個月不一定有，廠商有時候會調整。您看「折抵了」那個數字，省的這塊是真的省掉的。趁現在最划算，要不要先確認一下顏色？`,
  },
  {
    situation: '購機', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【對比競品：我們更划算】同樣月租等級，市場上的折扣大概在某個範圍，我們現在能做到的比市面上好。這個不是我說說而已，您可以掃一下市場折扣雷達那個區塊，我們的數字放進去對比就看出來了。`,
  },

  // ── 純門號情境 ────────────────────────────────────────────
  {
    situation: '純門號', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【自有手機最划算】手機還很好用就不用換，純帶號碼過來最省！攜碼優惠直接折在月租上，右邊「實質月租負擔」就是您每個月真正要付的，比很多人現在繳的還低。號碼不用換，SIM 卡現場換好就能用。`,
  },
  {
    situation: '純門號', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【攜碼無痛：2-3 天搞定】很多人擔心攜碼麻煩，其實現在超快，大概 2 到 3 個工作天完成，過程中電話照常可以打。只要帶身分證來，其他我幫您處理。號碼一樣、帳單寄到家，完全不影響日常使用。`,
  },
  {
    situation: '純門號', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【年度節省計算】您現在付多少月租？每個月省下的差額，一年就是 12 倍，30 個月合約期更可觀。號碼帶過來就好，手機繼續用，月費直接降——沒有比這更簡單的方式了。您一個月大概繳多少？我幫您算一算。`,
  },

  // ── 促轉情境 ──────────────────────────────────────────────
  {
    situation: '促轉', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【月租差額直擊】試算結果在上面，您現在每個月付的跟新方案差了「每月省」那個數字。整個合約期加起來省的很可觀。更重要的是新方案網路更快，實際用起來差很多。您現在合約大概還剩多久？`,
  },
  {
    situation: '促轉', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【機會成本：不換就是損失】繼續用現在的方案，每個月相當於多付了那個差額。市場上已經有更好的選擇，但您還在補貼舊方案。今天辦好，下個月帳單就開始省。晚辦一個月，就少省一個月。`,
  },
  {
    situation: '促轉', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【合約未到期的克服】沒到期也沒關係，我們先查您的合約還剩幾個月、解約費大概多少。算法很簡單：省下的月費 ÷ 解約費 = 幾個月回本。通常省個幾個月就全補回來了，之後剩下的全部是純賺。要不要先查看看？`,
  },
  {
    situation: '促轉', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【語言框架：解約費→差額補貼】這個費用概念上比較像「提早享受新方案的差額補貼」，補完之後後面的月份全部以新費率算，省的錢很快就補回來了。上面「節省分析」可以看到合約期總節省，大部分客人幾個月就回本了。`,
  },
  {
    situation: '促轉', operator: '全部', author: '馬尼話術庫', useCount: 0,
    content: `【促轉+搭機雙重優惠】您現在換方案，搭手機一起的話折扣更多，因為購機優惠加上攜碼優惠可以疊加。如果手機也快要換了，現在一起處理是最划算的時間點。您手機用多久了？如果電池或速度已經有點跟不上，剛好一起升級。`,
  },
];

// ═══════════════════════════════════════════════════════════
//  設計系統
// ═══════════════════════════════════════════════════════════

const theme = {
  bg: '#f8fafc', cardBg: '#ffffff',
  textMain: '#0f172a', textSub: '#64748b', textMuted: '#94a3b8',
  border: '#e2e8f0', borderLight: '#f1f5f9',
  primary: '#3b82f6', primaryBg: '#eff6ff',
  success: '#10b981', successBg: '#ecfdf5',
  warning: '#f59e0b', danger: '#ef4444',
  shadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
  shadowLg: '0 10px 15px -3px rgb(0 0 0 / 0.05)',
  radius: '16px', radiusSm: '8px',
};

const staffTheme = {
  ...theme,
  bg: '#E2E8E6', cardBg: '#FFFFFF',
  textMain: '#2A3C38', textSub: '#6B807C',
  border: '#C5D3D0', borderLight: '#D8E2DF',
  primary: '#517C76', primaryBg: '#EBF0EF',
  success: '#598C73', successBg: '#E9F2ED',
  danger: '#C47070',
};

// ═══════════════════════════════════════════════════════════
//  UI 共用元件
// ═══════════════════════════════════════════════════════════

const Card = ({ children, style, t }) => (
  <div style={{ background: t.cardBg, border: `1px solid ${t.border}`, borderRadius: t.radius, padding: 20, boxShadow: t.shadow, ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children, t }) => (
  <div style={{ fontSize: 14, fontWeight: 700, color: t.textMain, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 4, height: 14, background: t.primary, borderRadius: 2 }} />{children}
  </div>
);

const TabButton = ({ active, onClick, children, small, t, staffMode }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: small ? '6px 10px' : '8px 12px',
    fontSize: small ? 12 : 14, fontWeight: 600,
    borderRadius: t.radiusSm, border: `1px solid ${active ? t.primary : t.border}`,
    background: active ? t.primary : 'transparent',
    color: active ? (staffMode ? t.cardBg : '#fff') : t.textSub,
    cursor: 'pointer', whiteSpace: 'nowrap',
  }}>{children}</button>
);

const ProfitRow = ({ label, value, color, t, large }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${t.border}` }}>
    <span style={{ fontSize: 13, color: t.textSub, fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: large ? 22 : 15, fontWeight: 700, fontFamily: 'monospace', color: color || t.textMain }}>{value}</span>
  </div>
);

// ★ 話術參考區塊元件（v1.9 final）
// 方向 A：一線人員話術自動顯示（自動載入）
// 方向 B：AI 話術按鈕生成（點擊觸發）
function ManieTalkPanel({ talk, templates, templatesLoading, talkLoading, onGenerate, t }) {
  return (
    <div style={{ background: '#f0f9ff', border: `2px dashed ${t.primary}40`, borderRadius: t.radiusSm, padding: 16, marginBottom: 18 }}>

      {/* 標題列 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 900, color: t.primary, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          馬尼話術參考
        </div>
        <button onClick={onGenerate} disabled={talkLoading}
          style={{ fontSize: 11, padding: '5px 12px', borderRadius: 6, border: 'none', background: talkLoading ? '#94a3b8' : t.primary, color: '#fff', cursor: talkLoading ? 'default' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
          {talkLoading ? (
            <><svg style={{ animation: 'spin 1s linear infinite' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>生成中…</>
          ) : <>✨ Manie 話術參考</>}
        </button>
      </div>

      {/* ── 方向 A：一線人員話術（自動載入，直接顯示）── */}
      <div style={{ marginBottom: (talk || talkLoading) ? 14 : 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>一線話術參考</span>
          {templatesLoading && <svg style={{ animation: 'spin 1s linear infinite' }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>}
        </div>
        {templatesLoading ? (
          <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>載入中…</div>
        ) : templates.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '8px 12px', background: 'white', borderRadius: 6, border: '1px dashed #e2e8f0' }}>
            尚無符合本方案的一線話術。
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map((tmpl, i) => {
              const isBuiltin = tmpl.author === '馬尼話術庫';
              return (
                <div key={i} style={{ background: 'white', border: `1px solid ${isBuiltin ? '#dbeafe' : '#e2e8f0'}`, borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#eff6ff', color: '#3b82f6', fontWeight: 700 }}>{tmpl.situation}</span>
                      {tmpl.operator && tmpl.operator !== '全部' && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}>{tmpl.operator}</span>
                      )}
                      {isBuiltin && (
                        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, background: '#f0f9ff', color: '#0ea5e9', fontWeight: 700 }}>內建模板</span>
                      )}
                    </div>
                    {!isBuiltin && (
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{tmpl.author} · 使用 {tmpl.useCount} 次</span>
                    )}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{tmpl.content}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 分隔線 ── */}
      {(talk || talkLoading) && <div style={{ borderTop: '1px dashed #bfdbfe', margin: '14px 0' }} />}

      {/* ── 方向 B：AI 生成話術（點按鈕後才出現）── */}
      {(talk || talkLoading) && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.primary, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Manie AI 生成話術
          </div>
          {talkLoading ? (
            <div style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>正在生成…</div>
          ) : (
            <div style={{ fontSize: 14, color: '#1e3a5f', lineHeight: 1.8, fontWeight: 500, background: '#eff6ff', borderRadius: 8, padding: '12px 14px', borderLeft: `3px solid ${t.primary}` }}>
              {talk}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  主元件
// ═══════════════════════════════════════════════════════════

export default function App() {
  const [staffMode,      setStaffMode]      = useState(false);
  const [loginInput,     setLoginInput]     = useState('');
  const [loginError,     setLoginError]     = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  const [planId,         setPlanId]         = useState('');
  const [phoneId,        setPhoneId]        = useState('pure_sim');
  const [phoneSearch,    setPhoneSearch]    = useState('');
  const [phoneCategory,  setPhoneCategory]  = useState('全部');
  const [phoneBrand,     setPhoneBrand]     = useState('全部');
  const [selectedOp,     setSelectedOp]     = useState('');
  const [actionType,     setActionType]     = useState('MNP');
  const [planNet,        setPlanNet]        = useState('全部');
  const [origMonthly,    setOrigMonthly]    = useState('599');
  const [origPeriod,     setOrigPeriod]     = useState('30');
  const [usedPhoneName,  setUsedPhoneName]  = useState('');
  const [usedPhonePrice, setUsedPhonePrice] = useState('');
  const [customRebate,   setCustomRebate]   = useState(null);
  const [radarOp,        setRadarOp]        = useState('全部');
  const [radarNet,       setRadarNet]       = useState('全部');
  const [isMobile,       setIsMobile]       = useState(window.innerWidth < 768);

  // ★ 話術相關狀態
  const [generatedTalk,  setGeneratedTalk]  = useState('');
  const [talkLoading,    setTalkLoading]    = useState(false);
  const [talkTemplates,  setTalkTemplates]  = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  const [appData,    setAppData]    = useState({ plans: [], hardware: [], rules: {}, competitors: [], marketPlans: [] });
  const [loading,    setLoading]    = useState(true);
  const [initError,  setInitError]  = useState(null);
  const [lastFetch,  setLastFetch]  = useState(null);

  const t = staffMode ? staffTheme : theme;

  // ── API 層 ──────────────────────────────────────────────
  const api = useCallback(async (action, token = '') => {
    const url = token
      ? `${GAS_API_URL}?action=${action}&token=${encodeURIComponent(token)}`
      : `${GAS_API_URL}?action=${action}`;
    const res  = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API Error');
    return json.data;
  }, []);

  const apiWithParams = useCallback(async (action, params = {}) => {
    const qs  = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `${GAS_API_URL}?action=${action}&${qs}`;
    const res  = await fetch(url);
    const json = await res.json();
    if (!json.success) throw new Error(json.error || 'API Error');
    return json.data;
  }, []);

  // ── 初始載入 ────────────────────────────────────────────
  const initLoad = useCallback(async () => {
    setLoading(true); setInitError(null);
    try {
      const [plans, hardware, competitors, marketPlans] = await Promise.all([
        api('plans'), api('hardware'), api('competitors'), api('market_plans'),
      ]);
      if (plans && plans.length > 0) {
        const gasVer = plans[0]._gasVersion;
        if (!gasVer) throw new Error(`【GAS 版本過舊】\n請更新至 Code.gs v${EXPECTED_GAS_VERSION} 並發布新版本。`);
        if (gasVer !== EXPECTED_GAS_VERSION) throw new Error(`【GAS 版本不符】\n前端預期：v${EXPECTED_GAS_VERSION}\nGAS 目前：v${gasVer}`);
      }
      setAppData(prev => ({ ...prev, plans: plans || [], hardware: hardware || [], competitors: Array.isArray(competitors) ? competitors : [], marketPlans: Array.isArray(marketPlans) ? marketPlans : [] }));
      setLastFetch(new Date());
      if (plans && plans.length > 0) setSelectedOp(plans[0].operator);
    } catch (err) { setInitError(err.message); }
    finally { setLoading(false); }
  }, [api]);

  useEffect(() => { initLoad(); }, [initLoad]);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    if (phoneId) document.getElementById(`phone-${phoneId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [phoneId]);
  useEffect(() => {
    if (planId) document.getElementById(`plan-${planId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [planId]);

  // ── 切換方案或手機時清空已生成的話術 ──────────────────
  // ★ 選完方案後自動載入一線話術（方向 A）
  useEffect(() => {
    setGeneratedTalk('');
    setTalkTemplates([]);
    if (!planId || !phoneId) return;

    const isOrigValid = (() => {
      const m = parseInt(origMonthly, 10);
      const p = parseInt(origPeriod,  10);
      return !isNaN(m) && m > 0 && !isNaN(p) && p > 0;
    })();

    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const currentPlan = plans.find(p => p.planId === planId);
        if (!currentPlan) return;
        const situation = phoneId === 'pure_sim' ? '純門號' : isOrigValid ? '促轉' : '購機';

        let result = [];
        try {
          result = await apiWithParams('talk_templates', {
            situation,
            operator:    currentPlan.operator,
            msrpMonthly: currentPlan.msrpMonthly,
          }) || [];
        } catch (_) { result = []; }

        if (result.length > 0) {
          setTalkTemplates(result);
        } else {
          // GAS 無資料時啟用內建話術模板
          const builtin = BUILTIN_TEMPLATES.filter(t => t.situation === situation);
          setTalkTemplates(builtin);
        }
      } catch (_) {
        setTalkTemplates([]);
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, [planId, phoneId, actionType, origMonthly, origPeriod, plans, apiWithParams]);

  // ── 後台登入 ────────────────────────────────────────────
  const handleStaffLogin = useCallback(async () => {
    setLoginError('');
    if (!loginInput.trim()) { setLoginError('請輸入後台密碼'); return; }
    try {
      const confidentialRules = await api('rules', loginInput.trim());
      setAppData(prev => ({ ...prev, rules: confidentialRules || {} }));
      setStaffMode(true); setShowLoginModal(false); setLoginInput('');
    } catch (_) { setLoginError('密碼錯誤或連線失敗'); }
  }, [api, loginInput]);

  const handleStaffLogout = useCallback(() => {
    setStaffMode(false);
    setAppData(prev => ({ ...prev, rules: {} }));
    setCustomRebate(null);
  }, []);

  // ── 核心資料 ────────────────────────────────────────────
  const { plans, hardware, rules, competitors, marketPlans } = appData;
  const plan = plans.find(p => p.planId === planId);

  let phone;
  if (phoneId === 'pure_sim') {
    phone = { itemId: 'pure_sim', brandModel: '🚫 不搭機（純門號月租折抵）', flashPrice: 0, costBase: 0, retailMsrp: 0, isPure: true };
  } else if (phoneId === 'used_phone') {
    const price = parseInt(usedPhonePrice, 10) || 0;
    phone = { itemId: 'used_phone', brandModel: `♻️ ${usedPhoneName || '自訂二手機/空機'}`, flashPrice: price, costBase: price, retailMsrp: price, isPure: false };
  } else {
    const found = hardware.find(h => h.itemId === phoneId);
    phone = found ? { ...found, isPure: false } : null;
  }

  const publicRule       = plan ? plan.publicRules?.[actionType] : null;
  const confidentialRule = (staffMode && rules) ? rules[planId]?.[actionType] : null;
  const activeRebate     = customRebate !== null && publicRule != null ? customRebate : (publicRule?.maxRebate || 0);
  const safePeriod       = (plan?.contractPeriod && plan.contractPeriod > 0) ? plan.contractPeriod : 1;
  const origMonthlyNum   = parseInt(origMonthly, 10);
  const origPeriodNum    = parseInt(origPeriod,  10);
  const origInputValid   = !isNaN(origMonthlyNum) && origMonthlyNum > 0 && !isNaN(origPeriodNum) && origPeriodNum > 0;

  const calc = (plan && phone && publicRule) ? (() => {
    const hwFinal    = phone.isPure ? 0 : Math.max(0, phone.flashPrice - activeRebate);
    const effMonthly = phone.isPure ? Math.max(0, Math.round(plan.msrpMonthly - activeRebate / safePeriod)) : plan.msrpMonthly;
    const totalToday = hwFinal + (publicRule.advance || 0);
    const tco        = phone.isPure ? effMonthly * safePeriod : hwFinal + plan.msrpMonthly * safePeriod;
    const hwProfit   = phone.isPure ? 0 : Math.max(0, phone.flashPrice - phone.costBase);
    const savingMonthly = origInputValid ? Math.round(origMonthlyNum - effMonthly) : null;
    const savingTotal   = origInputValid ? (origMonthlyNum * safePeriod) - tco : null;
    let gross = null, floorMargin = null, totalProfit = null, extraRoom = null;
    if (staffMode && confidentialRule) {
      gross = confidentialRule.gross; floorMargin = confidentialRule.floorMargin;
      totalProfit = (gross - activeRebate) + hwProfit;
      extraRoom   = Math.max(0, gross - activeRebate - floorMargin);
    }
    const situation = phone.isPure ? '純門號' : origInputValid ? '促轉' : '購機';
    return { hwFinal, totalToday, effMonthly, tco, hwProfit, gross, floorMargin, totalProfit, extraRoom, isPure: phone.isPure, advance: publicRule.advance || 0, situation, savingMonthly, savingTotal };
  })() : null;

  // ── ★ Manie 話術參考生成 ──────────────────────────────
  const handleGenerateTalk = useCallback(async () => {
    if (!calc || !plan) return;
    setTalkLoading(true);
    try {
      // 直接生成 AI 話術（話術範例已由 useEffect 自動載入）
      const result = await apiWithParams('generate_talk', {
        situation:    calc.situation,
        operator:     plan.operator,
        category:     plan.category,
        msrpMonthly:  plan.msrpMonthly,
        rebate:       activeRebate,
        hwFinal:      calc.hwFinal,
        advance:      calc.advance,
        isPure:       calc.isPure,
        phoneName:    phone?.brandModel || '',
        period:       safePeriod,
        actionType,
        origMonthly:  origInputValid ? origMonthlyNum : '',
        origPeriod:   origInputValid ? origPeriodNum  : '',
      });
      setGeneratedTalk(result.talk || '');
    } catch (err) {
      setGeneratedTalk('⚠️ 生成失敗：' + err.message);
    } finally {
      setTalkLoading(false);
    }
  }, [calc, plan, phone, activeRebate, safePeriod, actionType, origInputValid, origMonthlyNum, origPeriodNum, apiWithParams]);

  // ── 篩選 ────────────────────────────────────────────────
  const hardwareCategories = ['全部', ...new Set(hardware.map(h => getCategoryFromId(h.itemId)))];
  const hardwareByCategory = phoneCategory === '全部' ? hardware : hardware.filter(h => getCategoryFromId(h.itemId) === phoneCategory);
  const hardwareBrands     = ['全部', ...new Set(hardwareByCategory.map(h => getBrand(h.brandModel)))].filter(b => b !== '');
  const filteredHardware   = hardwareByCategory.filter(h => {
    const nameMatch  = h.brandModel.toLowerCase().includes(phoneSearch.toLowerCase());
    const brandMatch = phoneBrand === '全部' || getBrand(h.brandModel) === phoneBrand;
    return nameMatch && brandMatch;
  });

  const availableOperators = [...new Set(plans.map(p => p.operator))].filter(Boolean);
  const filteredPlans      = plans.filter(p => p.operator === selectedOp).filter(p => planNet === '全部' || p.category.includes(planNet));

  const marketAsCompetitors = marketPlans.filter(mp => {
    return (radarOp === '全部' || mp.operator === radarOp) &&
           (radarNet === '全部' || mp.networkGen === radarNet) &&
           mp.actionType === actionType;
  }).map(mp => ({ ...mp, competitor: '', isMarket: true }));

  const relevantMarket = plan ? marketAsCompetitors.filter(m => m.operator === plan.operator) : [];
  const radarOperators = ['全部', ...new Set(marketPlans.map(m => m.operator))];

  const actionTypeLabel = { MNP: '攜碼', NEW: '新申辦', RENEW: '續約' };

  // ── Loading / Error ──────────────────────────────────────
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: theme.bg }}>
      <div style={{ width: 40, height: 40, border: `4px solid ${theme.border}`, borderTopColor: theme.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginTop: 16, fontWeight: 600, color: theme.textSub }}>馬尼大腦連線中…</div>
    </div>
  );

  if (initError) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: theme.bg, padding: 20 }}>
      <div style={{ background: theme.cardBg, border: `2px solid ${theme.danger}`, borderRadius: 16, padding: 32, maxWidth: 460, boxShadow: theme.shadowLg }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: theme.danger, marginBottom: 16, textAlign: 'center' }}>⚠️ 連線中斷或版本異常</div>
        <div style={{ fontSize: 14, color: theme.textMain, marginBottom: 24, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{initError}</div>
        <button onClick={initLoad} style={{ width: '100%', fontSize: 15, padding: '12px 24px', borderRadius: 8, border: 'none', background: theme.danger, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>重新連線</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: t.bg, padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* 登入 Modal */}
      {showLoginModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: 340, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: '#0f172a' }}>🔒 後台登入</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>輸入後台管理密碼以查看佣金結構</div>
            <input type="password" placeholder="後台密碼" value={loginInput}
              onChange={e => setLoginInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStaffLogin()}
              autoFocus
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${loginError ? '#ef4444' : '#e2e8f0'}`, fontSize: 14, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
            {loginError && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 12 }}>{loginError}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setShowLoginModal(false); setLoginInput(''); setLoginError(''); }}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', cursor: 'pointer', fontSize: 14, color: '#64748b' }}>取消</button>
              <button onClick={handleStaffLogin}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 'none', background: '#517C76', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>登入</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Header */}
        <div style={{ background: t.cardBg, borderRadius: t.radius, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: t.shadowLg }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: t.primary, display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              馬尼通訊 · 數位報價終端
            </h1>
            <p style={{ fontSize: 13, color: t.textSub, marginTop: 2 }}>
              {staffMode ? '🔒 後台登入模式（店長權限）' : '👋 歡迎蒞臨！為您精算最優方案'}
              {lastFetch && ` · 資料更新 ${lastFetch.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <button onClick={() => staffMode ? handleStaffLogout() : setShowLoginModal(true)}
            style={{ fontSize: 13, fontWeight: 700, padding: '8px 20px', borderRadius: 12, border: `1.5px solid ${staffMode ? t.danger : t.border}`, background: staffMode ? `${t.danger}15` : 'transparent', color: staffMode ? t.danger : t.textSub, cursor: 'pointer' }}>
            {staffMode ? '🔒 退出後台' : '💼 後台登入'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 4fr) minmax(0, 6fr)', gap: 20, alignItems: 'start' }}>

          {/* 左欄 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 商品選擇 */}
            <Card t={t} style={{ height: isMobile ? 'auto' : 480, display: 'flex', flexDirection: 'column' }}>
              <SectionTitle t={t}>1. 選擇商品型號</SectionTitle>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {hardwareCategories.map(c => (
                  <button key={c} onClick={() => { setPhoneCategory(c); setPhoneBrand('全部'); }}
                    style={{ padding: '6px 14px', fontSize: 13, fontWeight: 700, borderRadius: 20, border: 'none', background: phoneCategory === c ? t.textMain : t.borderLight, color: phoneCategory === c ? t.cardBg : t.textSub, cursor: 'pointer', whiteSpace: 'nowrap' }}>{c}</button>
                ))}
              </div>
              <input type="text" placeholder="🔍 快速搜尋型號..." value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: t.radiusSm, border: `1.5px solid ${t.border}`, background: t.borderLight, marginBottom: 10, outline: 'none', color: t.textMain, boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                {hardwareBrands.map(b => (
                  <button key={b} onClick={() => { setPhoneBrand(b); setCustomRebate(null); }}
                    style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 8, border: `1.5px solid ${phoneBrand === b ? t.primary : t.borderLight}`, background: phoneBrand === b ? t.primaryBg : 'transparent', color: phoneBrand === b ? t.primary : t.textSub, cursor: 'pointer' }}>{b}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: isMobile ? 320 : undefined, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                <button id="phone-pure_sim" onClick={() => { setPhoneId('pure_sim'); setCustomRebate(null); }}
                  style={{ textAlign: 'left', background: phoneId === 'pure_sim' ? t.primaryBg : 'transparent', border: `2.5px solid ${phoneId === 'pure_sim' ? t.primary : t.border}`, borderRadius: t.radiusSm, padding: '12px 16px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 800, color: t.primary, fontSize: 15 }}>🚫 不搭機（純門號月租折抵）</div>
                  <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>將專案優惠轉為通話費溢繳扣抵</div>
                </button>
                <button id="phone-used_phone" onClick={() => { setPhoneId('used_phone'); setCustomRebate(null); }}
                  style={{ textAlign: 'left', background: phoneId === 'used_phone' ? t.primaryBg : 'transparent', border: `2.5px solid ${phoneId === 'used_phone' ? t.primary : t.border}`, borderRadius: t.radiusSm, padding: '12px 16px', cursor: 'pointer' }}>
                  <div style={{ fontWeight: 800, color: t.primary, fontSize: 15 }}>♻️ 不限品牌（二手機/自訂空機）</div>
                  <div style={{ fontSize: 12, color: t.textSub, marginTop: 2 }}>自行輸入型號與價格，系統自動精算</div>
                </button>
                {phoneId === 'used_phone' && (
                  <div style={{ padding: 12, background: t.borderLight, borderRadius: 8, border: `1px dashed ${t.primary}` }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" placeholder="型號（如: iPhone 13）" value={usedPhoneName} onChange={e => setUsedPhoneName(e.target.value)}
                        style={{ flex: 2, padding: 8, borderRadius: 6, border: `1px solid ${t.border}`, outline: 'none', fontSize: 13 }} />
                      <input type="number" placeholder="售價" value={usedPhonePrice} onChange={e => setUsedPhonePrice(e.target.value)}
                        style={{ flex: 1, padding: 8, borderRadius: 6, border: `1px solid ${t.border}`, outline: 'none', fontSize: 13 }} />
                    </div>
                  </div>
                )}
                {filteredHardware.map(h => (
                  <button key={h.itemId} id={`phone-${h.itemId}`} onClick={() => { setPhoneId(h.itemId); setCustomRebate(null); }}
                    style={{ textAlign: 'left', background: phoneId === h.itemId ? t.primaryBg : 'transparent', border: `1.5px solid ${phoneId === h.itemId ? t.primary : t.border}`, borderRadius: t.radiusSm, padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: phoneId === h.itemId ? t.primary : t.textMain }}>{h.brandModel}</div>
                      <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>建議售價 {fmt(h.retailMsrp)}</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: phoneId === h.itemId ? t.primary : t.textMain }}>{fmt(h.flashPrice)}</div>
                  </button>
                ))}
              </div>
            </Card>

            {/* 電信方案 */}
            <Card t={t} style={{ height: isMobile ? 'auto' : 420, display: 'flex', flexDirection: 'column' }}>
              <SectionTitle t={t}>2. 選擇電信方案</SectionTitle>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {availableOperators.map(op => (
                  <TabButton key={op} active={selectedOp === op} onClick={() => { setSelectedOp(op); setCustomRebate(null); }} t={t} staffMode={staffMode}>{op}</TabButton>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[{ id: 'MNP', label: '攜碼' }, { id: 'NEW', label: '新申辦' }, { id: 'RENEW', label: '續約' }].map(type => (
                  <TabButton key={type.id} small active={actionType === type.id} onClick={() => { setActionType(type.id); setCustomRebate(null); }} t={t} staffMode={staffMode}>{type.label}</TabButton>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, background: t.borderLight, padding: 4, borderRadius: 10 }}>
                {['全部', '4G', '5G'].map(net => (
                  <button key={net} onClick={() => setPlanNet(net)}
                    style={{ flex: 1, padding: '6px', fontSize: 12, fontWeight: 800, borderRadius: 8, border: 'none', background: planNet === net ? t.cardBg : 'transparent', color: planNet === net ? t.primary : t.textMuted, cursor: 'pointer', boxShadow: planNet === net ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>{net}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', maxHeight: isMobile ? 300 : undefined, display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 4 }}>
                {filteredPlans.map(p => {
                  const pr     = p.publicRules?.[actionType];
                  const active = planId === p.planId;
                  return (
                    <button key={p.planId} id={`plan-${p.planId}`}
                      onClick={() => { if (pr) { setPlanId(p.planId); setCustomRebate(null); } }} disabled={!pr}
                      style={{ textAlign: 'left', background: active ? t.successBg : 'transparent', border: `1.5px solid ${active ? t.success : t.border}`, borderRadius: t.radiusSm, padding: 14, opacity: pr ? 1 : 0.35, cursor: pr ? 'pointer' : 'not-allowed' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: active ? t.success : t.textMain, fontSize: 15 }}>
                          {p.category}
                          {p.cardType && <span style={{ fontSize: 11, marginLeft: 6, padding: '2px 6px', background: t.borderLight, color: t.textSub, borderRadius: 4 }}>{p.cardType}卡</span>}
                        </span>
                        {/* ★ 移除「實質 $XX/月」顯示 */}
                        {pr
                          ? <span style={{ fontWeight: 800, color: active ? t.success : t.textMain }}>{fmt(p.msrpMonthly)}<span style={{ fontSize: 11 }}>/月</span></span>
                          : <span style={{ fontSize: 11, color: t.textMuted }}>無報價</span>}
                      </div>
                      <div style={{ fontSize: 12, color: t.textSub, marginTop: 4 }}>合約 {p.contractPeriod} 期</div>
                      {staffMode && confidentialRule && planId === p.planId && (
                        <div style={{ fontSize: 11, color: '#517C76', marginTop: 4, fontFamily: 'monospace' }}>
                          傭 {fmtN(confidentialRule.gross)} · 底 {fmtN(confidentialRule.floorMargin)}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* 促轉分析 */}
            <Card t={t} style={{ background: t.borderLight, border: `1px dashed ${t.border}` }}>
              <SectionTitle t={t}>🎯 3. 顧客原合約狀態（促轉分析）</SectionTitle>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: t.textSub, fontWeight: 600 }}>原月租費</label>
                  <input type="number" value={origMonthly} onChange={e => setOrigMonthly(e.target.value)} placeholder="例: 599"
                    style={{ width: '100%', padding: '8px 12px', marginTop: 4, borderRadius: 6, border: `1px solid ${(!origMonthly || isNaN(parseInt(origMonthly, 10))) ? t.danger : t.border}`, outline: 'none', background: t.cardBg, color: t.textMain, boxSizing: 'border-box' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: t.textSub, fontWeight: 600 }}>原合約期數</label>
                  <input type="number" value={origPeriod} onChange={e => setOrigPeriod(e.target.value)} placeholder="例: 30"
                    style={{ width: '100%', padding: '8px 12px', marginTop: 4, borderRadius: 6, border: `1px solid ${(!origPeriod || isNaN(parseInt(origPeriod, 10))) ? t.danger : t.border}`, outline: 'none', background: t.cardBg, color: t.textMain, boxSizing: 'border-box' }} />
                </div>
              </div>
              {!origInputValid && (origMonthly || origPeriod) && (
                <div style={{ fontSize: 11, color: t.danger, marginTop: 6 }}>請輸入有效的正整數以啟用促轉分析</div>
              )}
            </Card>
          </div>

          {/* 右欄 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* 試算結果卡片 */}
            {calc ? (
              <Card t={t} style={{ background: staffMode ? 'linear-gradient(145deg, #F4F7F6, #E6EDEC)' : 'linear-gradient(145deg, #ffffff, #f0f9ff)', border: `1.5px solid ${staffMode ? '#C5D3D0' : '#bfdbfe'}` }}>
                <SectionTitle t={t}>{calc.isPure ? '🚫 純門號月租折抵專案' : '📱 購機優惠專案'}</SectionTitle>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: t.textMain, letterSpacing: '-0.02em' }}>{phone.brandModel}</h2>
                <p style={{ color: t.textSub, marginBottom: 12, fontWeight: 600 }}>
                  搭配 {plan.operator} {fmt(plan.msrpMonthly)}/月 · {actionTypeLabel[actionType]} · {plan.contractPeriod}期
                  {plan.cardType && <span style={{ fontSize: 12, marginLeft: 8, padding: '2px 8px', background: t.borderLight, borderRadius: 4, color: t.textSub }}>{plan.cardType}卡</span>}
                </p>

                {/* 資費說明 */}
                {plan.content && (
                  <div style={{ marginBottom: 16, padding: '10px 14px', background: staffMode ? '#FFFFFF80' : '#f8fafc', borderRadius: 10, borderLeft: `3px solid ${t.primary}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.primary, marginBottom: 6 }}>資費方案內容</div>
                    <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.7 }}>
                      {plan.content.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: calc.isPure ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  {!calc.isPure && (
                    <div style={{ background: t.cardBg, padding: 18, borderRadius: t.radiusSm, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
                      <div style={{ fontSize: 13, color: t.textSub, fontWeight: 700, marginBottom: 4 }}>硬體專案價</div>
                      <div style={{ fontSize: 30, fontWeight: 900, color: t.primary, lineHeight: 1 }}>{fmt(calc.hwFinal)}</div>
                      <div style={{ fontSize: 12, color: t.danger, fontWeight: 700, marginTop: 8 }}>折抵了 {fmt(activeRebate)}</div>
                    </div>
                  )}
                  <div style={{ background: t.cardBg, padding: 18, borderRadius: t.radiusSm, boxShadow: t.shadow, border: `1px solid ${t.border}` }}>
                    <div style={{ fontSize: 13, color: t.textSub, fontWeight: 700, marginBottom: 4 }}>實質月租負擔</div>
                    <div style={{ fontSize: 30, fontWeight: 900, color: calc.isPure ? t.success : t.textMain, lineHeight: 1 }}>{fmt(calc.effMonthly)}</div>
                    <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 500, marginTop: 8 }}>
                      {calc.isPure ? `原月租 ${fmt(plan.msrpMonthly)}，已扣抵優惠` : `月租維持 ${fmt(plan.msrpMonthly)}`}
                    </div>
                  </div>
                </div>

                {/* ★ 促轉節省分析 */}
                {origInputValid && calc?.savingMonthly !== null && (
                  <div style={{ background: '#f0fdf4', border: `1.5px solid ${t.success}`, borderRadius: t.radiusSm, padding: '14px 16px', marginBottom: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#065f46', marginBottom: 10 }}>🎯 促轉節省分析</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>原月租</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: '#374151' }}>{fmt(origMonthlyNum)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>新月租</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: t.success }}>{fmt(calc.effMonthly)}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>每月省</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: calc.savingMonthly >= 0 ? t.success : t.danger }}>
                          {calc.savingMonthly >= 0 ? '+' : ''}{fmt(calc.savingMonthly)}
                        </div>
                      </div>
                    </div>
                    {calc.savingTotal !== null && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: calc.savingTotal >= 0 ? '#dcfce7' : '#fef2f2', borderRadius: 8, textAlign: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: calc.savingTotal >= 0 ? '#065f46' : '#b91c1c' }}>
                          {safePeriod} 期合約總節省：{calc.savingTotal >= 0 ? '' : '-'}{fmt(Math.abs(calc.savingTotal))}
                          {calc.savingTotal >= 0 ? ' 🎉' : '（含購機費用）'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* ★ Manie 話術參考區塊 */}
                <ManieTalkPanel
                  talk={generatedTalk}
                  templates={talkTemplates}
                  templatesLoading={templatesLoading}
                  talkLoading={talkLoading}
                  onGenerate={handleGenerateTalk}
                  t={t}
                />

                {/* 離櫃總額 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1.5px solid ${t.border}`, paddingTop: 16 }}>
                  <span style={{ fontWeight: 700, color: t.textSub }}>當日離櫃需繳（含預繳）</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: t.textMain }}>{fmt(calc.totalToday)}</div>
                    {calc.advance > 0 && <div style={{ fontSize: 11, color: t.warning, fontWeight: 700 }}>含電信預繳 {fmt(calc.advance)}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, marginTop: 2 }}>
                  <span style={{ fontSize: 12, color: t.textMuted }}>{plan.contractPeriod} 期合約總支出（含購機）</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: t.textSub, fontFamily: 'monospace' }}>{fmt(calc.tco)}</span>
                </div>
              </Card>
            ) : (
              <Card t={t} style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: t.textMuted, border: `2px dashed ${t.border}` }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>等待方案試算</div>
                <p style={{ fontSize: 13, marginTop: 4 }}>請於左側選取商品型號與電信資費</p>
              </Card>
            )}

            {/* 後台毛利面板 */}
            {staffMode && calc && calc.gross !== null && (
              <div style={{ background: '#DCE4E3', borderRadius: t.radius, padding: 20, border: '1px solid #B0C4BF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: t.primary, letterSpacing: '0.05em' }}>🛡️ 門號淨利結構（機密）</div>
                  {customRebate !== null && (
                    <button onClick={() => setCustomRebate(null)}
                      style={{ fontSize: 11, background: '#B0C4BF', color: '#2A3C38', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>恢復標準折扣</button>
                  )}
                </div>
                <ProfitRow label="代理商傭金毛額"            value={fmt(calc.gross)}           color="#598C73" t={t} />
                <ProfitRow label="回饋客戶折扣"              value={`-${fmt(activeRebate)}`}   color="#C47070" t={t} />
                <ProfitRow label="硬體毛利（售－成本）"      value={fmt(calc.hwProfit)}         color="#517C76" t={t} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FFFFFF60', padding: '10px 14px', borderRadius: 8, margin: '12px 0' }}>
                  <span style={{ color: t.danger, fontWeight: 600, fontSize: 14 }}>折扣微調（+/－ 100元）</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={() => setCustomRebate(Math.max(0, activeRebate - 100))}
                      style={{ width: 30, height: 30, borderRadius: 15, background: t.primary, border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>-</button>
                    <span style={{ color: t.danger, fontFamily: 'monospace', fontSize: 16, fontWeight: 700, minWidth: 64, textAlign: 'center' }}>{fmt(activeRebate)}</span>
                    <button onClick={() => setCustomRebate(activeRebate + 100)}
                      style={{ width: 30, height: 30, borderRadius: 15, background: t.primary, border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
                  </div>
                </div>
                <ProfitRow label="本單預估毛利（佣金保留＋硬體）" value={fmt(calc.totalProfit)} color="#2A3C38" t={t} large />
                <ProfitRow label="剩餘議價空間（可再讓利上限）"   value={fmt(calc.extraRoom)}   color="#517C76" t={t} />
                <div style={{ fontSize: 11, color: t.textSub, marginTop: 8, lineHeight: 1.5 }}>
                  議價空間 = 傭金毛額 − 目前折扣 − 毛利底線（{fmt(calc.floorMargin)}）
                </div>
              </div>
            )}

            {/* 市場折扣雷達 */}
            <Card t={t}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <SectionTitle t={t}>📡 市場折扣雷達</SectionTitle>
                <div style={{ fontSize: 11, color: t.textMuted, textAlign: 'right', lineHeight: 1.5 }}>
                  {lastFetch && `掃描更新 ${lastFetch.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`}
                  <br />{marketPlans.length} 筆市場方案
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  {radarOperators.map(op => (
                    <button key={op} onClick={() => setRadarOp(op)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${radarOp === op ? t.primary : t.border}`, background: radarOp === op ? t.primaryBg : 'transparent', color: radarOp === op ? t.primary : t.textSub, cursor: 'pointer', fontWeight: radarOp === op ? 700 : 400 }}>{op}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                  {['全部', '4G', '5G'].map(net => (
                    <button key={net} onClick={() => setRadarNet(net)}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 8, border: `1px solid ${radarNet === net ? t.primary : t.border}`, background: radarNet === net ? t.primaryBg : 'transparent', color: radarNet === net ? t.primary : t.textSub, cursor: 'pointer', fontWeight: radarNet === net ? 700 : 400 }}>{net}</button>
                  ))}
                </div>
              </div>

              {plan && relevantMarket.length > 0 && (
                <div style={{ background: t.borderLight, borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: t.textSub, marginBottom: 10 }}>
                    {plan.operator} · {actionTypeLabel[actionType]} · 市場折扣分佈
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {relevantMarket.slice(0, 6).map((m, i) => {
                      const diff = publicRule && m.discount != null ? publicRule.maxRebate - m.discount : null;
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: t.cardBg, borderRadius: 8, border: `1px solid ${t.border}` }}>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: t.textMain }}>{m.planName}</span>
                            <span style={{ fontSize: 11, color: t.textMuted, marginLeft: 8 }}>{m.networkGen} · {m.period}期</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {m.discountHidden ? (
                              <span style={{ fontSize: 11, color: t.textMuted, fontStyle: 'italic' }}>優惠中</span>
                            ) : (
                              <>
                                <span style={{ fontSize: 14, fontWeight: 700, color: t.textMain, fontFamily: 'monospace' }}>{fmt(m.discount)}</span>
                                {diff !== null && (
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: diff >= 0 ? t.successBg : '#fef2f2', color: diff >= 0 ? t.success : t.danger }}>
                                    {diff >= 0 ? `↑ ${fmt(diff)}` : `↓ ${fmt(Math.abs(diff))}`}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {marketAsCompetitors.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: t.textMuted, fontSize: 13 }}>
                  尚無市場掃描資料<br />
                  <span style={{ fontSize: 11 }}>請在 Apps Script 執行 testScrapeAll() 初始化資料</span>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 4px' }}>
                    <thead>
                      <tr>
                        {['電信商', '方案', '世代', '期數', '折扣', '預繳', '更新'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '4px 8px', fontSize: 11, fontWeight: 600, color: t.textMuted }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {marketAsCompetitors.map((m, i) => (
                        <tr key={i}>
                          {[
                            { v: m.operator,    bold: true  },
                            { v: m.planName,    bold: false },
                            { v: m.networkGen,  bold: false },
                            { v: m.period ? `${m.period}期` : '—', bold: false },
                            { v: m.discountHidden ? '優惠中' : fmt(m.discount), bold: true, muted: m.discountHidden },
                            { v: fmt(m.advance), bold: false },
                            { v: m.updatedAt,   bold: false, small: true },
                          ].map(({ v, bold, muted, small }, j) => (
                            <td key={j} style={{ padding: '7px 8px', fontSize: small ? 10 : 12, fontWeight: bold ? 600 : 400, color: muted ? t.textMuted : t.textMain, borderTop: `1px solid ${t.borderLight}`, borderBottom: `1px solid ${t.borderLight}`, fontStyle: muted ? 'italic' : 'normal' }}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}

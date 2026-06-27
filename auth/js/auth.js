/* ============================================================
   AUTH.JS — interactions for login.html & register.html
   - password show/hide
   - password strength meter
   - multi-step navigation (register)
   - basic client-side validation
   ============================================================ */
(function(){
  'use strict';

  /* ---------- 1. Password show/hide ---------- */
  document.addEventListener('click', function(e){
    const btn = e.target.closest('.auth-toggle-pwd');
    if (!btn) return;
    const id = btn.dataset.target;
    const inp = document.getElementById(id);
    if (!inp) return;
    if (inp.type === 'password'){
      inp.type = 'text';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
      inp.type = 'password';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
  });

  /* ---------- 2. Password strength meter ---------- */
  function evaluatePwd(pwd){
    if (!pwd) return { level: 0, label: '—', cls: '' };
    let score = 0;
    if (pwd.length >= 8)  score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/\d/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
    score = Math.min(score, 4);
    const labels = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
    return { level: score, label: labels[score] || '—' };
  }
  const pwdInput = document.getElementById('regPwd');
  const meter    = document.getElementById('pwdMeter');
  const meterTxt = document.getElementById('pwdMeterText');
  if (pwdInput && meter && meterTxt){
    const bars = meter.querySelectorAll('.auth-pwd-meter__bar');
    pwdInput.addEventListener('input', function(){
      const r = evaluatePwd(pwdInput.value);
      bars.forEach((b, i) => {
        b.className = 'auth-pwd-meter__bar';
        if (i < r.level) b.classList.add('is-on-' + Math.min(r.level, 4));
      });
      meterTxt.innerHTML = 'قوة كلمة المرور: <strong>' + r.label + '</strong>';
    });
  }

  /* ---------- 3. Multi-step navigation (register) ---------- */
  const stepper = document.getElementById('authStepper');
  if (stepper){
    const steps = stepper.querySelectorAll('.auth-step');
    const panes = document.querySelectorAll('.auth-step-pane');

    function goTo(n){
      n = parseInt(n, 10);
      if (isNaN(n) || n < 1 || n > steps.length) return;
      steps.forEach((s, i) => {
        const idx = i + 1;
        s.classList.toggle('is-active', idx === n);
        s.classList.toggle('is-done', idx < n);
      });
      panes.forEach(p => {
        const idx = parseInt(p.dataset.pane, 10);
        p.classList.toggle('is-active', idx === n);
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function validateStep(n){
      const pane = document.querySelector('.auth-step-pane[data-pane="' + n + '"]');
      if (!pane) return true;
      const fields = pane.querySelectorAll('input[required], select[required]');
      let ok = true;
      fields.forEach(f => {
        const wrap = f.closest('.auth-input-wrap, .auth-select-wrap');
        if (!f.value || (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value))){
          if (wrap){
            wrap.style.borderColor = '#ef4444';
            wrap.style.boxShadow = '0 0 0 3px rgba(239,68,68,.12)';
          }
          ok = false;
        } else if (wrap){
          wrap.style.borderColor = '';
          wrap.style.boxShadow = '';
        }
      });
      // password length
      const pwd = pane.querySelector('input[type="password"]');
      if (pwd && pwd.value.length > 0 && pwd.value.length < 8){
        const wrap = pwd.closest('.auth-input-wrap');
        if (wrap){
          wrap.style.borderColor = '#ef4444';
          wrap.style.boxShadow = '0 0 0 3px rgba(239,68,68,.12)';
        }
        ok = false;
      }
      return ok;
    }

    document.querySelectorAll('[data-next]').forEach(b => {
      b.addEventListener('click', function(){
        // Validate current pane based on which one is active
        const active = document.querySelector('.auth-step-pane.is-active');
        const cur = active ? parseInt(active.dataset.pane, 10) : 1;
        if (!validateStep(cur)){
          // shake feedback
          if (active){
            active.style.animation = 'none';
            void active.offsetWidth;
            active.style.animation = 'authShake .35s';
          }
          return;
        }
        goTo(parseInt(b.dataset.next, 10));
      });
    });
    document.querySelectorAll('[data-prev]').forEach(b => {
      b.addEventListener('click', function(){
        goTo(parseInt(b.dataset.prev, 10));
      });
    });

    // shake keyframe injection
    const styleEl = document.createElement('style');
    styleEl.textContent = '@keyframes authShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}';
    document.head.appendChild(styleEl);
  }

  const COUNTRY_BY_CODE = {};
  const COUNTRY_BY_NAME = {};
  const COUNTRIES_READY = typeof COUNTRIES !== 'undefined' && Array.isArray(COUNTRIES) && COUNTRIES.length > 0;
  if (COUNTRIES_READY) {
    COUNTRIES.forEach(function(c){
      if (c.c) COUNTRY_BY_CODE[c.c] = c;
      if (c.n) COUNTRY_BY_NAME[c.n] = c;
      if (c.en) COUNTRY_BY_NAME[c.en] = c;
    });
  }
  function resolveCountryCode(value){
    ensureCountryMaps();
    if (!value) return '';
    if (COUNTRY_BY_CODE[value]) return value;
    const named = COUNTRY_BY_NAME[value] || COUNTRIES.find(function(c){ return c.d === value || c.en === value; });
    return named ? (named.c || '') : '';
  }
  function ensureCountryMaps(){
    if (COUNTRIES_READY && Object.keys(COUNTRY_BY_CODE).length === 0) {
      COUNTRIES.forEach(function(c){
        if (c.c) COUNTRY_BY_CODE[c.c] = c;
        if (c.n) COUNTRY_BY_NAME[c.n] = c;
        if (c.en) COUNTRY_BY_NAME[c.en] = c;
      });
    }
  }

  /* ---------- 4. Form submit (live API) ---------- */
  function apiBasePath(){
    // /auth/login.html => /api/
    return (window.location.pathname.replace(/\/auth\/.*$/, '') || '') + '/api';
  }
  function apiUrl(endpoint){
    return apiBasePath() + endpoint;
  }
  function showFieldError(form, msg){
    let el = form.querySelector('.auth-api-error');
    if (!el){
      el = document.createElement('div');
      el.className = 'auth-api-error';
      el.style.cssText = 'color:#ef4444;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);padding:10px 14px;border-radius:10px;margin:12px 0;font-size:14px;line-height:1.5;';
      const actions = form.querySelector('.auth-step-actions');
      if (actions) actions.before(el); else form.appendChild(el);
    }
    el.textContent = msg;
    el.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }
  function clearFieldError(form){
    const el = form.querySelector('.auth-api-error');
    if (el) el.remove();
  }

  function handleSubmit(form, label){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      clearFieldError(form);

      // Final validation
      const panes = form.querySelectorAll('.auth-step-pane');
      let ok = true;
      const invalidFields = [];
      if (panes.length){
        const active = form.querySelector('.auth-step-pane.is-active');
        const required = active ? active.querySelectorAll('input[required], select[required]') : [];
        required.forEach(f => {
          if (f.type === 'checkbox' && !f.checked) { ok = false; invalidFields.push(f); }
          else if (f.type !== 'checkbox' && !f.value) { ok = false; invalidFields.push(f); }
        });
      } else {
        const required = form.querySelectorAll('input[required], select[required]');
        required.forEach(f => {
          if (!f.value) { ok = false; invalidFields.push(f); }
        });
      }
      invalidFields.forEach(f => {
        const wrap = f.closest('.auth-input-wrap, .auth-select-wrap');
        if (wrap){
          wrap.style.borderColor = '#ef4444';
          wrap.style.boxShadow = '0 0 0 3px rgba(239,68,68,.12)';
        }
      });
      if (!ok){
        form.style.animation = 'none';
        void form.offsetWidth;
        form.style.animation = 'authShake .35s';
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      const original = btn ? btn.innerHTML : '';
      if (btn){
        btn.disabled = true;
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" style="animation:authSpin 1s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>جاري المعالجة…</span>';
      }

      const fd = new FormData(form);
      const payload = {};
      fd.forEach((v, k) => {
        if (k === 'agreeTerms' || k === 'agreeAge' || k === 'agreeKYC' || k === 'remember' || k === 'agreeMarketing') return; // booleans handled below
        if (payload[k] !== undefined) return;
        payload[k] = v;
      });

      // Map to backend field names and add KYC consent
      if (label === 'register'){
        payload.first_name = (payload.firstName || '').trim();
        payload.last_name = (payload.lastName || '').trim();
        payload.email = (payload.email || '').trim().toLowerCase();
        payload.password = (payload.password || '');
        payload.password_confirm = payload.password;
        // phone
        payload.phone_dial_code = (payload.countryCode || '+971');
        payload.phone_number = (payload.phone || '').replace(/\D+/g, '').replace(/^0+/, '');
        // country of residence
        const countryCodeResolved = resolveCountryCode(payload.country || '');
        payload.country_code = countryCodeResolved || resolveCountryCode(payload.countryCode || '');
        // birth date: input type=date, name=dob, format already yyyy-mm-dd
        payload.birth_date = (payload.dob || '');
        payload.lang = document.documentElement.lang || 'ar';
        payload.currency = (payload.currency || 'USD').toUpperCase();
        // marketing
        payload.marketing_consent = !!(form.querySelector('[name="agreeMarketing"]') || {}).checked ? 1 : 0;
        // KYC consent flags for backend
        payload.agreed_terms = !!(form.querySelector('[name="agreeTerms"]') || {}).checked ? 1 : 0;
        payload.agreed_age = !!(form.querySelector('[name="agreeAge"]') || {}).checked ? 1 : 0;
        payload.agreed_kyc = !!(form.querySelector('[name="agreeKYC"]') || {}).checked ? 1 : 0;
      } else {
        payload.email = (payload.email || '').trim().toLowerCase();
        payload.remember = !!(form.querySelector('[name="remember"]') || {}).checked ? 1 : 0;
      }

      fetch(apiUrl(label === 'register' ? '/auth/register.php' : '/auth/login.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(r => r.json().then(data => ({ ok: r.ok && (data.ok === true), status: r.status, data })))
      .then(({ ok, status, data }) => {
        if (!ok){
          if (btn){
            btn.disabled = false;
            btn.innerHTML = original;
          }
          showFieldError(form, data.error || data.message || ('خطأ ' + status + ' أثناء ' + (label === 'register' ? 'التسجيل' : 'تسجيل الدخول')));
          return;
        }
        // Persist token and user basics
        try {
          if (data.token) localStorage.setItem('mex_token', data.token);
          if (data.user) localStorage.setItem('mex_user', JSON.stringify(data.user));
          if (data.mode) localStorage.setItem('mex_mode', data.mode);
        } catch(_){}

        if (btn){
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg><span>تمّ بنجاح! جاري التحويل…</span>';
          btn.style.background = 'linear-gradient(135deg,#22c55e,#84cc16)';
        }
        setTimeout(function(){
          if (label === 'register') {
            const firstNameField = form.querySelector('[name="firstName"]');
            const firstName = (firstNameField && firstNameField.value || '').trim();
            if (typeof window.__showWelcomeModal === 'function') {
              window.__showWelcomeModal(firstName);
              // CTA will redirect
              return;
            }
          }
          try { localStorage.removeItem('mex_register_draft_v1'); } catch(_){}
          // Send user to platform app
          window.location.href = (window.location.pathname.replace(/\/auth\/.*$/, '') || '') + '/app.php';
        }, 900);
      })
      .catch(err => {
        if (btn){
          btn.disabled = false;
          btn.innerHTML = original;
        }
        showFieldError(form, 'تعذّر الاتصال بالخادم. يرجى المحاولة لاحقاً.');
        // eslint-disable-next-line no-console
        if (window.console && console.error) console.error('auth submit error', err);
      });
    });
    // Spin keyframe (one-shot)
    if (!document.getElementById('authSpinKf')){
      const s = document.createElement('style');
      s.id = 'authSpinKf';
      s.textContent = '@keyframes authSpin{to{transform:rotate(360deg)}}';
      document.head.appendChild(s);
    }
  }
  const lf = document.getElementById('loginForm');     if (lf) handleSubmit(lf, 'login');
  const rf = document.getElementById('registerForm');  if (rf) handleSubmit(rf, 'register');

  /* ---------- 5. Reset error styles on focus ---------- */
  document.addEventListener('focusin', function(e){
    const wrap = e.target.closest('.auth-input-wrap, .auth-select-wrap');
    if (wrap){
      wrap.style.borderColor = '';
      wrap.style.boxShadow = '';
    }
  });

  /* ---------- 6. Country code picker ---------- */
  const COUNTRIES = [
    { f:'🇦🇪', n:'الإمارات', en:'United Arab Emirates UAE', d:'+971' },
    { f:'🇸🇦', n:'السعودية', en:'Saudi Arabia KSA', d:'+966' },
    { f:'🇰🇼', n:'الكويت', en:'Kuwait', d:'+965' },
    { f:'🇶🇦', n:'قطر', en:'Qatar', d:'+974' },
    { f:'🇧🇭', n:'البحرين', en:'Bahrain', d:'+973' },
    { f:'🇴🇲', n:'عُمان', en:'Oman', d:'+968' },
    { f:'🇯🇴', n:'الأردن', en:'Jordan', d:'+962' },
    { f:'🇱🇧', n:'لبنان', en:'Lebanon', d:'+961' },
    { f:'🇪🇬', n:'مصر', en:'Egypt', d:'+20' },
    { f:'🇲🇦', n:'المغرب', en:'Morocco', d:'+212' },
    { f:'🇹🇳', n:'تونس', en:'Tunisia', d:'+216' },
    { f:'🇩🇿', n:'الجزائر', en:'Algeria', d:'+213' },
    { f:'🇱🇾', n:'ليبيا', en:'Libya', d:'+218' },
    { f:'🇸🇩', n:'السودان', en:'Sudan', d:'+249' },
    { f:'🇾🇪', n:'اليمن', en:'Yemen', d:'+967' },
    { f:'🇮🇶', n:'العراق', en:'Iraq', d:'+964' },
    { f:'🇸🇾', n:'سوريا', en:'Syria', d:'+963' },
    { f:'🇵🇸', n:'فلسطين', en:'Palestine', d:'+970' },
    { f:'🇲🇷', n:'موريتانيا', en:'Mauritania', d:'+222' },
    { f:'🇩🇯', n:'جيبوتي', en:'Djibouti', d:'+253' },
    { f:'🇸🇴', n:'الصومال', en:'Somalia', d:'+252' },
    { f:'🇰🇲', n:'جزر القمر', en:'Comoros', d:'+269' },
    { f:'🇺🇸', n:'الولايات المتحدة', en:'United States USA', d:'+1' },
    { f:'🇨🇦', n:'كندا', en:'Canada', d:'+1' },
    { f:'🇬🇧', n:'المملكة المتحدة', en:'United Kingdom UK Britain', d:'+44' },
    { f:'🇫🇷', n:'فرنسا', en:'France', d:'+33' },
    { f:'🇩🇪', n:'ألمانيا', en:'Germany', d:'+49' },
    { f:'🇮🇹', n:'إيطاليا', en:'Italy', d:'+39' },
    { f:'🇪🇸', n:'إسبانيا', en:'Spain', d:'+34' },
    { f:'🇵🇹', n:'البرتغال', en:'Portugal', d:'+351' },
    { f:'🇳🇱', n:'هولندا', en:'Netherlands', d:'+31' },
    { f:'🇧🇪', n:'بلجيكا', en:'Belgium', d:'+32' },
    { f:'🇨🇭', n:'سويسرا', en:'Switzerland', d:'+41' },
    { f:'🇦🇹', n:'النمسا', en:'Austria', d:'+43' },
    { f:'🇸🇪', n:'السويد', en:'Sweden', d:'+46' },
    { f:'🇳🇴', n:'النرويج', en:'Norway', d:'+47' },
    { f:'🇩🇰', n:'الدنمارك', en:'Denmark', d:'+45' },
    { f:'🇫🇮', n:'فنلندا', en:'Finland', d:'+358' },
    { f:'🇮🇸', n:'آيسلندا', en:'Iceland', d:'+354' },
    { f:'🇮🇪', n:'أيرلندا', en:'Ireland', d:'+353' },
    { f:'🇵🇱', n:'بولندا', en:'Poland', d:'+48' },
    { f:'🇨🇿', n:'التشيك', en:'Czech Republic', d:'+420' },
    { f:'🇸🇰', n:'سلوفاكيا', en:'Slovakia', d:'+421' },
    { f:'🇭🇺', n:'المجر', en:'Hungary', d:'+36' },
    { f:'🇷🇴', n:'رومانيا', en:'Romania', d:'+40' },
    { f:'🇧🇬', n:'بلغاريا', en:'Bulgaria', d:'+359' },
    { f:'🇬🇷', n:'اليونان', en:'Greece', d:'+30' },
    { f:'🇨🇾', n:'قبرص', en:'Cyprus', d:'+357' },
    { f:'🇲🇹', n:'مالطا', en:'Malta', d:'+356' },
    { f:'🇸🇮', n:'سلوفينيا', en:'Slovenia', d:'+386' },
    { f:'🇭🇷', n:'كرواتيا', en:'Croatia', d:'+385' },
    { f:'🇷🇸', n:'صربيا', en:'Serbia', d:'+381' },
    { f:'🇧🇦', n:'البوسنة والهرسك', en:'Bosnia', d:'+387' },
    { f:'🇲🇰', n:'مقدونيا الشمالية', en:'North Macedonia', d:'+389' },
    { f:'🇦🇱', n:'ألبانيا', en:'Albania', d:'+355' },
    { f:'🇲🇪', n:'الجبل الأسود', en:'Montenegro', d:'+382' },
    { f:'🇽🇰', n:'كوسوفو', en:'Kosovo', d:'+383' },
    { f:'🇪🇪', n:'إستونيا', en:'Estonia', d:'+372' },
    { f:'🇱🇻', n:'لاتفيا', en:'Latvia', d:'+371' },
    { f:'🇱🇹', n:'ليتوانيا', en:'Lithuania', d:'+370' },
    { f:'🇧🇾', n:'بيلاروسيا', en:'Belarus', d:'+375' },
    { f:'🇺🇦', n:'أوكرانيا', en:'Ukraine', d:'+380' },
    { f:'🇲🇩', n:'مولدوفا', en:'Moldova', d:'+373' },
    { f:'🇷🇺', n:'روسيا', en:'Russia', d:'+7' },
    { f:'🇰🇿', n:'كازاخستان', en:'Kazakhstan', d:'+7' },
    { f:'🇹🇷', n:'تركيا', en:'Turkey', d:'+90' },
    { f:'🇮🇷', n:'إيران', en:'Iran', d:'+98' },
    { f:'🇦🇫', n:'أفغانستان', en:'Afghanistan', d:'+93' },
    { f:'🇵🇰', n:'باكستان', en:'Pakistan', d:'+92' },
    { f:'🇮🇳', n:'الهند', en:'India', d:'+91' },
    { f:'🇧🇩', n:'بنغلاديش', en:'Bangladesh', d:'+880' },
    { f:'🇱🇰', n:'سريلانكا', en:'Sri Lanka', d:'+94' },
    { f:'🇲🇻', n:'المالديف', en:'Maldives', d:'+960' },
    { f:'🇳🇵', n:'نيبال', en:'Nepal', d:'+977' },
    { f:'🇧🇹', n:'بوتان', en:'Bhutan', d:'+975' },
    { f:'🇲🇲', n:'ميانمار', en:'Myanmar', d:'+95' },
    { f:'🇹🇭', n:'تايلاند', en:'Thailand', d:'+66' },
    { f:'🇻🇳', n:'فيتنام', en:'Vietnam', d:'+84' },
    { f:'🇰🇭', n:'كمبوديا', en:'Cambodia', d:'+855' },
    { f:'🇱🇦', n:'لاوس', en:'Laos', d:'+856' },
    { f:'🇲🇾', n:'ماليزيا', en:'Malaysia', d:'+60' },
    { f:'🇸🇬', n:'سنغافورة', en:'Singapore', d:'+65' },
    { f:'🇮🇩', n:'إندونيسيا', en:'Indonesia', d:'+62' },
    { f:'🇵🇭', n:'الفلبين', en:'Philippines', d:'+63' },
    { f:'🇧🇳', n:'بروناي', en:'Brunei', d:'+673' },
    { f:'🇹🇱', n:'تيمور الشرقية', en:'Timor-Leste', d:'+670' },
    { f:'🇨🇳', n:'الصين', en:'China', d:'+86' },
    { f:'🇭🇰', n:'هونغ كونغ', en:'Hong Kong', d:'+852' },
    { f:'🇲🇴', n:'ماكاو', en:'Macau', d:'+853' },
    { f:'🇹🇼', n:'تايوان', en:'Taiwan', d:'+886' },
    { f:'🇯🇵', n:'اليابان', en:'Japan', d:'+81' },
    { f:'🇰🇷', n:'كوريا الجنوبية', en:'South Korea', d:'+82' },
    { f:'🇰🇵', n:'كوريا الشمالية', en:'North Korea', d:'+850' },
    { f:'🇲🇳', n:'منغوليا', en:'Mongolia', d:'+976' },
    { f:'🇺🇿', n:'أوزبكستان', en:'Uzbekistan', d:'+998' },
    { f:'🇰🇬', n:'قيرغيزستان', en:'Kyrgyzstan', d:'+996' },
    { f:'🇹🇯', n:'طاجيكستان', en:'Tajikistan', d:'+992' },
    { f:'🇹🇲', n:'تركمانستان', en:'Turkmenistan', d:'+993' },
    { f:'🇦🇿', n:'أذربيجان', en:'Azerbaijan', d:'+994' },
    { f:'🇦🇲', n:'أرمينيا', en:'Armenia', d:'+374' },
    { f:'🇬🇪', n:'جورجيا', en:'Georgia', d:'+995' },
    { f:'🇮🇱', n:'إسرائيل', en:'Israel', d:'+972' },
    { f:'🇿🇦', n:'جنوب أفريقيا', en:'South Africa', d:'+27' },
    { f:'🇳🇬', n:'نيجيريا', en:'Nigeria', d:'+234' },
    { f:'🇰🇪', n:'كينيا', en:'Kenya', d:'+254' },
    { f:'🇪🇹', n:'إثيوبيا', en:'Ethiopia', d:'+251' },
    { f:'🇬🇭', n:'غانا', en:'Ghana', d:'+233' },
    { f:'🇨🇮', n:'ساحل العاج', en:'Cote dIvoire', d:'+225' },
    { f:'🇸🇳', n:'السنغال', en:'Senegal', d:'+221' },
    { f:'🇨🇲', n:'الكاميرون', en:'Cameroon', d:'+237' },
    { f:'🇹🇿', n:'تنزانيا', en:'Tanzania', d:'+255' },
    { f:'🇺🇬', n:'أوغندا', en:'Uganda', d:'+256' },
    { f:'🇷🇼', n:'رواندا', en:'Rwanda', d:'+250' },
    { f:'🇧🇮', n:'بوروندي', en:'Burundi', d:'+257' },
    { f:'🇿🇼', n:'زيمبابوي', en:'Zimbabwe', d:'+263' },
    { f:'🇿🇲', n:'زامبيا', en:'Zambia', d:'+260' },
    { f:'🇲🇿', n:'موزمبيق', en:'Mozambique', d:'+258' },
    { f:'🇲🇼', n:'مالاوي', en:'Malawi', d:'+265' },
    { f:'🇦🇴', n:'أنغولا', en:'Angola', d:'+244' },
    { f:'🇳🇦', n:'ناميبيا', en:'Namibia', d:'+264' },
    { f:'🇧🇼', n:'بوتسوانا', en:'Botswana', d:'+267' },
    { f:'🇲🇬', n:'مدغشقر', en:'Madagascar', d:'+261' },
    { f:'🇲🇺', n:'موريشيوس', en:'Mauritius', d:'+230' },
    { f:'🇸🇨', n:'سيشل', en:'Seychelles', d:'+248' },
    { f:'🇲🇱', n:'مالي', en:'Mali', d:'+223' },
    { f:'🇧🇫', n:'بوركينا فاسو', en:'Burkina Faso', d:'+226' },
    { f:'🇳🇪', n:'النيجر', en:'Niger', d:'+227' },
    { f:'🇹🇩', n:'تشاد', en:'Chad', d:'+235' },
    { f:'🇨🇫', n:'أفريقيا الوسطى', en:'Central African Republic', d:'+236' },
    { f:'🇨🇬', n:'الكونغو', en:'Congo', d:'+242' },
    { f:'🇨🇩', n:'الكونغو الديمقراطية', en:'DR Congo', d:'+243' },
    { f:'🇬🇦', n:'الغابون', en:'Gabon', d:'+241' },
    { f:'🇬🇶', n:'غينيا الاستوائية', en:'Equatorial Guinea', d:'+240' },
    { f:'🇧🇯', n:'بنين', en:'Benin', d:'+229' },
    { f:'🇹🇬', n:'توغو', en:'Togo', d:'+228' },
    { f:'🇬🇲', n:'غامبيا', en:'Gambia', d:'+220' },
    { f:'🇬🇼', n:'غينيا بيساو', en:'Guinea-Bissau', d:'+245' },
    { f:'🇬🇳', n:'غينيا', en:'Guinea', d:'+224' },
    { f:'🇸🇱', n:'سيراليون', en:'Sierra Leone', d:'+232' },
    { f:'🇱🇷', n:'ليبيريا', en:'Liberia', d:'+231' },
    { f:'🇨🇻', n:'الرأس الأخضر', en:'Cape Verde', d:'+238' },
    { f:'🇸🇹', n:'ساو تومي وبرينسيب', en:'Sao Tome', d:'+239' },
    { f:'🇪🇷', n:'إريتريا', en:'Eritrea', d:'+291' },
    { f:'🇸🇸', n:'جنوب السودان', en:'South Sudan', d:'+211' },
    { f:'🇱🇸', n:'ليسوتو', en:'Lesotho', d:'+266' },
    { f:'🇸🇿', n:'إسواتيني', en:'Eswatini', d:'+268' },
    { f:'🇧🇷', n:'البرازيل', en:'Brazil', d:'+55' },
    { f:'🇦🇷', n:'الأرجنتين', en:'Argentina', d:'+54' },
    { f:'🇨🇱', n:'تشيلي', en:'Chile', d:'+56' },
    { f:'🇨🇴', n:'كولومبيا', en:'Colombia', d:'+57' },
    { f:'🇵🇪', n:'بيرو', en:'Peru', d:'+51' },
    { f:'🇻🇪', n:'فنزويلا', en:'Venezuela', d:'+58' },
    { f:'🇪🇨', n:'الإكوادور', en:'Ecuador', d:'+593' },
    { f:'🇧🇴', n:'بوليفيا', en:'Bolivia', d:'+591' },
    { f:'🇵🇾', n:'الباراغواي', en:'Paraguay', d:'+595' },
    { f:'🇺🇾', n:'الأوروغواي', en:'Uruguay', d:'+598' },
    { f:'🇬🇾', n:'غيانا', en:'Guyana', d:'+592' },
    { f:'🇸🇷', n:'سورينام', en:'Suriname', d:'+597' },
    { f:'🇲🇽', n:'المكسيك', en:'Mexico', d:'+52' },
    { f:'🇬🇹', n:'غواتيمالا', en:'Guatemala', d:'+502' },
    { f:'🇭🇳', n:'هندوراس', en:'Honduras', d:'+504' },
    { f:'🇸🇻', n:'السلفادور', en:'El Salvador', d:'+503' },
    { f:'🇳🇮', n:'نيكاراغوا', en:'Nicaragua', d:'+505' },
    { f:'🇨🇷', n:'كوستاريكا', en:'Costa Rica', d:'+506' },
    { f:'🇵🇦', n:'بنما', en:'Panama', d:'+507' },
    { f:'🇧🇿', n:'بليز', en:'Belize', d:'+501' },
    { f:'🇨🇺', n:'كوبا', en:'Cuba', d:'+53' },
    { f:'🇩🇴', n:'الدومينيكان', en:'Dominican Republic', d:'+1' },
    { f:'🇭🇹', n:'هايتي', en:'Haiti', d:'+509' },
    { f:'🇯🇲', n:'جامايكا', en:'Jamaica', d:'+1' },
    { f:'🇧🇸', n:'الباهاما', en:'Bahamas', d:'+1' },
    { f:'🇧🇧', n:'بربادوس', en:'Barbados', d:'+1' },
    { f:'🇹🇹', n:'ترينيداد وتوباغو', en:'Trinidad', d:'+1' },
    { f:'🇵🇷', n:'بورتوريكو', en:'Puerto Rico', d:'+1' },
    { f:'🇦🇺', n:'أستراليا', en:'Australia', d:'+61' },
    { f:'🇳🇿', n:'نيوزيلندا', en:'New Zealand', d:'+64' },
    { f:'🇫🇯', n:'فيجي', en:'Fiji', d:'+679' },
    { f:'🇵🇬', n:'بابوا غينيا الجديدة', en:'Papua New Guinea', d:'+675' },
    { f:'🇸🇧', n:'جزر سليمان', en:'Solomon Islands', d:'+677' },
    { f:'🇻🇺', n:'فانواتو', en:'Vanuatu', d:'+678' },
    { f:'🇼🇸', n:'ساموا', en:'Samoa', d:'+685' },
    { f:'🇹🇴', n:'تونغا', en:'Tonga', d:'+676' },
    { f:'🇰🇮', n:'كيريباتي', en:'Kiribati', d:'+686' },
    { f:'🇲🇭', n:'جزر مارشال', en:'Marshall Islands', d:'+692' },
    { f:'🇫🇲', n:'ميكرونيزيا', en:'Micronesia', d:'+691' },
    { f:'🇵🇼', n:'بالاو', en:'Palau', d:'+680' },
    { f:'🇳🇷', n:'ناورو', en:'Nauru', d:'+674' },
    { f:'🇹🇻', n:'توفالو', en:'Tuvalu', d:'+688' }
  ];

  /* ---------- Live account counts (per-country) ---------- */
  // Arab countries baseline — Iraq highest, then GCC + major Arab countries
  const ARAB_DIAL_BASELINES = {
    '+964': 312500, // العراق
    '+966': 198400, // السعودية
    '+971': 187200, // الإمارات
    '+20':   98700, // مصر
    '+212':  78400, // المغرب
    '+965':  76200, // الكويت
    '+213':  71300, // الجزائر
    '+962':  67400, // الأردن
    '+974':  54300, // قطر
    '+961':  51800, // لبنان
    '+968':  47500, // عمان
    '+216':  43900, // تونس
    '+963':  39600, // سوريا
    '+973':  36800, // البحرين
    '+218':  33500, // ليبيا
    '+970':  31200, // فلسطين
    '+967':  28900, // اليمن
    '+249':  26800, // السودان
    '+222':   8500, // موريتانيا
    '+252':   6300, // الصومال
    '+253':   3700, // جيبوتي
    '+269':   2200  // جزر القمر
  };
  function _hashStr(s){
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function _baselineFor(c){
    if (ARAB_DIAL_BASELINES[c.d] != null) return ARAB_DIAL_BASELINES[c.d];
    return 1500 + (_hashStr(c.en) % 23500);
  }
  const LIVE_COUNTS = COUNTRIES.map(_baselineFor);
  function _formatNum(n){ return n.toLocaleString('en-US'); }

  // Panels that show live counts (registered by pickers)
  const _liveListeners = [];
  function _registerLiveList(listEl, panel){
    _liveListeners.push({ list: listEl, panel: panel });
  }

  // Tick: bump random countries every 1.6s
  setInterval(function(){
    const bumps = [];
    for (let i = 0; i < 14; i++){
      const idx = Math.floor(Math.random() * COUNTRIES.length);
      const v = LIVE_COUNTS[idx];
      const maxInc = Math.max(2, Math.min(15, Math.floor(v / 6000)));
      const inc = 1 + Math.floor(Math.random() * maxInc);
      LIVE_COUNTS[idx] += inc;
      bumps.push(idx);
    }
    _liveListeners.forEach(function(rec){
      if (rec.panel.hidden) return;
      bumps.forEach(function(idx){
        const cell = rec.list.querySelector('[data-cc-live-idx="' + idx + '"]');
        if (cell){
          cell.textContent = _formatNum(LIVE_COUNTS[idx]);
          cell.classList.remove('is-bumped');
          void cell.offsetWidth;
          cell.classList.add('is-bumped');
        }
      });
    });
  }, 1600);

  function initCountryPicker(prefix){
    const root    = document.getElementById(prefix + '-picker');
    if (!root) return;
    const trigger = document.getElementById(prefix + '-trigger');
    const panel   = document.getElementById(prefix + '-panel');
    const list    = document.getElementById(prefix + '-list');
    const search  = document.getElementById(prefix + '-search');
    const empty   = document.getElementById(prefix + '-empty');
    const flagEl  = document.getElementById(prefix + '-flag');
    const codeEl  = document.getElementById(prefix + '-code');
    const valInp  = document.getElementById(prefix);

    function renderList(filter){
      const q = (filter || '').trim().toLowerCase();
      const frag = document.createDocumentFragment();
      let count = 0;
      COUNTRIES.forEach(function(c){
        if (q){
          const hay = (c.n + ' ' + c.en + ' ' + c.d).toLowerCase();
          if (hay.indexOf(q) === -1) return;
        }
        const li = document.createElement('li');
        li.className = 'auth-cc-opt';
        li.setAttribute('role','option');
        li.dataset.code = c.d;
        li.dataset.flag = c.f;
        li.innerHTML =
          '<span class="auth-cc-opt__flag">' + c.f + '</span>' +
          '<span class="auth-cc-opt__name">' + c.n + '</span>' +
          '<span class="auth-cc-opt__dial">' + c.d + '</span>';
        if (c.d === valInp.value && c.f === flagEl.textContent) {
          li.classList.add('is-selected');
        }
        frag.appendChild(li);
        count++;
      });
      list.innerHTML = '';
      list.appendChild(frag);
      empty.hidden = count > 0;
    }

    function openPanel(){
      panel.hidden = false;
      trigger.setAttribute('aria-expanded','true');
      root.classList.add('is-open');
      renderList('');
      // focus search after a tick to avoid mobile scroll jump
      setTimeout(function(){ search.focus(); }, 50);
    }
    function closePanel(){
      panel.hidden = true;
      trigger.setAttribute('aria-expanded','false');
      root.classList.remove('is-open');
      search.value = '';
    }
    function togglePanel(){
      if (panel.hidden) openPanel(); else closePanel();
    }

    trigger.addEventListener('click', function(e){ e.stopPropagation(); togglePanel(); });
    search.addEventListener('input', function(){ renderList(search.value); });
    search.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePanel(); });

    list.addEventListener('click', function(e){
      const li = e.target.closest('.auth-cc-opt');
      if (!li) return;
      flagEl.textContent = li.dataset.flag;
      codeEl.textContent = li.dataset.code;
      valInp.value = li.dataset.code;
      closePanel();
    });

    // Close on outside click
    document.addEventListener('click', function(e){
      if (!root.contains(e.target) && !panel.hidden) closePanel();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !panel.hidden) closePanel();
    });

    // initial render
    renderList('');
  }
  initCountryPicker('regCC');

  /* ---------- 6b. Country select picker (residence country) ---------- */
  function initCountrySelect(prefix){
    const root    = document.getElementById(prefix + '-picker');
    if (!root) return;
    const trigger = document.getElementById(prefix + '-trigger');
    const panel   = document.getElementById(prefix + '-panel');
    const list    = document.getElementById(prefix + '-list');
    const search  = document.getElementById(prefix + '-search');
    const empty   = document.getElementById(prefix + '-empty');
    const flagEl  = document.getElementById(prefix + '-flag');
    const nameEl  = document.getElementById(prefix + '-name');
    const valInp  = document.getElementById(prefix);

    function renderList(filter){
      const q = (filter || '').trim().toLowerCase();
      const frag = document.createDocumentFragment();
      let count = 0;
      COUNTRIES.forEach(function(c, idx){
        if (q){
          const hay = (c.n + ' ' + c.en).toLowerCase();
          if (hay.indexOf(q) === -1) return;
        }
        const li = document.createElement('li');
        li.className = 'auth-cc-opt auth-cc-opt--with-live';
        li.setAttribute('role','option');
        li.dataset.value = c.n;
        li.dataset.flag  = c.f;
        li.dataset.name  = c.n;
        li.innerHTML =
          '<span class="auth-cc-opt__flag">' + c.f + '</span>' +
          '<span class="auth-cc-opt__name">' + c.n + '</span>' +
          '<span class="auth-cc-opt__live">' +
            '<span class="auth-cc-opt__live-dot"></span>' +
            '<span class="auth-cc-opt__count" data-cc-live-idx="' + idx + '">' + _formatNum(LIVE_COUNTS[idx]) + '</span>' +
          '</span>';
        if (c.n === valInp.value) li.classList.add('is-selected');
        frag.appendChild(li);
        count++;
      });
      list.innerHTML = '';
      list.appendChild(frag);
      empty.hidden = count > 0;
    }

    function openPanel(){
      panel.hidden = false;
      trigger.setAttribute('aria-expanded','true');
      root.classList.add('is-open');
      renderList('');
      setTimeout(function(){ search.focus(); }, 50);
    }
    function closePanel(){
      panel.hidden = true;
      trigger.setAttribute('aria-expanded','false');
      root.classList.remove('is-open');
      search.value = '';
    }
    function togglePanel(){ if (panel.hidden) openPanel(); else closePanel(); }

    trigger.addEventListener('click', function(e){ e.stopPropagation(); togglePanel(); });
    search.addEventListener('input', function(){ renderList(search.value); });
    search.addEventListener('keydown', function(e){ if (e.key === 'Escape') closePanel(); });

    list.addEventListener('click', function(e){
      const li = e.target.closest('.auth-cc-opt');
      if (!li) return;
      flagEl.textContent = li.dataset.flag;
      nameEl.textContent = li.dataset.name;
      nameEl.classList.remove('auth-cc-trigger__name--placeholder');
      valInp.value = li.dataset.value;
      closePanel();
    });

    document.addEventListener('click', function(e){
      if (!root.contains(e.target) && !panel.hidden) closePanel();
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && !panel.hidden) closePanel();
    });

    renderList('');
    _registerLiveList(list, panel);
  }
  initCountrySelect('regCountry');

  /* ---------- 7. Phone input: digits only ---------- */
  const phoneInput = document.getElementById('regPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function(){
      const cleaned = this.value.replace(/\D+/g, '');
      if (this.value !== cleaned) this.value = cleaned;
    });
    phoneInput.addEventListener('keypress', function(e){
      // allow only digits; block letters/symbols
      if (e.key && e.key.length === 1 && !/[0-9]/.test(e.key)) {
        e.preventDefault();
      }
    });
    phoneInput.addEventListener('paste', function(e){
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text') || '';
      const digits = text.replace(/\D+/g, '');
      const start = this.selectionStart || 0;
      const end   = this.selectionEnd || 0;
      this.value = this.value.slice(0, start) + digits + this.value.slice(end);
      const pos = start + digits.length;
      try { this.setSelectionRange(pos, pos); } catch(_){}
    });
  }

  /* ---------- 8. Form draft persistence (localStorage) ---------- */
  (function setupRegisterDraft(){
    const form = document.getElementById('registerForm');
    if (!form) return;
    const KEY = 'mex_register_draft_v1';

    function readDraft(){
      try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch(_){ return null; }
    }
    function writeDraft(data){
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(_){}
    }

    function snapshot(){
      const data = {};
      const fields = form.querySelectorAll('input[name], select[name]');
      fields.forEach(function(f){
        if (f.type === 'checkbox') data[f.name] = !!f.checked;
        else if (f.type === 'radio'){ if (f.checked) data[f.name] = f.value; }
        else data[f.name] = f.value;
      });
      // Visual state for phone code picker
      const ccFlag = document.getElementById('regCC-flag');
      const ccCode = document.getElementById('regCC-code');
      if (ccFlag) data._ccFlag = ccFlag.textContent;
      if (ccCode) data._ccCode = ccCode.textContent;
      // Visual state for residence country picker
      const cnFlag = document.getElementById('regCountry-flag');
      const cnName = document.getElementById('regCountry-name');
      if (cnFlag && cnFlag.textContent) data._cnFlag = cnFlag.textContent;
      if (cnName && !cnName.classList.contains('auth-cc-trigger__name--placeholder')){
        data._cnName = cnName.textContent;
      }
      // Current step
      const active = form.querySelector('.auth-step-pane.is-active');
      if (active) data._step = parseInt(active.dataset.pane, 10);
      return data;
    }

    function restore(data){
      if (!data) return;
      Object.keys(data).forEach(function(k){
        if (k.charAt(0) === '_') return;
        const value = data[k];
        const fields = form.querySelectorAll('[name="' + CSS.escape(k) + '"]');
        if (!fields.length) return;
        if (fields[0].type === 'radio'){
          fields.forEach(function(r){ r.checked = (r.value === value); });
        } else if (fields[0].type === 'checkbox'){
          fields[0].checked = !!value;
        } else {
          fields[0].value = value || '';
        }
      });
      // Restore phone code visuals
      const ccFlag = document.getElementById('regCC-flag');
      const ccCode = document.getElementById('regCC-code');
      if (ccFlag && data._ccFlag) ccFlag.textContent = data._ccFlag;
      if (ccCode && data._ccCode) ccCode.textContent = data._ccCode;
      // Restore residence country visuals
      const cnFlag = document.getElementById('regCountry-flag');
      const cnName = document.getElementById('regCountry-name');
      if (cnFlag && data._cnFlag) cnFlag.textContent = data._cnFlag;
      if (cnName && data._cnName){
        cnName.textContent = data._cnName;
        cnName.classList.remove('auth-cc-trigger__name--placeholder');
      }
      // Restore step
      if (data._step && data._step > 1){
        const stepNum = data._step;
        const stepper = document.getElementById('authStepper');
        const panes = form.querySelectorAll('.auth-step-pane');
        panes.forEach(function(p){
          p.classList.toggle('is-active', parseInt(p.dataset.pane, 10) === stepNum);
        });
        if (stepper){
          stepper.querySelectorAll('.auth-step').forEach(function(s){
            const idx = parseInt(s.dataset.step, 10);
            s.classList.toggle('is-active', idx === stepNum);
            s.classList.toggle('is-done', idx < stepNum);
          });
        }
      }
    }

    let saveTimer;
    function scheduleSave(){
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function(){ writeDraft(snapshot()); }, 250);
    }
    form.addEventListener('input', scheduleSave);
    form.addEventListener('change', scheduleSave);
    document.querySelectorAll('[data-next], [data-prev]').forEach(function(btn){
      btn.addEventListener('click', function(){ setTimeout(scheduleSave, 30); });
    });
    // Save when picking from country pickers (click on .auth-cc-list options)
    document.querySelectorAll('.auth-cc-list').forEach(function(list){
      list.addEventListener('click', function(){ setTimeout(scheduleSave, 30); });
    });

    // Restore on load
    const saved = readDraft();
    if (saved) restore(saved);
  })();

  /* ---------- 9. Welcome modal ---------- */
  (function setupWelcomeModal(){
    const modal = document.getElementById('welcomeModal');
    if (!modal) return;
    const nameEl = document.getElementById('welcomeModalName');
    const cta    = document.getElementById('welcomeModalCta');

    function show(name){
      const safe = (name || '').replace(/[<>]/g, '').slice(0, 32) || 'صديقنا';
      if (nameEl) nameEl.textContent = safe;
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      // Force reflow to ensure animation triggers
      void modal.offsetWidth;
      modal.classList.add('is-open');
    }

    function hide(){
      modal.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function(){
        modal.hidden = true;
        modal.setAttribute('aria-hidden', 'true');
      }, 280);
    }

    if (cta){
      cta.addEventListener('click', function(){
        // Clear draft + go to platform app
        try { localStorage.removeItem('mex_register_draft_v1'); } catch(_){}
        cta.disabled = true;
        cta.classList.add('is-loading');
        cta.querySelector('span').textContent = 'جاري التحويل…';
        setTimeout(function(){ window.location.href = (window.location.pathname.replace(/\/auth\/.*$/, '') || '') + '/app.php'; }, 600);
      });
    }

    // ESC closes (optional UX safety net)
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && modal.classList.contains('is-open')){
        hide();
      }
    });

    window.__showWelcomeModal = show;
    window.__hideWelcomeModal = hide;
  })();

})();

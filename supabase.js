/* =====================================================================
   SKARTE Film — Supabase 설정 (공개 사이트 + 관리자 공용)
   ---------------------------------------------------------------------
   ▶ 아래 두 값을 본인 프로젝트 값으로 교체하세요.
     Supabase 대시보드 > Project Settings > Data API (또는 API)
       - Project URL      → SUPABASE_URL
       - anon public key  → SUPABASE_ANON_KEY
   ▶ anon 키는 공개되어도 안전합니다 (RLS 로 쓰기를 막아둠).
   ===================================================================== */
window.SKARTE_SUPABASE = {
  url:  "https://qgblqeftvegolvospsyv.supabase.co",
  anon: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFnYmxxZWZ0dmVnb2x2b3Nwc3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MDM0MDYsImV4cCI6MjA5Njk3OTQwNn0.mKHwmIae1mtKfM9W5ct1GYpnPi0GRNaR4Q5JWgYcH8E",
  // works 데이터를 저장하는 site_data 테이블의 key
  worksKey: "works",
  // 사진 파일이 올라가는 Storage 버킷 이름 (schema.sql 에서 생성)
  bucket: "photos"
};

/* ---------------------------------------------------------------------
   경량 Supabase REST 헬퍼 (SDK 없이 fetch 만 사용).
   - loadWorksFromCloud(): 공개 사이트가 works 를 읽음 (anon, 읽기 전용)
   - saveWorksToCloud(data, accessToken): 관리자가 저장 (로그인 토큰 필요)
   - signIn(email, password): 관리자 로그인 → access_token 반환
   --------------------------------------------------------------------- */
(function () {
  var CFG = window.SKARTE_SUPABASE;
  var configured =
    CFG && CFG.url.indexOf("YOUR-PROJECT") === -1 && CFG.anon.indexOf("YOUR-ANON") === -1;

  CFG.isConfigured = function () { return configured; };

  // works 한 행 읽기 (public read)
  CFG.loadWorks = async function () {
    if (!configured) return null;
    try {
      var url = CFG.url + "/rest/v1/site_data?key=eq." +
                encodeURIComponent(CFG.worksKey) + "&select=value";
      var r = await fetch(url, {
        headers: { apikey: CFG.anon, Authorization: "Bearer " + CFG.anon },
        cache: "no-store"
      });
      if (!r.ok) return null;
      var rows = await r.json();
      return (rows && rows[0] && rows[0].value) ? rows[0].value : null;
    } catch (e) { return null; }
  };

  // works 한 행 upsert (관리자 로그인 토큰 필요)
  CFG.saveWorks = async function (value, accessToken) {
    if (!configured) throw new Error("Supabase 설정이 비어 있습니다.");
    if (!accessToken) throw new Error("로그인이 필요합니다.");
    var url = CFG.url + "/rest/v1/site_data?on_conflict=key";
    var r = await fetch(url, {
      method: "POST",
      headers: {
        apikey: CFG.anon,
        Authorization: "Bearer " + accessToken,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({ key: CFG.worksKey, value: value })
    });
    if (!r.ok) {
      var t = await r.text();
      throw new Error("저장 실패 (" + r.status + "): " + t);
    }
    return true;
  };

  // 관리자 로그인 (Supabase Auth, 이메일+비번) → access_token
  CFG.signIn = async function (email, password) {
    if (!configured) throw new Error("Supabase 설정이 비어 있습니다.");
    var url = CFG.url + "/auth/v1/token?grant_type=password";
    var r = await fetch(url, {
      method: "POST",
      headers: { apikey: CFG.anon, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    });
    var j = await r.json();
    if (!r.ok) throw new Error(j.error_description || j.msg || "로그인 실패");
    return j; // { access_token, refresh_token, user, ... }
  };

  /* --- 구글 OAuth 로그인 ---------------------------------------------
     Supabase 의 authorize 엔드포인트로 리다이렉트한다.
     redirectTo 는 현재 admin 페이지로 돌아오게 설정.
     로그인 완료 후 #access_token=... 형태로 해시에 토큰이 붙어 돌아온다. */
  CFG.signInWithGoogle = function (redirectTo) {
    if (!configured) throw new Error("Supabase 설정이 비어 있습니다.");
    var ret = redirectTo || window.location.href.split('#')[0];
    var url = CFG.url + "/auth/v1/authorize?provider=google&redirect_to=" +
              encodeURIComponent(ret);
    window.location.href = url;
  };

  /* --- OAuth 콜백 해시에서 토큰 회수 ---------------------------------
     리다이렉트로 돌아왔을 때 URL 해시(#access_token=...&...)를 파싱.
     성공 시 { access_token, refresh_token, expires_at } 반환, 없으면 null.
     파싱 후 해시는 깨끗하게 지운다. */
  CFG.readOAuthHash = function () {
    var h = window.location.hash || "";
    if (h.indexOf("access_token=") === -1) {
      // 에러로 돌아온 경우도 처리
      if (h.indexOf("error=") !== -1) {
        var ep = new URLSearchParams(h.replace(/^#/, ""));
        var em = ep.get("error_description") || ep.get("error") || "로그인 오류";
        try { history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) {}
        throw new Error(decodeURIComponent(em));
      }
      return null;
    }
    var p = new URLSearchParams(h.replace(/^#/, ""));
    var out = {
      access_token: p.get("access_token"),
      refresh_token: p.get("refresh_token"),
      expires_at: p.get("expires_at")
    };
    try { history.replaceState(null, "", window.location.pathname + window.location.search); } catch (e) {}
    return out.access_token ? out : null;
  };

  /* --- 토큰으로 현재 사용자 정보 조회 (이메일 확인용) ----------------
     화이트리스트 검증에 사용. 실패 시 null. */
  CFG.getUser = async function (accessToken) {
    if (!configured || !accessToken) return null;
    try {
      var r = await fetch(CFG.url + "/auth/v1/user", {
        headers: { apikey: CFG.anon, Authorization: "Bearer " + accessToken }
      });
      if (!r.ok) return null;
      return await r.json(); // { id, email, ... }
    } catch (e) { return null; }
  };

  /* ===================================================================
     Storage — 사진 파일 업로드/삭제 (관리자 전용, 로그인 토큰 필요)
     버킷은 public 이라 읽기는 URL 만으로 가능. 쓰기는 RLS 로 막혀 있음.
     =================================================================== */

  // 저장된 경로 → 공개 URL
  CFG.photoUrl = function (path) {
    return CFG.url + "/storage/v1/object/public/" + CFG.bucket + "/" +
           String(path || "").replace(/^\/+/, "");
  };

  // Blob/File 업로드 → 공개 URL 반환
  CFG.uploadPhoto = async function (blob, path, accessToken) {
    if (!configured) throw new Error("Supabase 설정이 비어 있습니다.");
    if (!accessToken) throw new Error("로그인이 필요합니다.");
    var r = await fetch(CFG.url + "/storage/v1/object/" + CFG.bucket + "/" + path, {
      method: "POST",
      headers: {
        apikey: CFG.anon,
        Authorization: "Bearer " + accessToken,
        "Content-Type": blob.type || "application/octet-stream",
        "cache-control": "max-age=31536000",
        "x-upsert": "true"
      },
      body: blob
    });
    if (!r.ok) {
      var t = await r.text();
      if (/bucket not found/i.test(t)) {
        throw new Error("'" + CFG.bucket + "' 버킷이 없습니다. supabase/schema.sql 의 Storage 섹션을 SQL Editor 에서 실행하세요.");
      }
      if (r.status === 403 || /row-level security|violates/i.test(t)) {
        throw new Error("업로드 권한이 없습니다. schema.sql 의 Storage 정책을 실행했는지 확인하세요.");
      }
      throw new Error("업로드 실패 (" + r.status + "): " + t);
    }
    return CFG.photoUrl(path);
  };

  // 저장소에서 파일 삭제 (실패해도 치명적이지 않음 → false 반환)
  CFG.deletePhoto = async function (path, accessToken) {
    if (!configured || !accessToken || !path) return false;
    try {
      var r = await fetch(CFG.url + "/storage/v1/object/" + CFG.bucket + "/" + path, {
        method: "DELETE",
        headers: { apikey: CFG.anon, Authorization: "Bearer " + accessToken }
      });
      return r.ok;
    } catch (e) { return false; }
  };

  /* --- refresh_token 으로 세션 갱신 ----------------------------------
     access_token 만료(보통 1시간) 시 재로그인 없이 갱신. 실패 시 null. */
  CFG.refreshSession = async function (refreshToken) {
    if (!configured || !refreshToken) return null;
    try {
      var r = await fetch(CFG.url + "/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        headers: { apikey: CFG.anon, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
      });
      if (!r.ok) return null;
      return await r.json(); // { access_token, refresh_token, ... }
    } catch (e) { return null; }
  };
})();

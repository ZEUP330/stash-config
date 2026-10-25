// Probe v2: one anonymous GET; no redirects, retries, credentials or route changes.
(function () {
  var p;
  var start = Date.now();
  var finished = false;
  function clock() {
    var d = new Date();
    function pad(n) { return n < 10 ? "0" + n : String(n); }
    return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  function finish(summary, detail, icon, color) {
    if (finished) return;
    finished = true;
    $done({
      title: p && p.title ? p.title : "HTTP 检测",
      content: summary + "\n" + detail + "\n请求耗时 " +
        Math.max(0, Date.now() - start) + " ms" +
        "\n策略组：" + (p && p.proxy ? p.proxy : "未配置") +
        "\n检测时间：" + clock() + "\n仅检测 HTTP，不代表登录或解锁成功",
      icon: p && p.icon ? p.icon : icon,
      backgroundColor: color,
      url: p && (p.openUrl || p.url) ? (p.openUrl || p.url) : ""
    });
  }
  var neutral = "#3A3A3C";
  var success = "#173D2A";
  var warning = "#553628";
  try {
    p = JSON.parse($argument);
    if (!p || typeof p.url !== "string" ||
        !/^https:\/\//i.test(p.url) || typeof p.proxy !== "string" || !p.proxy) {
      throw new Error("Invalid probe configuration");
    }
  } catch (e) {
    finish("检测配置有误", "请更新覆写后重新检测", "questionmark.circle", neutral);
    return;
  }
  try {
    $httpClient.get({
      url: p.url,
      timeout: 10,
      "auto-cookie": false,
      "auto-redirect": false,
      headers: { "X-Stash-Selected-Proxy": encodeURIComponent(p.proxy) }
    }, function (error, response, data) {
      if (error || !response) {
        finish("请求未完成", "连接失败或超时；无法仅凭此确定故障位置",
          "wifi.exclamationmark", warning);
        return;
      }
      var status = Number(response.status || response.statusCode);
      var code = "HTTP " + status;
      var body = typeof data === "string" ? data.slice(0, 32768) : "";
      var lower = body.toLowerCase();
      var regionData = null;
      if (p.kind === "openai-region") {
        try { regionData = JSON.parse(body); } catch (e) { regionData = null; }
      }
      if (regionData && regionData.error && /unsupported_country/i.test(JSON.stringify(regionData.error))) {
        finish("接口提示地区限制", "该接口返回 unsupported_country；不等同于账号或全部功能的地区判断",
          "exclamationmark.triangle", warning);
        return;
      }
      if (p.kind === "openai-ios" && /disallowed isp|been blocked/.test(lower)) {
        finish("iOS入口提示拦截", "入口响应含拦截提示；需结合实际 App 验证",
          "questionmark.circle", neutral);
        return;
      }
      if (!isFinite(status) || status < 100 || status > 599) {
        finish("响应待核对", "未取得有效 HTTP 状态", "questionmark.circle", neutral);
      } else if (status >= 300 && status < 400) {
        finish("跳转可达 · " + status, "站点已响应；未跟随跳转，后续页面未验证",
          "arrow.turn.up.right", neutral);
      } else if (status === 401) {
        finish("需认证 · 401", "检测地址要求认证；不等于 App 登录失败",
          "questionmark.circle", neutral);
      } else if (status === 403) {
        finish("待验证 · 403", "检测请求被拒绝；可能涉及风控、地区或请求方式，需实测 App",
          "questionmark.circle", neutral);
      } else if (status === 429) {
        finish("限流 · 429", "站点限制检测请求；稍后刷新，不自动重试",
          "hourglass", neutral);
      } else if (status === 404 || status === 405) {
        finish("地址待核对 · " + status, "检测路径不存在或方法不支持；不能判断整个服务不可用",
          "questionmark.circle", neutral);
      } else if (status >= 500) {
        finish("服务端异常 · " + status, "服务器或中间网关返回错误；不一定是节点故障",
          "exclamationmark.triangle", warning);
      } else if (status >= 200 && status < 300) {
        var challenge = /<title[^>]*>\s*(?:Just a moment[^<]*|Attention Required[^<]*|Verify you are human[^<]*|Security Verification[^<]*)<\/title>/i.test(body);
        if (challenge) {
          finish("需要网页验证 · " + status, "检测到常见验证页标题；未尝试通过验证，业务可用性未知",
            "questionmark.circle", neutral);
        } else if (p.expectedStatus && status !== Number(p.expectedStatus)) {
          finish("响应待核对 · " + status, "预期 HTTP " + p.expectedStatus + "，实际 " + code,
            "questionmark.circle", neutral);
        } else if (p.kind === "claude-trace") {
          var loc = body.match(/^loc=([A-Z]{2})\r?$/m);
          var colo = body.match(/^colo=([A-Z0-9]+)\r?$/m);
          if (loc) {
            finish("边缘可达 · " + loc[1], "Trace地区：" + loc[1] +
              (colo ? "；边缘节点：" + colo[1] : "") + "；未测试登录或聊天",
              "checkmark.circle", success);
          } else {
            finish("Trace响应待核对", "HTTP正常，但缺少loc字段；不推断出口地区或业务可用性",
              "questionmark.circle", neutral);
          }
        } else if (p.kind === "openai-region") {
          var parsed = regionData;
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || parsed.error) {
            finish("接口响应待核对", "未取得可确认的JSON对象或接口返回错误；不判断地区支持",
              "questionmark.circle", neutral);
          } else {
            finish("地区接口可达 · " + status, "收到JSON且未见地区拒绝标记；不是账号可用性证明",
              "checkmark.circle", success);
          }
        } else if (p.kind === "netflix-title") {
          finish("影片页面可达 · " + status, "仅检测公开样本影片页，不判断完整片库或实际播放权限",
            "checkmark.circle", success);
        } else if (p.kind === "youtube-premium") {
          finish("Premium页面可达", "仅检测公开页面，不据此判断会员资格、地区支持或实际播放",
            "checkmark.circle", success);
        } else if (p.kind === "github-api") {
          var githubData;
          try { githubData = JSON.parse(body); } catch (e) { githubData = null; }
          if (githubData && githubData.resources && githubData.rate) {
            finish("GitHub API可达", "匿名API有响应；不代表Git克隆、推送或Copilot正常",
              "checkmark.circle", success);
          } else {
            finish("API响应待核对", "HTTP正常，但未取得预期的GitHub API结构",
              "questionmark.circle", neutral);
          }
        } else {
          finish("HTTP 可达 · " + status, p.expectedStatus ? "收到预期状态；业务权限另行验证" : "收到正常 HTTP 响应；业务权限另行验证",
            "checkmark.circle", success);
        }
      } else {
        finish("响应待核对 · " + status, code + "；不能据此判断整个服务不可用",
          "questionmark.circle", neutral);
      }
    });
  } catch (e) {
    finish("检测执行失败", "请查看脚本日志或更新覆写；未自动更换节点",
      "questionmark.circle", neutral);
  }
}());

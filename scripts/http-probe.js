var p = JSON.parse($argument);
var start = Date.now();
$httpClient.get({url:p.url,timeout:10,"auto-cookie":false,"auto-redirect":false,
  headers:{"X-Stash-Selected-Proxy":encodeURIComponent(p.proxy)}},
  function(error,response,data){
    var title=p.title+" 连通检测";
    if(error || !response){
      $done({title:title,content:"请求失败或超时",icon:"exclamationmark.triangle",url:p.url});
      return;
    }
    var status=Number(response.status || response.statusCode);
    var message=status>=200 && status<300 ? "HTTP响应正常" :
      status>=300 && status<400 ? "收到跳转，未验证后续页面" :
      status===403 ? "请求被拒绝；原因待确认" :
      status===429 ? "请求受到限流" : "收到异常HTTP状态";
    $done({title:title,content:message+"\nHTTP "+status+" · "+(Date.now()-start)+" ms\n不代表登录或解锁成功",
      icon:status>=200 && status<300 ? "checkmark.circle" : "exclamationmark.triangle",url:p.url});
  });

# Stash 外网与地区分流

这是 **覆写订阅**，不包含代理节点，必须配合自己的服务商订阅使用。公开文件中不包含服务商订阅链接、节点密码或认证信息。

## 订阅地址

```text
https://raw.githubusercontent.com/ZEUP330/stash-config/main/Stash-Complete.stoverride
```

## iOS 使用

1. 保留并启用自己的服务商订阅，先确认节点可连接。
2. 打开 Stash 的「覆写」管理，通过 URL 导入上面的地址并启用。
3. 关闭以前修改分流和检测面板的覆写，防止重复及规则冲突。
4. 选择「规则模式」，打开「脚本」运行检测面板；不需要开启 MitM 或改写。
5. 在「地区-新加坡」「地区-美国」「地区-日本」「地区-台湾」中分别选择一个真实可用节点。空组可能按直连处理，不要忽略。
6. 需要保持其他未匹配流量直连时，确保「未匹配流量」选中 `DIRECT`。

首次下载规则集或检测脚本失败时，可暂时用原订阅的全局代理完成下载，再切回规则模式。不要将本覆写作为节点订阅导入。

## 默认策略

| 类别 | 默认出口 |
| --- | --- |
| ChatGPT、Claude、Google、YouTube、GitHub、其他 AI、开发、协作、通用外网 | 新加坡优先；网络连通失败时尝试美国 |
| Muse | 美国；未确认新加坡业务可用性 |
| Migoo | 新加坡优先；没有据此认定其官方支持地区 |
| Hulu、Peacock、Pandora 等地区服务 | 美国限定服务组，默认美国；不保证代理 IP 能解锁 |
| 美国购物等普通网站 | 新加坡优先，可手动改美国 |
| 日本网站、台湾网站 | 对应地区节点，可手动更换 |
| 国内及局域网 | 按规则直连 |
| 未匹配 | 默认直连，可手动改代理 |

`fallback` 判断网络连通，不理解网页中的“地区不支持”、账号资格、付款地区或片库授权。遇到这些情况，只切换对应服务组；不能承诺自动切美国就恢复服务。

地区规则是一组常用服务与域名，不能代表该地区所有网站，更不能保证互联网全部服务或功能均可用。域名命中优先于 IP 判断。

## 检测面板 v2

更新覆写并重新应用，随后在「第三方服务」中刷新。新版使用独立的 `scripts/http-probe-v2.js` 地址，避免继续引用旧脚本路径；面板增加到 9 个。

| 面板 | 实际检测地址 | 能说明什么 |
| --- | --- | --- |
| ChatGPT 地区接口 | `https://api.openai.com/compliance/cookie_requirements` | 匿名接口能否响应、是否明确返回地区拒绝；不等于ChatGPT账号可用 |
| ChatGPT iOS入口 | `https://ios.chat.openai.com` | iOS入口响应及已知拦截提示；不测试登录或聊天 |
| Claude 边缘网络 | `https://claude.ai/cdn-cgi/trace` | Trace能否访问及loc/colo线索；不等于Claude聊天可用，不是模型运算地点 |
| Google | `https://www.google.com/generate_204` | 是否收到预期的204；不代表Gemini等全部Google产品可用 |
| YouTube Premium页 | `https://www.youtube.com/premium` | 公开会员页面是否可达；不判断会员资格或地区支持 |
| Netflix 影片页 | `https://www.netflix.com/title/81280792` | 指定样本页是否可达；不能证明完整解锁或播放权限 |
| Muse、Migoo | 各自官网 | 仅检测HTTP响应，暂未找到可核实的专用匿名业务检测接口 |
| GitHub API | `https://api.github.com/rate_limit` | 匿名API返回结构；不代表Git克隆、推送或Copilot可用 |

检测地址参考 [Stash官方示例](https://github.com/StashNetworks/misc/tree/main/collapsed-tiles)、[Claude社区Trace用法](https://github.com/LangYa466/claude-usage-gnome)、[Hyseen Netflix样本检测](https://gist.github.com/Hyseen/b06e911a41036ebc36acf04ddebe7b9a)。参考地址不代表照搬它们的“Available”或“完整解锁”判断；我们的判断更保守。未从用户实际节点验证这些接口仍然有效，失效时会显示待核对。

每个面板固定使用对应服务策略组，每30分钟执行一次匿名GET；不读取登录凭据、不重试、不跟随跳转、不执行人机验证、不自动更换服务出口。点击卡片打开官网，而非空白检测接口。

- 2xx：按面板目的显示HTTP或接口可达，不承诺业务可用。
- 3xx：中性的「跳转可达」，不再显示故障警告；后续页面未验证。
- 401/403/429：中性显示需认证、待验证、限流，不能直接判断App不可用。
- Google返回200而非预期204、Trace缺少loc、API返回HTML或错误JSON：显示待核对，不显示绿色成功。
- 常见网页验证标题：显示需要网页验证，不尝试通过验证。此检测无法识别所有验证页。
- 超时、连接失败、5xx：明确说明请求未完成或服务端异常，不自动归咎于节点。

首行显示简短结果；详情列出请求耗时、策略组和本机检测时间。耗时是整个HTTP请求的耗时，不是节点ping或模型响应速度。

## 图标与自动测速

服务品牌PNG来自 [Homarr Dashboard Icons](https://github.com/homarr-labs/dashboard-icons)，固定到已核对的提交版本，避免图标文件随主分支变化。用于ChatGPT、Claude、Google、YouTube、Netflix、GitHub及部分策略组。未确认Muse/Migoo专用图标，保留系统图标，不用其他产品Logo冒充。

服务Logo保持固定，检测状态由短文案和背景颜色表达。图标需要联网加载；不影响分流判断。上游图标及商标归原权利人所有。

新增四个「自动-地区」策略组，按延迟选择节点，每10分钟检查；启用lazy并设置100ms切换容差。可在原「地区」组选择自动组，也可继续固定节点。测速仅判断网络连通，不验证服务解锁。已有手动选择可能继续保留，需要自行切到自动组选项。

## 更新与边界

- 11 个上游规则集每天检查更新；域名来源包括 MetaCubeX/meta-rules-dat、blackmatrix7/ios_rule_script、Loyalsoldier/clash-rules。
- 本覆写的结构、手动补充域名和检测代码，需要提交本仓库更新后在 Stash 中更新覆写；它们不会由一个后台任务自动研究补全。
- 不代理整个 AWS、Azure、CloudFront、Auth0 等共享平台；尽量按服务专用域名匹配。
- `rules: #!replace` 会替换服务商原分流规则。没有默认加入广告拦截，DNS 沿用基础配置。
- 本地已检查 YAML、策略组和规则引用、规则优先级、新版检测脚本语法、状态分支与响应格式。未做 iOS Stash 实机测试，也未验证所有账号和节点的地区可用性。

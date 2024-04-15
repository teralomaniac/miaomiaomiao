# 使用方法

1. 获得一个 YOU.COM 账户并且订阅

2. 打开 F12（DevTools）-Console（控制台）并且输入 `document.cookie`

3. 复制输出结果（不包括开头和结尾的 ' ）

4. 下载或Clone本项目代码，解压

5. 运行 `npm install` （如果你没有 Node.JS，去装一个）

6. 编辑 `start.bat` 文件，把上面的 Cookie 粘贴进去

7. 启动 start.bat

8. 酒馆中选择 Claude，反向代理地址填 http://127.0.0.1:8080/v1

9. 开始使用。如果失败了/没有结果/403/Warning 就多重试几次。

## 注意事项

确保你访问 YOU.COM 的浏览器用的出口 IP 和你运行代理程序用的出口 IP 是同一个（简单的说就是要开 VPN 就全局开），否则你会被 CloudFlare 拦截并且获得一个 403 错误。

# Usage

1. Get a YOU.COM account and subscribe.

2. Open F12 (DevTools) - Console and enter `document.cookie`.

3. Copy the output result (excluding the leading and trailing ' characters).

4. Download or clone the project code and extract it.

5. Run `npm install` (if you don't have Node.JS, go install it).

6. Edit the `start.bat` file and paste the Cookie from above into it.

7. Launch start.bat.

8. In the ST, select Claude and fill in the reverse proxy address as http://127.0.0.1:8080/v1.

9. Start using it. If it fails/no results/403/Warning, try again several times.

## Notes

Ensure that the exit IP used by your browser when accessing YOU.COM and the exit IP used by your proxy program are the same (simply put, if you need to use a VPN, turn it on globally). Otherwise, you will be blocked by CloudFlare and get a 403 error.
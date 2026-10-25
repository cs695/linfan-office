# 林凡娛樂 · 3D AI 團隊辦公室（靜態原型）

純靜態（`index.html` + `style.css` + `js/app.js` + `assets/` + `status.json`），冇登入、冇後端。

## 本地預覽
```bash
cd /workspace/linfan/office3d
python3 -m http.server 8765      # 然後開 http://127.0.0.1:8765/
```
（唔好用 file:// 開，瀏覽器會擋 fetch status.json。）

## 更新狀態（routine / 同事用）
```bash
./update_status.py scarlett --activity typing  --status "寫緊歌手 DM 跟進"
./update_status.py luke     --activity pantry  --status "休息一陣"
./update_status.py jennifer --alert "等 Lobaton 決定"      # 氣泡變紅
./update_status.py jennifer --clear-alert
./update_status.py --touch                                   # 只更新「最後更新」時間（心跳）
```
`activity`：`typing`（坐低打字）｜`idle`（起身行行企企）｜`pantry`（去 Pantry 搵咖啡 / hea）｜`thinking`（坐低諗嘢）。
頁面每 60 秒讀一次 `status.json?_=時間戳`；JSON 一變，人物動作同氣泡文字即時轉。
**因為頁面可能公開，status / alert 請只寫概括工作，唔好寫歌手名、IG 帳號、版權／糾紛等內部資料。**

## 操作
拖動＝旋轉；滾輪＝縮放；右鍵拖＝平移；`1–5` 聚焦同事；`6` Pantry；`7` Lounge；`0` 全景；空白鍵＝開關自動環繞；`F` 全屏；`H` 隱藏介面；雙擊＝回全景。
網址參數：`?auto=0`（唔自動環繞）、`?ui=0`（只睇 3D）、`?fx=low`（慳 GPU：冇鏡面地板／bloom）、`?cam=pantry|lounge|desk-scarlett`、`?speed=2`（動畫加速，測試用）。

## 重新 build（只有改 `src/` 先需要）
`js/app.js` 已經包咗 three.js r186（本地 bundle，唔靠 CDN）。
```bash
npm i three esbuild   # 另一個資料夾，唔好放入發佈資料夾
THREE_NM=/path/to/node_modules ESBUILD=/path/to/esbuild ./build.sh
```
`tools/make_assets.py`：由 `/workspace/linfan/portraits/*_real.jpg` 重新裁切 / 壓細相。three.js 授權見 `js/LICENSE-three.txt`。

## 部署
- **Cloudflare Pages**：Create project → Direct Upload → 上傳 `office3d` 資料夾（或 zip 解壓後嘅內容）。`_headers` 已設 `status.json` 唔 cache。
- **GitHub Pages**：新 repo，將內容放根目錄，Settings → Pages → Deploy from branch → main / (root)。`.nojekyll` 已包含。
  Routine 更新：commit 新 `status.json` 去 repo（或者用 Cloudflare Pages 嘅 git 連結）。

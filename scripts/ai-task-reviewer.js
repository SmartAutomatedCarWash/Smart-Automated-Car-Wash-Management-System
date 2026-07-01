const fs = require("fs");

async function run() {
  try {
    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      console.error("No GITHUB_EVENT_PATH found.");
      return;
    }

    const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
    const prNumber = event.pull_request.number;
    const prBody = event.pull_request.body || "";
    const repository = process.env.GITHUB_REPOSITORY;
    const githubToken = process.env.GITHUB_TOKEN;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!githubToken || !geminiApiKey) {
      console.error("Missing GITHUB_TOKEN or GEMINI_API_KEY.");
      return;
    }

    const issueRegex = /(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)?\s*#(\d+)/gi;
    const matches = [...prBody.matchAll(issueRegex)];
    const issueNumbers = [...new Set(matches.map((match) => match[1]))];

    if (issueNumbers.length === 0) {
      console.log("No linked issues found in PR description.");
      await fetch(`https://api.github.com/repos/${repository}/issues/${prNumber}/comments`, {
        method: "POST",
        headers: {
          Authorization: `token ${githubToken}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          body:
            "⚠️ **AI Review Warning:** Không tìm thấy liên kết tới Task (Issue) nào trong phần mô tả của Pull Request này (ví dụ: `#123` hoặc `Closes #123`). Vui lòng cập nhật mô tả PR để AI có thể đánh giá code dựa trên yêu cầu của Task!",
        }),
      });
      return;
    }

    console.log(`Found linked issues: ${issueNumbers.join(", ")}`);

    const issueNumber = issueNumbers[0];
    const issueResponse = await fetch(`https://api.github.com/repos/${repository}/issues/${issueNumber}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!issueResponse.ok) {
      throw new Error(`Failed to fetch issue #${issueNumber}: ${issueResponse.statusText}`);
    }

    const issueData = await issueResponse.json();
    const issueTitle = issueData.title;
    const issueBody = issueData.body || "Không có mô tả chi tiết.";

    const diffResponse = await fetch(`https://api.github.com/repos/${repository}/pulls/${prNumber}`, {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: "application/vnd.github.v3.diff",
      },
    });

    if (!diffResponse.ok) {
      throw new Error(`Failed to fetch PR diff: ${diffResponse.statusText}`);
    }

    let prDiff = await diffResponse.text();
    if (prDiff.length > 50000) {
      prDiff = prDiff.substring(0, 50000) + "\n\n... [Diff truncated due to size limit]";
    }

    const prompt = `
Bạn là một AI Code Reviewer chuyên nghiệp và giàu kinh nghiệm. Nhiệm vụ của bạn là kiểm tra xem các thay đổi trong Pull Request (PR) dưới đây có giải quyết đúng, đủ và chính xác các yêu cầu của Task (Issue) được giao hay không.

Dưới đây là thông tin của Task (Issue) được giao:
---
Tiêu đề: ${issueTitle} (Issue #${issueNumber})
Mô tả yêu cầu:
${issueBody}
---

Dưới đây là phần code thay đổi (PR Diff):
---
${prDiff}
---

Hãy viết một nhận xét đánh giá chi tiết bằng tiếng Việt với các phần sau:
1. 🤖 **Tóm tắt ngắn gọn** những gì nhà phát triển đã thực hiện trong PR này.
2. 🎯 **Đánh giá mức độ hoàn thành nhiệm vụ:** 
   - So sánh trực tiếp code thay đổi với mô tả yêu cầu của Task.
   - Chỉ rõ những yêu cầu nào đã được hoàn thành tốt.
   - Chỉ rõ những yêu cầu nào **chưa được thực hiện** hoặc **thực hiện chưa đúng/chưa đủ** so với mô tả nhiệm vụ (nếu có).
3. 🛠️ **Đánh giá chất lượng mã nguồn:** 
   - Có lỗi logic, lỗi bảo mật, hay các vấn đề về hiệu năng không?
   - Code có tuân thủ nguyên tắc Clean Code không? Có code thừa hay không?
4. 💡 **Kết luận & Khuyến nghị:** Đưa ra lời khuyên cụ thể cho nhà phát triển để hoàn thiện PR này trước khi gộp (merge).

*Lưu ý: Hãy nhận xét một cách khách quan, lịch sự, mang tính xây dựng, sử dụng định dạng Markdown rõ ràng và trực quan.*
`;

    console.log("Sending request to Gemini API...");
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      },
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      if (geminiResponse.status === 429) {
        console.warn(
          `⚠️ Gemini API Rate Limit (429) exceeded. Skipping AI review comment to avoid blocking CI. Details: ${errorText}`,
        );
        return;
      }
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const reviewResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reviewResult) {
      throw new Error("No response returned from Gemini API.");
    }

    console.log("Posting review comment to PR...");
    const commentResponse = await fetch(`https://api.github.com/repos/${repository}/issues/${prNumber}/comments`, {
      method: "POST",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
      },
      body: JSON.stringify({ body: reviewResult }),
    });

    if (!commentResponse.ok) {
      throw new Error(`Failed to post comment to PR: ${commentResponse.statusText}`);
    }

    console.log("Successfully posted AI review to the PR!");
  } catch (error) {
    console.error("Error during AI task review:", error);
    process.exit(1);
  }
}

run();

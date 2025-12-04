/*
九号出行 - Cookie设置脚本
用于设置签到所需的Cookie数据
*/

// ============================================
// 在这里填入您的Cookie信息
// ============================================

const cookieData = {
  // 必填: 从请求头中获取的 authorization 值
  authorization:
    "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1NGMyNWMwN2EyYzU0NDkyODFjNjA5YzE0N2FhMzliZCIsImF1ZGllbmNlIjoibW9iaWxlIiwidXNlcl9uYW1lIjoiZmlzaHphIiwiY2xpZW50X2lkIjoiYXBwX2NsaWVudF9pZF92ZWhpY2xlIiwicmVnX2RhdGUiOjE2MDI0NjY0OTcsImF1ZCI6WyJpb3Qtd2ViYXBwIl0sImFyZWFDb2RlIjoiODYiLCJwaG9uZSI6IjE4NTU3NTMxODg3Iiwic2NvcGUiOlsicmVhZCJdLCJleHAiOjE3NjU0NjU1NDcsInJlZ2lvbiI6ImJqIiwianRpIjoidGJXNVJaQ2hRS1FDdTRxYkFOY3R1bDlaYWlFIiwiZW1haWwiOiJsaXdlaXNwQGdtYWlsLmNvbSJ9.CqHD93l8mFIdoYCI8t31LVUptv_VrtwRk4rgp7Q8k9FzLFPxN28B3fqdyZT9DissHE-yA7yex92MSEwY9sn0kZpqFosCWQOx5E5VI5Jgmvyy5H7_2YcnXui9Vutg76XSWomRUpA6_KkDC45d5Cb2GhrWOOMQuor1Cyhz4wc6to4",

  // 可选: 设备ID (如果不填,签到时会使用默认值)
  deviceId: "YOUR_DEVICE_ID_HERE",
};

// ============================================
// 以下代码无需修改
// ============================================

const cookieName = "九号出行";
const cookieKey = "ninebot_cookie_data";

console.log("========== 九号出行Cookie设置 ==========");

// 验证必填字段
if (
  !cookieData.authorization ||
  cookieData.authorization === "YOUR_AUTHORIZATION_HERE"
) {
  console.log("❌ 错误: 请先填入您的 authorization");
  $notification.post(
    cookieName,
    "❌ 设置失败",
    "请在脚本中填入您的 authorization"
  );
  $done();
  return;
}

// 保存Cookie数据
const saveResult = $persistentStore.write(
  JSON.stringify(cookieData),
  cookieKey
);

if (saveResult) {
  console.log("✅ Cookie数据已保存");
  console.log("保存的数据: " + JSON.stringify(cookieData, null, 2));

  $notification.post(cookieName, "✅ Cookie设置成功", "现在可以运行签到脚本了");
} else {
  console.log("❌ Cookie保存失败");
  $notification.post(cookieName, "❌ 设置失败", "Cookie数据保存失败");
}

$done();

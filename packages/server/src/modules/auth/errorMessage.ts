const messages: Record<string, string> = {
  'Illegal length of nickname!': '评分站昵称须为 4–20 个字符，请检查后重试。',
  'Illegal char in nickname!': '评分站昵称不能包含空格或特殊符号，请检查后重试。',
  'User DNE.': '该昵称尚未注册评分站，请检查评分站昵称，或先完成注册。',
  'Wrong Password.': '评分站密码错误，请使用注册评分站时设置的密码。',
  'User Exists!': '该小视野账号已注册评分站，请使用注册时设置的评分站昵称和密码登录。',
  'invalid arguments on fetchHtml': 'PHPSESSID 格式不正确，请仅复制它的值，不要包含 PHPSESSID= 或其他 Cookie。',
  'Failed to get username': '无法读取小视野账号信息，请重新登录小视野并复制最新的 PHPSESSID；如有比赛正在进行，请在比赛结束后重试。',
  'Failed to get realname': '无法获取小视野账号的真实姓名，暂时无法完成注册。如有比赛正在进行，请在比赛结束后重试；否则请确认小视野个人资料中已填写真实姓名。',
};

export function getAuthErrorMessage(error: unknown, action: 'login' | 'register'): string {
  if (error instanceof Error && Object.hasOwn(messages, error.message)) {
    return messages[error.message];
  }

  if (action === 'register' && error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
    return '评分站昵称或小视野账号已被注册，请更换昵称；若该小视野账号已注册，请直接登录。';
  }

  return action === 'login' ? '登录暂时失败，请稍后重试。' : '注册暂时失败，请稍后重试。';
}

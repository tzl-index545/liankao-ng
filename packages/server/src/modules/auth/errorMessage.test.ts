import { describe, expect, it } from 'bun:test';
import { getAuthErrorMessage } from './errorMessage';

describe('auth error messages', () => {
  it('gives separate guidance for an unregistered nickname and a wrong password', () => {
    expect(getAuthErrorMessage(new Error('User DNE.'), 'login')).toContain('该昵称尚未注册评分站');
    expect(getAuthErrorMessage(new Error('Wrong Password.'), 'login')).toContain('评分站密码错误');
  });

  it('explains the real-name restriction and when to retry', () => {
    const message = getAuthErrorMessage(new Error('Failed to get realname'), 'register');
    expect(message).toContain('无法获取小视野账号的真实姓名');
    expect(message).toContain('请在比赛结束后重试');
  });

  it('does not blame contests for nickname or duplicate-account errors', () => {
    const nicknameMessage = getAuthErrorMessage(new Error('Illegal length of nickname!'), 'register');
    expect(nicknameMessage).toContain('4–20');
    expect(nicknameMessage).not.toContain('比赛');
    expect(getAuthErrorMessage(new Error('User Exists!'), 'register')).toContain('该小视野账号已注册评分站');
    expect(getAuthErrorMessage({ code: 'P2002' }, 'register')).toContain('已被注册');
  });

  it('uses a retry message for unexpected errors without exposing internal details', () => {
    expect(getAuthErrorMessage(new Error('internal database details'), 'register')).toBe('注册暂时失败，请稍后重试。');
  });
});

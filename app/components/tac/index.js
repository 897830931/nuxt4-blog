import {CaptchaConfig, TianAiCaptcha} from "./captcha/captcha";

if(typeof window !== 'undefined'){
  window.TAC = TianAiCaptcha;
  window.CaptchaConfig = CaptchaConfig;
}

/**
 * 弹出验证码（使用场景：1、登录滑块验证 2、中台反爬验证 ）
 * @param {string} genCaptchaApi 生成接口api
 * @param {string} verifyCaptchaApi 验证接口api
 * @param {object} verifyOtherParams 验证接口额外参数
 * @param {function} successCb 验证成功回调
 */
export function checkCaptcha({ genCaptchaApi = '/api/auth/genCaptcha', verifyCaptchaApi = '/api/auth/checkCaptcha', verifyOtherParams, successCb } = {}) {
  const dom = document.getElementById('captcha-box');
  if (!dom) {
    const div = document.createElement('div');
    div.setAttribute('id', 'captcha-box');
    div.style.zIndex = '2003';
    document.body.appendChild(div);
    // config对象为TAC验证码的一些配置和验证的回调
    const config = {
      // 生成接口 (必选项,必须配置,要符合tianai-captcha默认验证码生成接口规范)
      requestCaptchaDataUrl: genCaptchaApi,
      // 验证接口 (必选项,必须配置,要符合tianai-captcha默认验证码校验接口规范)
      validCaptchaUrl: verifyCaptchaApi,
      // 验证码绑定的div块 (必选项,必须配置)
      bindEl: '#captcha-box',
      // 验证接口额外参数
      verifyOtherParams: verifyOtherParams,
      // 验证成功回调函数(必选项,必须配置)
      validSuccess: (res, c, tac) => {
        console.log('验证成功，后端返回的数据为', res);
        tac.destroyWindow();
        document.body.removeChild(div);
        successCb && successCb(res.data || '');
      },
      // 验证失败的回调函数(可忽略，如果不自定义 validFail 方法时，会使用默认的)
      validFail: (res, c, tac) => {
        tac.reloadCaptcha();
      },
      // 刷新按钮回调事件
      btnRefreshFun: (el, tac) => {
        tac.reloadCaptcha();
      },
      // 关闭按钮回调事件
      btnCloseFun: (el, tac) => {
        tac.destroyWindow();
        document.body.removeChild(div);
      },
    };
    // 一些样式配置，可不传
    let style = {
      logoUrl: null, // 去除logo
    };
    // 参数1 为 tac验证码相关配置
    // 参数2 为 tac窗口一些样式配置
    const captcha = new TAC(config, style);
    captcha.init();
  }
}

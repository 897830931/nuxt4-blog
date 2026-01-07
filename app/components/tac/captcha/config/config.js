import {Dom,http} from "../common/common";
class CaptchaConfig {
    constructor(args) {
        if (!args.bindEl) {
            throw new Error("[TAC] 必须配置 [bindEl]用于将验证码绑定到该元素上");
        }
        if (!args.requestCaptchaDataUrl) {
            throw new Error("[TAC] 必须配置 [requestCaptchaDataUrl]请求验证码接口");
        }
        if (!args.validCaptchaUrl) {
            throw new Error("[TAC] 必须配置 [validCaptchaUrl]验证验证码接口");
        }
        this.bindEl = args.bindEl;
        this.domBindEl = Dom(args.bindEl);
        this.requestCaptchaDataUrl = args.requestCaptchaDataUrl;
        this.validCaptchaUrl = args.validCaptchaUrl;
        if (args.validSuccess) {
            this.validSuccess = args.validSuccess;
        }
        if (args.validFail) {
            this.validFail = args.validFail;
        }
        if (args.requestHeaders) {
            this.requestHeaders = args.requestHeaders
        }else {
            this.requestHeaders = {}
        }
        if (args.btnCloseFun) {
            this.btnCloseFun = args.btnCloseFun;
        }
        if (args.btnRefreshFun) {
            this.btnRefreshFun = args.btnRefreshFun;
        }
        if (args.verifyOtherParams) {
            this.verifyOtherParams = args.verifyOtherParams;
        }
        this.requestChain = [];
        // 时间戳转换
        this.timeToTimestamp = args.timeToTimestamp || true;
        this.insertRequestChain(0, {
            preRequest(type, param, c, tac) {
                if (this.timeToTimestamp && param.data) {
                    for (let key in param.data){
                        // 将date全部转换为时间戳
                        if (param.data[key] instanceof Date) {
                            param.data[key] = param.data[key].getTime();
                        }
                    }
                }
                return true;
            }
        })
    }
    addRequestChain(fun) {
        this.requestChain.push(fun);
    }
    insertRequestChain(index,chain) {
        this.requestChain.splice(index, 0, chain);
    }
    removeRequestChain(index) {
        this.requestChain.splice(index, 1);
    }
    requestCaptchaData() {
        const requestParam = {}
        requestParam.headers = this.requestHeaders || {};
        requestParam.data = {};
        // 设置默认值
        requestParam.headers["Content-Type"] = "application/json;charset=UTF-8";
        requestParam.method="POST";
        requestParam.url = this.requestCaptchaDataUrl;
        // 请求前装载参数
        this._preRequest("requestCaptchaData", requestParam);
        // 发送请求
        const request = this.doSendRequest(requestParam);
        // 返回结果
        return request.then(res => {
            // 装返回结果
            this._postRequest("requestCaptchaData", requestParam, res);
            // 返回结果
            return res;
        });
    }

    doSendRequest(requestParam) {
        // 如果content-type是json，那么data就是json字符串, 这里直接匹配所有header是否包含application/json
        if (requestParam.headers ) {
            for (const key in requestParam.headers){
                if(requestParam.headers[key].indexOf("application/json") > -1) {
                    if (typeof requestParam.data !== "string") {
                        requestParam.data = JSON.stringify(requestParam.data);
                    }
                    break;
                }
            }
        }
        return http(requestParam).then(res => {
            try {
                return JSON.parse(res);
            }catch (e) {
                return res;
            }
        })
    }

    _preRequest(type, requestParam, c, tac) {
        for (let i = 0; i < this.requestChain.length; i++) {
            const r = this.requestChain[i];
            if (r.preRequest) {
                if (!r.preRequest(type, requestParam, this, c, tac)) {
                    break;
                }
            }
        }

    }

    _postRequest(type, requestParam, res, c, tac) {
        for (let i = 0; i < this.requestChain.length; i++) {
            const r = this.requestChain[i];
            // 判断r是否存圩postRequest方法
            if (r.postRequest) {
                if (!r.postRequest(type, requestParam, res, this, c, tac)) {
                    break;
                }
            }
        }
    }

    validCaptcha(currentCaptchaId, data, c, tac) {
        const sendParam = {
            id: currentCaptchaId,
            data: data,
            ...this.verifyOtherParams,
        };
        let requestParam = {};
        requestParam.headers = this.requestHeaders || {};
        requestParam.data = sendParam;
        requestParam.headers["Content-Type"] = "application/json;charset=UTF-8";
        requestParam.method="POST";
        requestParam.url = this.validCaptchaUrl;

        this._preRequest("validCaptcha", requestParam, c, tac);
        const request = this.doSendRequest(requestParam);
        return request.then(res => {
            this._postRequest("validCaptcha", requestParam, res, c, tac);
            return res;
        }).then(res => {
            if (res.code == 1) {
                const useTimes = (data.stopTime - data.startTime) / 1000;
                c.showTips(`验证成功,耗时${useTimes}秒`, 1, () => this.validSuccess(res, c, tac));
            } else {
                let tipMsg = "验证失败，请重新尝试!";
                // if (res.code) {
                //     if (res.code != 4001) {
                //         tipMsg = "验证码被黑洞吸走了！";
                //     }
                // }
                c.showTips(tipMsg, 0, () => this.validFail(res, c, tac));
            }
        }).catch(e => {
            let tipMsg = c.styleConfig.i18n.tips_error;
            if (e.code && e.code != 200) {
                if (res.code != 4001) {
                    tipMsg = c.styleConfig.i18n.tips_4001;
                }
                c.showTips(tipMsg, 0, () => this.validFail(res, c, tac));
            }
        })

    }

    validSuccess(res, c, tac) {
        console.log("验证码校验成功， 请重写  [config.validSuccess] 方法， 用于自定义逻辑处理")
        window.currentCaptchaRes = res;
        tac.destroyWindow();
    }

    validFail(res, c, tac) {
        tac.reloadCaptcha();
    }
}

function wrapConfig(config) {
    if (config instanceof CaptchaConfig) {
        return config;
    }
    return new CaptchaConfig(config);
}

function wrapStyle(style) {
    if (!style) {
        style = {}
    }

    if (!style.btnUrl) {
        // 设置默认图片
        style.btnUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIwAAABkCAYAAABU19jRAAAFOElEQVR4nO3db0hddRzH8Y/3qrFlscLWNo1g2lzpcjSoNooi6FnatkpYFBYxKgpiDyMCH0UPgtHTHkTQ6IFEq6Q/EATFYjT6AyFui7Et0TYm2kydeufV+HS65LznnnO+3p17f7/6vGBsqPeec89975zf+Z2j1rS/t4R/PAqgHyLFegZ78Qk/WgimC8Cn2lASoRvAFxkAexSLJMBGahnMR9paktDTDCanrSUJvZPRlhKDnIIREwUjJgpGTBSMmCgYMVEwYqJgxETBiImCERMFIyYKRkwUjJgoGDFRMGKiYMREwYiJghETBSMmCkZMFIyYKBgxUTBiomDERMGIiYIREwUjJrXaXOnZcC3QtRlYWxcsYuwS8MEJv1+TgklJQ10Qyyt3/fv8o9PAwhLQf9Lf16VDUoqWx0JNDcBzHUBPm7+vScFUmO/RKJiU5BaBgz+GP7fP0SiYlOTywJdngbd+CH9+X6NRMCniIPebEeCN78OX4WM0CiZlZyaBo+fio3l8ix+vR8FUAKM5dh5481j4shjN/m3Anlb3X4uCqZBTF4Hvfo8e07zQ6f6eRhN3FcQ9TX4RyNYAB3YUL7ewp6EPf3XzNWgPU2HDU8HZ09s/hS+3EI2rA2EFUwU8exo4HR2Nq2dPCqZKzs/4Gc1/Kpj6rAMrYcBoPj/j14xwdv3uvtf5twPrsmp3bwD6dgEPNAdvwlwemM/HP9tNa4I3o6MRGJkGZheSrUHrOuDl7cDYLDB9GVhYXP26T+WA8Vng3Aywa1Px56+vD5Z3TRb4+cLql3OV5L0PZudG4PlO4N6NQMs64LHbgPVrgF/GgEsRATCU1+4BHtkM3NcUfO3FeWBiLn55z3YA3S3AE1uA4xPBm11ONJO54M/ZSeD+5uLPM5qTfwDjc0FcVZT3+pDEPQTnLriHWa6rBdh/Z+nH8V4VPpb/cwte2g48fGv08niI2Hf7lV938EFgW2P5r4Wn3EdGS88IP9MOPHRL+cspl9fBZDPAjpvDP3ddXenH7dwEvNhZ/PFMTfTydreGv2n7tsataTI85R6P2MO5MEbzOph8xGHgQsSum6e1fHNWqo3ZGh+fCq4LrXTouH3dw/DSQHND6c9Pzl+d5ZTD62B43P/sdPHHOUt6aKj044bGgXcHr4yG/x7+M3p5DG10KhjsFvAwwucrFy8J8PAaNgNMPJNyYfbX60sDvOeE12YWl4DGtcGUO990xjAWMzjkxp+YBZ66A8gvAe8PAd+OxC+z7yhwIAe03QDMXAZePRKsRzk4AOfpc1OJvQvnajg7zDOyauMvCeWOrr76q/L/lCQWTvBxusAB+gVb1eRZLH/T1eoqiYuFYxYehlyKBQqmOuJi4bjs6+FgkO0aBVNhcbFw4o6n7mGn/S7QGKaCeOqcJBbO+rpKwVQIJ+V4Y1SpWHi/L+/7dTkW6JBUGdyzRMXCMQvv93U9FiiY9MXFwrMhDnBdHbOspGBS9ORWoLc9fgbXxbOhUhRMSngLBe/N8WlSLgkNelPUdmP4c/saCxRMevjTG8KuYnPMwvt4fYwFCiY9vILN+2eWf1cAz4a++s2vMctKGsOkiD/PjmMY3rfDWzAYiws3QZVDtzeIhW5vEBsFIyYKRkwUjJgoGDFRMGKiYMREwYiJghETBSMmCkZMFIyYKBgxUTBiomDERMGIiYIREwUjJgpGTBSMmCgYMVEwYqJgxETBiImCERMFIyYZfZusGNQzmL3aYpLQXgZzGEC3tpjE6B7sxeHCj/sY4O+PAtCvrSYhegZ7MQAAfwF9WW3J22svIgAAAABJRU5ErkJggg==";
    }
    if (!style.moveTrackMaskBgColor && !style.moveTrackMaskBorderColor) {
        style.moveTrackMaskBgColor = "#89d2ff";
        style.moveTrackMaskBorderColor = "#0298f8";

    }
    return style;
}

const captchaRequestChains = {}


export {CaptchaConfig, wrapConfig, wrapStyle}

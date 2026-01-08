import { request } from '@/utils/request'

// 阿里云获取地图json
export const getDicApiGeoByAreaCode = async (params: any) => {
    let allString = params.id + '_full'
    // 区级别的路径要改为没有full，判断条件是最后一位数是否不为0
    if (String(params.id).slice(-1) != 0) {
        allString = params.id
    }
    return request(`/pc/mapJson`,'get', params,{
           headers: {
            Referer: 'https://geo.datav.aliyun.com/',
          },
        }
       
    )
}

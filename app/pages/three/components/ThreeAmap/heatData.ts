const heatData = {
    max: 100,
    data: [],
}

// 生成 1000 个随机数据点
for (let i = 0; i < 20; i++) {
    heatData.data.push({
        lng: 117.0 + Math.random(), // 经度在 116 到 117 之间
        lat: 37.0 + Math.random(), // 纬度在 36 到 37 之间
        value: Math.floor(Math.random() * 100),
    })
}

export default heatData

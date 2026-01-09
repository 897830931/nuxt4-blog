// proxy-selector.ts
import { createInterface } from 'readline'

const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
})

const options = [
    { name: '本地后端', value: 'http://localhost:7002' },
    { name: '测试服务器', value: 'http://39.106.64.68:7002' },
    { name: '正式服务器', value: 'https://api.prod.com' },
]

export async function selectProxyTarget(): Promise<string> {
    return new Promise((resolve) => {
        console.log('\n? 请选择 API 代理目标：\n')

        options.forEach((opt, i) => {
            console.log(`  ${i + 1}. ${opt.name} (${opt.value})`)
        })

        rl.question('\n  请输入编号 (1-3) 或直接回车使用默认: ', (answer) => {
            const num = parseInt(answer.trim()) || 1
            const selected = options[num - 1] || options[0]
            console.log(`\nProxy → ${selected.value} (${selected.name})\n`)
            rl.close()
            resolve(selected.value)
        })
    })
}

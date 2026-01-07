export {}

declare global {
    interface ArticleInfo {
        id: number
        title: string
        cover?: string
        category: string
        content: string
        time: string
        viewCount: number
    }
}

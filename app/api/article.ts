// api/article.ts
import { request, $request } from '@/utils/request'
type ApiResp<T> = { code: number; data: T; message?: string }
type Page<T> = { list: T[]; total?: number }
type Article = { id: number; title: string }
const LIST = '/pc/article/list'
type ArticleDetail = Article & ArticleInfo

const DETAIL = '/pc/article/detail'

export async function getArticlesList(params: any) {
    return request(LIST, "POST", params);
}
export async function $getArticlesList(params: any) {
    return $request(LIST, "POST", params);
}